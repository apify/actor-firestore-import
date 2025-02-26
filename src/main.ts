import { Actor, log } from 'apify';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DOCUMENT_CONFLICT_RESOLUTION, FirestoreImportInput } from './types.js';
import { getCleanDocumentId, getDocumentReference, parseInput, transformDatasetItem } from './utils.js';
import {READ_BATCH_SIZE, DEFAULT_WRITE_BATCH_SIZE} from './consts.js';
import { FirestoreImportStatistics } from './stats.js';

await Actor.init();

// Read, parse and validate input
log.info('Parsing input');
const input = await Actor.getInput<FirestoreImportInput>();
const options = await parseInput(input);

// Initialize Firebase app using service account key
log.info('Initializing Firebase app');
initializeApp({
    credential: cert(options.serviceAccount),
});

// Open dataset and get its info
log.info(`Opening dataset (${options.datasetId})`);
const dataset = await Actor.openDataset(options.datasetId, { forceCloud: true });
const datasetInfo = await dataset.getInfo();

// Before loading data, check if dataset exists and has any items
if (!datasetInfo) {
    await Actor.exit(`Dataset ${options.datasetId} not found.`, { exitCode: 1 });
    process.exit(1);
} else if (!datasetInfo.itemCount) {
    log.info('No items to import.');
    await Actor.exit();
    process.exit(0);
}

// Get the right Firestore instance
log.info(`Opening Firestore Database ${options.databaseName}`);
const db = getFirestore(options.databaseName);
const datasetSize = datasetInfo.itemCount;

// Initialize collecting statistics
const stats = FirestoreImportStatistics.init();

// Load data from dataset by `IMPORT_BATCH_SIZE` items
// Each item is transformed (if transform function is provided) which can result in multiple documents to import
// Documents are written to Firestore in batches
log.info(`Importing ${datasetSize} items to Firestore...`);

// Track processed items for progress updates
let processedItems = 0;

let batch = db.batch();
let batchSize = 0;
let statsBatch = stats.openBatch();

const logProgress = () => {
    // Log progress every 10% or when batch is committed
    if (processedItems % Math.ceil(datasetSize / 10) === 0 || batchSize === 0) {
        const progress = ((processedItems / datasetSize) * 100).toFixed(2);
        log.info(`Progress: ${processedItems}/${datasetSize} items imported (${progress}%)`);
    }
}

for (let offset = 0; offset < datasetSize; offset += READ_BATCH_SIZE) {
    // Load data from dataset
    const content = await dataset.getData({
        offset,
        limit: READ_BATCH_SIZE,
    });

    // If there is no content missing, we are done, break the loop
    if (!content || !content.count) {
        break;
    }

    const { items } = content;

    // Iterate over items from dataset page
    for (const item of items) {
        // Transform dataset item to Firestore document(s)
        const documents = await transformDatasetItem(item, options.transformFunction);

        // Iterate over Firestore documents and process them
        // Each document can be written to different collection and have different conflict resolution
        // Depending on the conflict resolution, document is added to batch or written immediately
        for (const doc of documents) {
            const { data } = doc;
            // Get collection, document id and conflict resolution from document with fallback to (global) options
            const collection = doc.collection || options.collection;
            const documentId = getCleanDocumentId(doc.id || (options.idField ? data[options.idField] : undefined));
            // If document id is not provided, use overwrite as conflict resolution, because others don't make sense
            const documentConflictResolution = documentId
                ? (doc.documentConflictResolution || options.documentConflictResolution)
                : DOCUMENT_CONFLICT_RESOLUTION.overwrite;
            const docRef = getDocumentReference(db, collection, documentId);

            if (documentConflictResolution === DOCUMENT_CONFLICT_RESOLUTION.skip) {
                // If the resolution is to skip, we can't write the document using batch because it would
                // fail the whole batch if the document already exists.
                // Loading the document first and writing it only if it doesn't exist would increase number requests.
                try {
                    await docRef.create(data);
                    stats.inc('created');
                } catch (e) {
                    stats.inc('skipped');
                }
            } else {
                // Otherwise for overwrite and merge, we can use batch to write the document
                // and setting the `merge` option to true for merge resolution
                batch.set(
                    docRef,
                    data,
                    { merge: documentConflictResolution === DOCUMENT_CONFLICT_RESOLUTION.merge },
                );
                batchSize++;
                statsBatch.inc(documentConflictResolution === DOCUMENT_CONFLICT_RESOLUTION.merge ? 'merged' : 'overwritten');
            }

            if (batchSize >= DEFAULT_WRITE_BATCH_SIZE) {
                try {
                    await batch.commit();
                    statsBatch.writeBatch();
                } catch (e) {
                    log.error('Failed to import batch');
                    statsBatch.failBatch();
                }
                batch = db.batch();
                batchSize = 0;
                statsBatch = stats.openBatch();
                logProgress();
            }
        }

        processedItems++;
        statsBatch.inc('itemsProcessed');
        logProgress();
    }
}

// Commit the last batch
if (batchSize > 0) {
    try {
        await batch.commit();
        statsBatch.writeBatch();
    } catch (e) {
        log.error('Failed to import batch');
        statsBatch.failBatch();
    }
}

// Log final statistics
const statsResult = stats.getStats();
log.info('Import finished');
log.info(`Total dataset items processed: ${statsResult.itemsProcessed}, (${statsResult.itemsFailed} failed)`);
log.info(`Total Firestore documents processed: ${statsResult.imported}`);
log.info(`Firestore documents created: ${statsResult.created}`);
log.info(`Firestore documents merged: ${statsResult.merged}`);
log.info(`Firestore documents overwritten: ${statsResult.overwritten}`);
log.info(`Firestore documents skipped: ${statsResult.skipped}`);
log.info(`Execution time: ${statsResult.executionTimeMs}ms`);

// Save statistics
await Actor.setValue('Statistics', statsResult);

await Actor.exit();
