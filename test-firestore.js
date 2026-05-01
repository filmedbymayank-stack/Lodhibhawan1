import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  const reservationId = Date.now().toString();
  const newReservation = {
    id: reservationId,
    name: "Test Name",
    phone: "1234567890",
    guests: "2",
    datetime: "2024-05-18T19:30",
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'reservations', reservationId), newReservation);
    console.log("Success");
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
test();
