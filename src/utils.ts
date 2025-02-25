// noinspection ExceptionCaughtLocallyJS

import { Actor } from 'apify';
import {
    DOCUMENT_CONFLICT_RESOLUTION,
    FirestoreImportInput,
    FirestoreImportOptions,
    TransformFunction, TransformFunctionResult,
} from './types.js';
import { TRANSFORM_FUNCTION_DEPENDENCIES } from './dependencies.js';

/**
 * Parse input and validate it
 */
export async function parseInput(input: FirestoreImportInput | null): Promise<FirestoreImportOptions> {
    try {
        // Validate input fields
        if (!input) throw new Error('Input is required');
        if (!input.serviceAccountKey) throw new Error('Input must contain serviceAccountKey');
        if (!input.datasetId) throw new Error('Input must contain datasetId');
        if (!input.collection) throw new Error('Input must contain collection');
        if (!input.documentConflictResolution) throw new Error('Input must contain documentConflictResolution');
        if (DOCUMENT_CONFLICT_RESOLUTION[input.documentConflictResolution] === undefined) {
            throw new Error('Invalid documentConflictResolution');
        }

        // Parse service account key and transform function
        const serviceAccount = JSON.parse(input.serviceAccountKey);
        const transformFunction = await parseTransformFunction(input.transformFunction);

        return {
            serviceAccount,
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
 * Parse transform function string to callable function with provided dependencies
 */
async function parseTransformFunction(transformFunction: string | undefined): Promise<TransformFunction | null> {
    if (!transformFunction) return null;
    const paramNames = Object.keys(TRANSFORM_FUNCTION_DEPENDENCIES);
    const paramValues = Object.values(TRANSFORM_FUNCTION_DEPENDENCIES);

    // eslint-disable-next-line no-new-func
    const fn = new Function(...paramNames, `return ${transformFunction}`)(...paramValues);
    if (typeof fn !== 'function') throw new Error('Transform function is not a function');
    return fn as TransformFunction;
}

/**
 * Transform dataset item with provided transform function
 * @param item item from dataset
 * @param transformFunction transform function
 */
export async function transformDatasetItem(item: Record<string, unknown>, transformFunction: TransformFunction | null): Promise<TransformFunctionResult[]> {
    if (!transformFunction) {
        return [{
            data: item,
            id: null,
            collection: null,
            documentConflictResolution: null,
        }];
    }
    const result = await transformFunction(item);
    return Array.isArray(result) ? result : [result];
}
