'use strict';
const CACHE='constancia-shell-56';
const FILES=['./','index.html','history-store.js?v=56','bootstrap.js?v=56','calendar-sync.js?v=56','style.css?v=56','theme.css?v=56','todo.css?v=56','todo-core.js?v=56','todo.js?v=56','sleep-core.js?v=56','sleep-cycle.js?v=56','settings.js?v=56','settings.css?v=56','time-controls.js?v=56','time-controls.css?v=56','sleep.js?v=56','sleep.css?v=56','navigation.js?v=56','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=56','persistence-core.js?v=56','body-core.js?v=56','training-core.js?v=56','core.js?v=56','sync-core.js?v=56','recovery-store.js?v=56','app.js?v=56','body.js?v=56','training.js?v=56','cloud-sdk.js?v=56','sync-engine.js?v=56','sync.js?v=56','mobile.js?v=56','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
