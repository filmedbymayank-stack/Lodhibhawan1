import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testSnapshot() {
  const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log("Snapshot received! Docs count:", snapshot.docs.length);
    snapshot.docs.forEach(doc => {
      console.log(doc.id, doc.data().name);
    });
    unsubscribe();
    process.exit(0);
  }, (error) => {
    console.error("Snapshot error:", error);
    process.exit(1);
  });
}
testSnapshot();
