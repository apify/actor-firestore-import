export const DOCUMENT_CONFLICT_RESOLUTION = {
    overwrite: 'overwrite',
    merge: 'merge',
    skip: 'skip',
} as const;

export type FirestoreImportInput = {
    serviceAccountKey: string;
    datasetId: string;
    collection: string;
    documentConflictResolution: keyof typeof DOCUMENT_CONFLICT_RESOLUTION;
    idField?: string;
    transformFunction?: string;
};

export type FirestoreImportOptions = Omit<FirestoreImportInput, 'transformFunction'> & {
    transformFunction: TransformFunction | null;
}

export type TransformFunctionResult = {
    data: object;
    id: string | undefined | null;
    collection: string | undefined | null;
    documentConflictResolution: keyof typeof DOCUMENT_CONFLICT_RESOLUTION | undefined | null;
}

export type TransformFunction = (doc: object) => TransformFunctionResult | TransformFunctionResult[];
