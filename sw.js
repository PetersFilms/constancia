'use strict';
const CACHE='constancia-shell-45';
const FILES=['./','index.html','style.css?v=45','theme.css?v=45','todo.css?v=45','todo-core.js?v=45','todo.js?v=45','sleep-core.js?v=45','sleep.js?v=45','sleep.css?v=45','navigation.js?v=45','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=45','persistence-core.js?v=45','body-core.js?v=45','training-core.js?v=45','core.js?v=45','sync-core.js?v=45','recovery-store.js?v=45','app.js?v=45','body.js?v=45','training.js?v=45','cloud-sdk.js?v=45','sync-engine.js?v=45','sync.js?v=45','mobile.js?v=45','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
