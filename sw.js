'use strict';
const CACHE='constancia-shell-61';
const FILES=['./','index.html','history-store.js?v=61','bootstrap.js?v=61','calendar-sync.js?v=61','style.css?v=61','theme.css?v=61','todo.css?v=61','todo-core.js?v=61','todo.js?v=61','brain-core.js?v=61','brain.js?v=61','brain.css?v=61','sleep-core.js?v=61','sleep-cycle.js?v=61','settings.js?v=61','settings.css?v=61','time-controls.js?v=61','time-controls.css?v=61','sleep.js?v=61','sleep.css?v=61','navigation.js?v=61','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=61','persistence-core.js?v=61','body-core.js?v=61','training-core.js?v=61','core.js?v=61','sync-core.js?v=61','recovery-store.js?v=61','app.js?v=61','body.js?v=61','training.js?v=61','cloud-sdk.js?v=61','sync-engine.js?v=61','sync.js?v=61','mobile.js?v=61','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
