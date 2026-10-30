'use strict';
const CACHE='constancia-shell-58';
const FILES=['./','index.html','history-store.js?v=58','bootstrap.js?v=58','calendar-sync.js?v=58','style.css?v=58','theme.css?v=58','todo.css?v=58','todo-core.js?v=58','todo.js?v=58','sleep-core.js?v=58','sleep-cycle.js?v=58','settings.js?v=58','settings.css?v=58','time-controls.js?v=58','time-controls.css?v=58','sleep.js?v=58','sleep.css?v=58','navigation.js?v=58','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=58','persistence-core.js?v=58','body-core.js?v=58','training-core.js?v=58','core.js?v=58','sync-core.js?v=58','recovery-store.js?v=58','app.js?v=58','body.js?v=58','training.js?v=58','cloud-sdk.js?v=58','sync-engine.js?v=58','sync.js?v=58','mobile.js?v=58','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
