'use strict';
const CACHE='constancia-shell-55';
const FILES=['./','index.html','history-store.js?v=55','bootstrap.js?v=55','calendar-sync.js?v=55','style.css?v=55','theme.css?v=55','todo.css?v=55','todo-core.js?v=55','todo.js?v=55','sleep-core.js?v=55','sleep-cycle.js?v=55','settings.js?v=55','settings.css?v=55','time-controls.js?v=55','time-controls.css?v=55','sleep.js?v=55','sleep.css?v=55','navigation.js?v=55','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=55','persistence-core.js?v=55','body-core.js?v=55','training-core.js?v=55','core.js?v=55','sync-core.js?v=55','recovery-store.js?v=55','app.js?v=55','body.js?v=55','training.js?v=55','cloud-sdk.js?v=55','sync-engine.js?v=55','sync.js?v=55','mobile.js?v=55','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
