'use strict';
const CACHE='constancia-shell-54';
const FILES=['./','index.html','history-store.js?v=54','bootstrap.js?v=54','calendar-sync.js?v=54','style.css?v=54','theme.css?v=54','todo.css?v=54','todo-core.js?v=54','todo.js?v=54','sleep-core.js?v=54','sleep-cycle.js?v=54','settings.js?v=54','settings.css?v=54','time-controls.js?v=54','time-controls.css?v=54','sleep.js?v=54','sleep.css?v=54','navigation.js?v=54','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=54','persistence-core.js?v=54','body-core.js?v=54','training-core.js?v=54','core.js?v=54','sync-core.js?v=54','recovery-store.js?v=54','app.js?v=54','body.js?v=54','training.js?v=54','cloud-sdk.js?v=54','sync-engine.js?v=54','sync.js?v=54','mobile.js?v=54','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
