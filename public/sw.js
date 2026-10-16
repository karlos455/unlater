const CACHE='unlater-shell-v1';
const ASSETS=['/','/index.html','/styles.css','/app.js','/core.js','/storage.js','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/creative.png','/assets/wardrobe.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('unlater-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    try { const response=await fetch(event.request); if(response.ok&&ASSETS.includes(new URL(event.request.url).pathname))await cache.put(event.request,response.clone()); return response; }
    catch { return await cache.match(event.request) || (event.request.mode==='navigate'?await cache.match('/index.html'):Response.error()); }
  }));
});
