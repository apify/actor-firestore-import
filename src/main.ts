import { Actor } from 'apify';
import { FirestoreImportInput } from './types.js';
import { parseInput } from './utils.js';

await Actor.init();

const input = await Actor.getInput<FirestoreImportInput>();
const options = await parseInput(input);

console.log('Hello from the Firestore import Actor!');

await Actor.exit();
