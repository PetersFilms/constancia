'use strict';
const CACHE='constancia-shell-51';
const FILES=['./','index.html','history-store.js?v=51','bootstrap.js?v=51','calendar-sync.js?v=51','style.css?v=51','theme.css?v=51','todo.css?v=51','todo-core.js?v=51','todo.js?v=51','sleep-core.js?v=51','sleep-cycle.js?v=51','settings.js?v=51','settings.css?v=51','time-controls.js?v=51','time-controls.css?v=51','sleep.js?v=51','sleep.css?v=51','navigation.js?v=51','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=51','persistence-core.js?v=51','body-core.js?v=51','training-core.js?v=51','core.js?v=51','sync-core.js?v=51','recovery-store.js?v=51','app.js?v=51','body.js?v=51','training.js?v=51','cloud-sdk.js?v=51','sync-engine.js?v=51','sync.js?v=51','mobile.js?v=51','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
