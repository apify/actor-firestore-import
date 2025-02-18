// noinspection ExceptionCaughtLocallyJS

import { Actor } from 'apify';
import {
    DOCUMENT_CONFLICT_RESOLUTION,
    FirestoreImportInput,
    FirestoreImportOptions,
    TransformFunction,
} from './types.js';

/**
 * Parse input and validate it
 */
export async function parseInput(input: FirestoreImportInput | null): Promise<FirestoreImportOptions> {
    try {
        if (!input) throw new Error('Input is required');
        if (!input.serviceAccountKey) throw new Error('Input must contain serviceAccountKey');
        if (!input.datasetId) throw new Error('Input must contain datasetId');
        if (!input.collection) throw new Error('Input must contain collection');
        if (!input.documentConflictResolution) throw new Error('Input must contain documentConflictResolution');
        if (DOCUMENT_CONFLICT_RESOLUTION[input.documentConflictResolution] === undefined) {
            throw new Error('Invalid documentConflictResolution');
        }

        const transformFunction = await parseTransformFunction(input.transformFunction);

        return {
            serviceAccountKey: input.serviceAccountKey,
            datasetId: input.datasetId,
            collection: input.collection,
            documentConflictResolution: input.documentConflictResolution,
            idField: input.idField,
            transformFunction,
        };
    } catch (e) {
        await Actor.exit((e as Error).message, { exitCode: 1 });
        process.exit(1);
    }
}

/**
 * Parse transform function
 */
async function parseTransformFunction(transformFunction: string | undefined): Promise<TransformFunction | null> {
    if (!transformFunction) return null;
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return ${transformFunction}`)();
    if (typeof fn !== 'function') throw new Error('Transform function is not a function');
    return fn as TransformFunction;
}
