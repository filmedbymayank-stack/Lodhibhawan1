import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    console.log("Testing connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Success");
  } catch (err) {
    console.error("Error connecting:", err);
  }
  process.exit(0);
}
run();
