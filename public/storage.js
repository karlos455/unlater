import { freshState, validateState } from './core.js';

const DATABASE = 'unlater-local-v1';
const API = '/api/state';
let db;
let status = 'A ligar ao servidor…';
let queue = Promise.resolve();

export async function connect() {
  db = await new Promise((resolve,reject) => {
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function serialized(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

function localGet(key) {
  return new Promise((resolve,reject)=>{
    const req=db.transaction('state').objectStore('state').get(key);
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}

function localPut(key, value) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readwrite');
    tx.objectStore('state').put(structuredClone(value),key);
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error);
  });
}

async function requestState() {
  const response=await fetch(API,{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error(`Sincronização indisponível (${response.status}).`);
  return response.json();
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function mergeLegacy(remote, local) {
  const merged=structuredClone(remote||freshState());
  for(const key of ['activities','history']){
    const records=new Map(merged[key].map(item=>[item.id,item]));
    for(const item of local?.[key]||[])records.set(item.id,structuredClone(item));
    merged[key]=[...records.values()].sort((a,b)=>Date.parse(b.createdAt||b.at)-Date.parse(a.createdAt||a.at));
  }
  merged.mission=merged.mission||structuredClone(local?.mission||null);
  merged.onboarding=!!(merged.onboarding||local?.onboarding);
  merged.history=merged.history.filter(item=>merged.activities.some(activity=>activity.id===item.activityId));
  return validateState(merged);
}

function applyLocalChanges(remote, base, local) {
  if(!base)return mergeLegacy(remote,local);
  const merged=structuredClone(remote||freshState());
  for(const key of ['activities','history']){
    const baseById=new Map(base[key].map(item=>[item.id,item]));
    const localById=new Map((local?.[key]||[]).map(item=>[item.id,item]));
    const remoteById=new Map(merged[key].map(item=>[item.id,item]));
    for(const id of new Set([...baseById.keys(),...localById.keys()])){
      const previous=baseById.get(id), current=localById.get(id);
      if(same(previous,current))continue;
      if(current===undefined)remoteById.delete(id);
      else remoteById.set(id,structuredClone(current));
    }
    merged[key]=[...remoteById.values()].sort((a,b)=>Date.parse(b.createdAt||b.at)-Date.parse(a.createdAt||a.at));
  }
  if(!same(base.mission,local?.mission))merged.mission=structuredClone(local?.mission||null);
  if(!same(base.onboarding,local?.onboarding))merged.onboarding=!!local?.onboarding;
  merged.history=merged.history.filter(item=>merged.activities.some(activity=>activity.id===item.activityId));
  return validateState(merged);
}

async function saveRemote(candidate, remote, base, local) {
  for(let attempt=0;attempt<6;attempt++){
    const response=await fetch(API,{method:'PUT',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:remote.revision,state:candidate})});
    const result=await response.json().catch(()=>({}));
    if(response.status===409){remote=result;candidate=applyLocalChanges(remote.state,base,local);continue;}
    if(!response.ok)throw Error(result.error||`Sincronização indisponível (${response.status}).`);
    await localPut('main',result.state);
    await localPut('sync-base',result.state);
    await localPut('sync-revision',result.revision);
    status='Sincronizado entre dispositivos';
    return result.state;
  }
  throw Error('Houve várias alterações simultâneas. A sincronização será repetida.');
}

async function reconcile(local) {
  const base=await localGet('sync-base');
  const remote=await requestState();
  let candidate;
  if(remote.state==null)candidate=validateState(local||freshState());
  else if(base)candidate=applyLocalChanges(remote.state,base,local||remote.state);
  else candidate=mergeLegacy(remote.state,local||freshState());
  if(remote.state&&same(candidate,remote.state)){
    await localPut('main',remote.state);
    await localPut('sync-base',remote.state);
    await localPut('sync-revision',remote.revision);
    status='Sincronizado entre dispositivos';
    return remote.state;
  }
  return saveRemote(candidate,remote,base,local||candidate);
}

export async function read() {
  return serialized(async()=>{
    const local=await localGet('main');
    try{return await reconcile(local||null);}
    catch(error){status='Sem ligação — alterações ficam neste dispositivo';return local||freshState();}
  });
}

export async function write(value) {
  const snapshot=validateState(value);
  return serialized(async()=>{
    await localPut('main',snapshot);
    try{return await reconcile(snapshot);}
    catch(error){status='Sem ligação — alterações ficam neste dispositivo';return snapshot;}
  });
}

export async function sync() {
  return serialized(async()=>{
    const local=await localGet('main');
    try{return await reconcile(local||freshState());}
    catch(error){status='Sem ligação — alterações ficam neste dispositivo';return local||freshState();}
  });
}

export function getStatus() { return status; }
