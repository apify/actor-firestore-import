import { FieldValue, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';

/**
 * Dependencies that are accessible in the transform function.
 */
export const TRANSFORM_FUNCTION_DEPENDENCIES = {
    FieldValue,
    Timestamp,
    GeoPoint,
    DocumentReference,
};
