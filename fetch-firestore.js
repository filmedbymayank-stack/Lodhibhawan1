import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testFetch() {
  try {
    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    console.log("Documents found:", snapshot.docs.length);
    snapshot.docs.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
testFetch();
