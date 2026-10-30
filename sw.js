'use strict';
const CACHE='constancia-shell-59';
const FILES=['./','index.html','history-store.js?v=59','bootstrap.js?v=59','calendar-sync.js?v=59','style.css?v=59','theme.css?v=59','todo.css?v=59','todo-core.js?v=59','todo.js?v=59','brain-core.js?v=59','brain.js?v=59','brain.css?v=59','sleep-core.js?v=59','sleep-cycle.js?v=59','settings.js?v=59','settings.css?v=59','time-controls.js?v=59','time-controls.css?v=59','sleep.js?v=59','sleep.css?v=59','navigation.js?v=59','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=59','persistence-core.js?v=59','body-core.js?v=59','training-core.js?v=59','core.js?v=59','sync-core.js?v=59','recovery-store.js?v=59','app.js?v=59','body.js?v=59','training.js?v=59','cloud-sdk.js?v=59','sync-engine.js?v=59','sync.js?v=59','mobile.js?v=59','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
