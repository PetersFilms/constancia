'use strict';
const CACHE='constancia-shell-34';
const FILES=['./','index.html','style.css?v=34','theme.css?v=34','todo.css?v=34','todo-core.js?v=34','todo.js?v=34','navigation.js?v=34','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=34','persistence-core.js?v=34','body-core.js?v=34','training-core.js?v=34','core.js?v=34','sync-core.js?v=34','app.js?v=34','body.js?v=34','training.js?v=34','cloud-sdk.js?v=34','sync-engine.js?v=34','sync.js?v=34','mobile.js?v=34','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
