export const DB_NAME = 'video-uploader-db';
export const DB_VERSION = 1;
export const STORE_NAME = 'videos';

export const bc = new BroadcastChannel('streamspace_channel');

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        const store = db.createObjectStore(STORE_NAME, {keyPath:'id', autoIncrement:true});
        store.createIndex('createdAt','createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideo(blob, name = 'video'){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      name,
      blob,
      size: blob.size,
      type: blob.type || 'video/webm',
      createdAt: Date.now(),
      views: 0,
      downloads: 0
    };
    const req = store.add(item);
    req.onsuccess = () => {
      bc.postMessage('update');
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateVideo(id, blob, name, views = 0, downloads = 0, createdAt = null){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      id,
      name,
      blob,
      size: blob.size,
      type: blob.type || 'video/webm',
      createdAt: createdAt || Date.now(),
      views: views,
      downloads: downloads
    };
    const req = store.put(item);
    req.onsuccess = () => {
      bc.postMessage('update');
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllVideos(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getVideo(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideo(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      bc.postMessage('update');
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function incrementStat(id, statName){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if(item){
        item[statName] = (item[statName] || 0) + 1;
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          bc.postMessage('update');
          resolve(item);
        };
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
