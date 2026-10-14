'use strict';
const CACHE='constancia-shell-46';
const FILES=['./','index.html','style.css?v=46','theme.css?v=46','todo.css?v=46','todo-core.js?v=46','todo.js?v=46','sleep-core.js?v=46','sleep.js?v=46','sleep.css?v=46','navigation.js?v=46','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=46','persistence-core.js?v=46','body-core.js?v=46','training-core.js?v=46','core.js?v=46','sync-core.js?v=46','recovery-store.js?v=46','app.js?v=46','body.js?v=46','training.js?v=46','cloud-sdk.js?v=46','sync-engine.js?v=46','sync.js?v=46','mobile.js?v=46','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
