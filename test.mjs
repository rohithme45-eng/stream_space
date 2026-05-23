import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQaeuXdruh0A3smnwJAPYx3dRfO7OKdIo",
  authDomain: "streamspace-9076b.firebaseapp.com",
  projectId: "streamspace-9076b",
  storageBucket: "streamspace-9076b.firebasestorage.app",
  messagingSenderId: "23968527444",
  appId: "1:23968527444:web:5a6e60a44b4ccf001f29c1",
  measurementId: "G-B7SERY3YHR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const snap = await getDocs(collection(db, "videos"));
    console.log("Documents in Firestore:", snap.docs.length);
    snap.docs.forEach(d => console.log(d.id, d.data()));
  } catch(e) {
    console.error("Failed to read from Firestore:", e.message);
  }
}

test();
