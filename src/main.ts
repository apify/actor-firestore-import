import { Actor } from 'apify';

await Actor.init();

console.log('Hello from the Firestore import Actor!');

await Actor.exit();
