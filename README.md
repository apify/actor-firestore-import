## Firestore import integration Actor

TODO: write proper description

# Firebase Firestore Integration Specification

As stated here https://github.com/apify/apify-core/issues/19078 this should go beyond the features of [drobnikj/firestore-import](https://console.apify.com/actors/tHbtPTjFCTukBZvcH/information/latest/readme) and [danielwebr/firebase-firestore-import](https://console.apify.com/actors/kRu4T4OEFQmTRRTJ0/information/latest/readme)

It would be Actor to Actor Integration, that on would accept on input:
- **Service Account Key** (`serviceAccountKey`) - `{"type": "string", "isSecret": true}` - accepts Service Account Key in JSON format generated from Firebase Console *Project Settings* -> *Service Accounts* -> *Generate new private key*
- **Dataset** (`datasetId`) - `{"type": "string", "resourceType": "dataset"}` - id of dataset to import data from
- **Collection** (`collection`) - `{"type": "string"}` - collection name in Firestore to import data to
- **Custom Field ID** (`customFieldId`, `optional`) - `{"type": "string"}` - field name from dataset that should be used as Firestore document ID. Must be string and should be unique. If not provided Firestore will generate one automatically.
- **Document Conflict Resolution** (`documentConflictResolution`, `default: "overwrite"`) - {"type": "string", "enum": ["overwrite", "merge", "skip"] - controlling behavior when a document already exists in Firestore. Only useful when `customFieldId` is provided.
- **Transform function** (`transformFunction`, `optional`) - `{"type": "string", "editor": "javascript"}` - custom transform function which accept one dataset item as parameter and returns data to insert/update to document in Firestore with more features:
    - Dot notation to update nested objects
    - Add elements to array `arrayUnion`
    - increment numeric value - `FieldValue.increment`
    - data types
    - subcollections

It should support all these types of transform functions:
1. Simple
```
(data) => {
  data.newField = data.oldField + 1;
  delete data.unused
  return data;
}
```
2. Nested objects
```
(data) => {
  return {
    title: data.title,
    "subdocument.field": data.name,  // update single field of subdocument
    author: data.author              // overwrite whole subdocument
  };
}
```
3. Field value functions
```
(data) => {
  return {
    ids: FieldValue.arrayUnion(data.ids),         // add new ids to existing ids array
    values: FieldValue.arrayRemove(data.values),  // remove new values from existing array
    count: FieldValue.increment(data.count),      // increment existing count field by provided value
    old: FieldValue.delete(),                     // removes field (same as unset in mongo
    vector: FieldValue.VectorValue(data.values),  // create vector from array of numbers
  };
}
```
4. Data types
```
(data) => {
  return {
    updatedAt: Timestamp.fromDate(Date.parse(data.date)),          // create Timestamp data type
    vector: FieldValue.VectorValue(data.values),                   // create vector data type
    position: GeoPoint(data.lat, dat.lon),                         // create geopoint data type
    reference: DocumentReference("collection", "referenceDocId"),  // create reference type
  };
}
```
5. Subcollection

```
(data) => {
  // if transform return array, first item is object to insert, second is object with field
  // `subcollections` that contains `name` of collection and `documents` to insert/update
  return [
    {
      title: item.title,
      description: item.description,
      "size.weight": item.size.weight,
      "size.length": item.size.length,
    },
    {
      subcollections: [
        {
          name: "items",
          documentConflictResolution: "merge",
          documents: item.items.map((subItem) => ({
            id: subItem.id || null, // Optional custom ID
            data: { // document
              name: subItem.name,
            },
          })),
        },
      ],
    },
  ]
};
```

I'm not sure with the proposed solution yet, but I want to have options to:
- return just one object what would be considered as single document
- return something else (so because of that the array) that would have strictly defined structure to find main document and subcollections

Or maybe better would be to return array of documents where each one defines path (`collection/id/subcollection`) where to insert, so one dataset item can lead to multiple Firestore inserts/updates. But this wouldn't work with auto generated id of the root document.
