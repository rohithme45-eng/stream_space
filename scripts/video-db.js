import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

export const bc = new BroadcastChannel('streamspace_channel');

let initialized = false;
onSnapshot(collection(db, 'videos'), () => {
  if (initialized) {
    bc.postMessage('update');
  }
  initialized = true;
});

export async function saveVideo(blob, name = 'video') {
  const fileId = Date.now().toString() + Math.random().toString(36).substring(2);
  const storageRef = ref(storage, 'videos/' + fileId);
  
  await uploadBytesResumable(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  
  await addDoc(collection(db, 'videos'), {
    name,
    url,
    storagePath: 'videos/' + fileId,
    size: blob.size,
    type: blob.type || 'video/webm',
    createdAt: Date.now(),
    views: 0,
    downloads: 0
  });
}

export async function updateVideo(id, blob, name, views = 0, downloads = 0, createdAt = null) {
  const fileId = Date.now().toString() + Math.random().toString(36).substring(2);
  const storageRef = ref(storage, 'videos/' + fileId);
  
  await uploadBytesResumable(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  
  const oldDoc = await getDoc(doc(db, 'videos', id));
  if (oldDoc.exists() && oldDoc.data().storagePath) {
    try {
       await deleteObject(ref(storage, oldDoc.data().storagePath));
    } catch(e) {
       console.warn('Failed to delete old video file:', e);
    }
  }

  await updateDoc(doc(db, 'videos', id), {
    name,
    url,
    storagePath: 'videos/' + fileId,
    size: blob.size,
    type: blob.type || 'video/webm',
    createdAt: createdAt || Date.now(),
    views,
    downloads
  });
}

export async function getAllVideos() {
  const snap = await getDocs(collection(db, 'videos'));
  return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function getVideo(id) {
  const d = await getDoc(doc(db, 'videos', id));
  if (!d.exists()) return null;
  return {id: d.id, ...d.data()};
}

export async function deleteVideo(id) {
  const d = await getDoc(doc(db, 'videos', id));
  if (d.exists() && d.data().storagePath) {
    try {
      await deleteObject(ref(storage, d.data().storagePath));
    } catch(e) {
      console.warn('Failed to delete video file:', e);
    }
  }
  await deleteDoc(doc(db, 'videos', id));
}

export async function incrementStat(id, statName) {
  await updateDoc(doc(db, 'videos', id), {
    [statName]: increment(1)
  });
}
