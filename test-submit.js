import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const configPath = './firebase-applet-config.json';
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testSubmit() {
  const reservationId = Date.now().toString();
  const newReservation = {
    id: reservationId,
    name: "John Doe",
    phone: "1234567890",
    guests: "2",
    datetime: new Date().toISOString(),
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'reservations', reservationId), newReservation);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

testSubmit().then(() => process.exit(0));
