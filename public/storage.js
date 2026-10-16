const DATABASE = 'unlater-local-v1';
let db;
export async function connect() {
  db = await new Promise((resolve,reject) => {
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function read() {
  return new Promise((resolve,reject)=>{
    const req=db.transaction('state').objectStore('state').get('main');
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
export async function write(value) {
  const snapshot=structuredClone(value);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readwrite');
    tx.objectStore('state').put(snapshot,'main');
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error);
  });
}
