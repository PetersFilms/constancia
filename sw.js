'use strict';
const CACHE='constancia-shell-57';
const FILES=['./','index.html','history-store.js?v=57','bootstrap.js?v=57','calendar-sync.js?v=57','style.css?v=57','theme.css?v=57','todo.css?v=57','todo-core.js?v=57','todo.js?v=57','sleep-core.js?v=57','sleep-cycle.js?v=57','settings.js?v=57','settings.css?v=57','time-controls.js?v=57','time-controls.css?v=57','sleep.js?v=57','sleep.css?v=57','navigation.js?v=57','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=57','persistence-core.js?v=57','body-core.js?v=57','training-core.js?v=57','core.js?v=57','sync-core.js?v=57','recovery-store.js?v=57','app.js?v=57','body.js?v=57','training.js?v=57','cloud-sdk.js?v=57','sync-engine.js?v=57','sync.js?v=57','mobile.js?v=57','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
