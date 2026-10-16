export const categories = {
  casa: { label:'Casa', symbol:'⌂', color:'yellow' },
  jardim: { label:'Jardim', symbol:'♧', color:'green' },
  pessoal: { label:'Pessoal', symbol:'▣', color:'purple' },
  lazer: { label:'Lazer', symbol:'♡', color:'pink' }
};
export const freshState = () => ({ version:1, activities:[], history:[], mission:null, onboarding:false });
export function uuid() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function eligible(activities, minutes, energy, category = 'all') {
  return activities.filter(a => !a.completedAt && a.minutes <= minutes && a.effort <= energy && (category === 'all' || a.category === category));
}
export function choose(activities, minutes, energy, category = 'all', random = Math.random) {
  const pool = eligible(activities, minutes, energy, category);
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : null;
}
export function elapsed(mission, now = Date.now()) {
  return Math.max(0, (mission.elapsedMs || 0) + (mission.runningSince == null ? 0 : Math.max(0, now - mission.runningSince)));
}
export function localDate(date = new Date()) {
  const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function completeSession(state, { done, mood, afterPhoto = '', note = '' }, now = Date.now()) {
  if (!state.mission || state.mission.status !== 'running') throw new Error('Não existe uma sessão ativa.');
  const activity = state.activities.find(a => a.id === state.mission.activityId);
  if (!activity) throw new Error('Atividade não encontrada.');
  const entry = { id:uuid(), activityId:activity.id, title:activity.title, category:activity.category, photo:activity.photo, afterPhoto, note, mood, done, mode:state.mission.mode, elapsedMs:elapsed(state.mission, now), at:new Date(now).toISOString(), localDay:localDate(now), postponedSince:activity.postponedSince };
  if (done) activity.completedAt = entry.at;
  state.history.unshift(entry); state.mission = null;
  return entry;
}
export function validateState(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.activities) || !Array.isArray(value.history) || value.activities.length > 2000 || value.history.length > 20000) throw new Error('Formato de backup inválido.');
  const str = (s,max) => typeof s === 'string' && s.length <= max;
  const date = d => typeof d === 'string' && Number.isFinite(Date.parse(d));
  const photo = p => str(p, 2500000) && (p === '' || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) || ['/assets/creative.png','/assets/wardrobe.png'].includes(p));
  const ids = new Set();
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  for (const a of value.activities) {
    if (!validId(a.id) || ids.has(a.id) || !str(a.title,100) || !a.title.trim() || !str(a.description,2000) || !Object.hasOwn(categories,a.category) || !Number.isInteger(a.minutes) || a.minutes < 1 || a.minutes > 600 || ![1,2,3].includes(a.effort) || !date(a.createdAt) || !(a.postponedSince == null || date(a.postponedSince)) || (a.procrastinated != null && typeof a.procrastinated !== 'boolean') || (a.completedAt && !date(a.completedAt)) || !photo(a.photo) || !Array.isArray(a.steps) || a.steps.length > 12 || !a.steps.every(s=>str(s,160))) throw new Error('O backup contém uma atividade inválida.');
    ids.add(a.id);
  }
  const historyIds = new Set();
  for (const h of value.history) {
    if (!validId(h.id) || historyIds.has(h.id) || !ids.has(h.activityId) || !str(h.title,100) || !Object.hasOwn(categories,h.category) || !date(h.at) || !/^\d{4}-\d{2}-\d{2}$/.test(h.localDay) || !Number.isFinite(h.elapsedMs) || h.elapsedMs < 0 || h.elapsedMs > 31536000000 || ![1,2,3,4].includes(h.mood) || typeof h.done !== 'boolean' || !['full','five'].includes(h.mode) || !photo(h.photo) || !photo(h.afterPhoto || '') || !str(h.note || '',1000) || !(h.postponedSince == null || date(h.postponedSince))) throw new Error('O backup contém um registo inválido.');
    historyIds.add(h.id);
  }
  if (value.mission != null) {
    const m=value.mission; const a=value.activities.find(a=>a.id===m.activityId);
    if (!a || a.completedAt || !['drawn','running'].includes(m.status) || !['full','five'].includes(m.mode) || !Number.isFinite(m.elapsedMs) || m.elapsedMs < 0 || (m.runningSince != null && (!Number.isFinite(m.runningSince) || m.runningSince < 0)) || !Array.isArray(m.checked) || !m.checked.every(i=>Number.isInteger(i) && i>=0 && i<a.steps.length)) throw new Error('O backup contém uma missão inválida.');
  }
  return { version:1, activities:value.activities.map(a=>({...a,procrastinated:a.procrastinated??!!a.postponedSince})), history:value.history, mission:value.mission || null, onboarding:!!value.onboarding };
}
export function achievements(history) {
  const done=history.filter(h=>h.done), unique=new Set(history.map(h=>h.localDay)).size;
  return [
    { name:'Primeiro passo', detail:'Concluir a primeira atividade', icon:'✦', unlocked:done.length>=1, progress:Math.min(done.length,1)+'/1' },
    { name:'Só cinco minutos', detail:'Fazer uma sessão de 5 minutos', icon:'◷', unlocked:history.some(h=>h.mode==='five'), progress:history.some(h=>h.mode==='five')?'1/1':'0/1' },
    { name:'A ganhar balanço', detail:'Concluir cinco atividades', icon:'↗', unlocked:done.length>=5, progress:Math.min(done.length,5)+'/5' },
    { name:'Tempo para mim', detail:'Concluir uma atividade de lazer', icon:'♡', unlocked:done.some(h=>h.category==='lazer'), progress:done.some(h=>h.category==='lazer')?'1/1':'0/1' },
    { name:'Devagar se vai longe', detail:'Fazer sessões em três dias', icon:'☀', unlocked:unique>=3, progress:Math.min(unique,3)+'/3' },
    { name:'Uma hora tua', detail:'Acumular uma hora em sessões', icon:'✿', unlocked:history.reduce((s,h)=>s+h.elapsedMs,0)>=3600000, progress:Math.min(60,Math.floor(history.reduce((s,h)=>s+h.elapsedMs,0)/60000))+'/60 min' }
  ];
}
