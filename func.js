import { FieldValue } from '@google-cloud/firestore/build/src/index.js';

export const fun = (data) => {
    return {
        id: data.id,
        data: {
            ...data,
            ids: FieldValue.arrayUnion([data.id]),
            processed: true,
        },
    };
};
