/**
 * How to resolve conflicts when importing documents with existing ids
 */
export const DOCUMENT_CONFLICT_RESOLUTION = {
    /** Overwrite existing documents */
    overwrite: 'overwrite',
    /** Merge new data with existing documents */
    merge: 'merge',
    /** Skip documents with existing ids */
    skip: 'skip',
} as const;

/**
 * Import of the Actor
 */
export type FirestoreImportInput = {
    /** Service account key as JSON string */
    serviceAccountKey: string;
    /** Dataset id */
    datasetId: string;
    /** Collection name in Firestore */
    collection: string;
    /** Name of Firestore database */
    databaseName: string;
    /** Field name in dataset to use as document id. If not provided, Firestore would generate one */
    idField?: string;
    /** How to resolve conflicts when importing documents with existing ids */
    documentConflictResolution: keyof typeof DOCUMENT_CONFLICT_RESOLUTION;
    /** Transform function to modify dataset item before importing */
    transformFunction?: string;
};

/**
 * Options that are parsed form `FirestoreImportInput` and used in the Actor flow
 */
export type FirestoreImportOptions = Omit<FirestoreImportInput, 'serviceAccountKey' | 'transformFunction'> & {
    serviceAccount: object;
    transformFunction: TransformFunction | null;
}

/**
 * Result that should be returned from the transform function
 * Note: transform function can return single result or array of results (see below)
 */
export type TransformFunctionResult = {
    /** Data to import */
    data: Record<string, unknown>;
    /** Document id in Firestore, if not provided `FirestoreImportInput.idField` is used or is auto generated */
    id: string | undefined | null;
    /**
     * Collection name in Firestore, if not provided `FirestoreImportInput.collection` is used
     * Note: this can be path to sub-collection, e.g. `collection/[document-id]/sub-collection`
     * This is very useful if you want to import data to sub-collections and return multiple results from transform function
     * */
    collection: string | undefined | null;
    /** Conflict resolution for this document, if not provided `FirestoreImportInput.documentConflictResolution` is used */
    documentConflictResolution: keyof typeof DOCUMENT_CONFLICT_RESOLUTION | undefined | null;
}

/**
 * Transform function that can be used to modify dataset item before importing
 * @param doc dataset item
 * @returns single or array of results (can be promises)
 */
export type TransformFunction = (doc: object) =>
    Promise<TransformFunctionResult | TransformFunctionResult[]> |
    TransformFunctionResult |
    TransformFunctionResult[];
