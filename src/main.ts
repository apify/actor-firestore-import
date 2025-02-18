import { Actor } from 'apify';
import { FirestoreImportInput } from './types.js';
import { parseInput } from './utils.js';

await Actor.init();

const input = await Actor.getInput<FirestoreImportInput>();
const options = await parseInput(input);

// TODO - connection to Firestore

// TODO - import documents in loop with transform function

// TODO - handle document conflict resolution

// TODO - handle errors

console.log('Hello from the Firestore import Actor!');

await Actor.exit();
