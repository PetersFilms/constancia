'use strict';
const CACHE='constancia-shell-53';
const FILES=['./','index.html','history-store.js?v=53','bootstrap.js?v=53','calendar-sync.js?v=53','style.css?v=53','theme.css?v=53','todo.css?v=53','todo-core.js?v=53','todo.js?v=53','sleep-core.js?v=53','sleep-cycle.js?v=53','settings.js?v=53','settings.css?v=53','time-controls.js?v=53','time-controls.css?v=53','sleep.js?v=53','sleep.css?v=53','navigation.js?v=53','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=53','persistence-core.js?v=53','body-core.js?v=53','training-core.js?v=53','core.js?v=53','sync-core.js?v=53','recovery-store.js?v=53','app.js?v=53','body.js?v=53','training.js?v=53','cloud-sdk.js?v=53','sync-engine.js?v=53','sync.js?v=53','mobile.js?v=53','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('constancia-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Never cache authenticated requests or any other site's data.
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('index.html'))));return;
 }
 const paths=new Set(FILES.map(file=>new URL(file,self.registration.scope).pathname));
 if(!paths.has(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
