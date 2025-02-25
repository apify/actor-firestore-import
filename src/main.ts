import { Actor, log } from 'apify';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DOCUMENT_CONFLICT_RESOLUTION, FirestoreImportInput } from './types.js';
import { parseInput, transformDatasetItem } from './utils.js';
import { IMPORT_BATCH_SIZE } from './consts.js';

await Actor.init();

// Read, parse and validate input
const input = await Actor.getInput<FirestoreImportInput>();
const options = await parseInput(input);

// Initialize Firebase app using service account key
initializeApp({
    credential: cert(options.serviceAccount),
});

// Open dataset and get its info
const dataset = await Actor.openDataset(options.datasetId);
const datasetInfo = await dataset.getInfo();

if (!datasetInfo) {
    log.error('Dataset not found.');
    throw new Error('Dataset not found.');
} else if (!datasetInfo.itemCount) {
    log.info('No items to import.');
    await Actor.exit();
    process.exit(0);
}

const datasetSize = datasetInfo.itemCount;
const db = getFirestore();

for (let offset = 0; offset < datasetSize; offset += IMPORT_BATCH_SIZE) {
    const content = await dataset.getData({
        offset,
        limit: IMPORT_BATCH_SIZE,
    });

    if (!content || !content.count) {
        break;
    }

    const { items } = content;
    const batch = db.batch();

    for (const item of items) {
        const documents = await transformDatasetItem(item, options.transformFunction);
        for (const doc of documents) {
            const { data } = doc;
            const collection = doc.collection || options.collection;
            const documentId = doc.id || (options.idField ? data[options.idField] : undefined);
            const documentConflictResolution = doc.documentConflictResolution || options.documentConflictResolution;

            const collectionRef = db.collection(collection);
            let docRef: FirebaseFirestore.DocumentReference;

            if (documentId && (typeof documentId === 'string' || typeof documentId === 'number')) {
                docRef = collectionRef.doc(documentId.toString());
            } else {
                docRef = collectionRef.doc();
            }

            if (documentConflictResolution === DOCUMENT_CONFLICT_RESOLUTION.skip) {
                const docExists = await docRef.get();
                if (docExists.exists) {
                    log.info(`Document with id ${docRef.id} already exists. Skipping.`);
                } else {
                    batch.set(docRef, data);
                }
            } else if (documentConflictResolution === DOCUMENT_CONFLICT_RESOLUTION.merge) {
                batch.set(docRef, data, { merge: true });
            } else {
                batch.set(docRef, data, { merge: false });
            }
        }
    }

    await batch.commit();
}

// TODO - collect and return stats
// TODO - handle errors

console.log('Hello from the Firestore import Actor!');

await Actor.exit();
