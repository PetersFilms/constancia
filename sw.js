'use strict';
const CACHE='constancia-shell-65';
const FILES=['./','index.html','history-store.js?v=65','bootstrap.js?v=65','calendar-sync.js?v=65','style.css?v=65','theme.css?v=65','todo.css?v=65','todo-core.js?v=65','todo.js?v=65','brain-core.js?v=65','brain.js?v=65','brain.css?v=65','sleep-core.js?v=65','sleep-cycle.js?v=65','settings.js?v=65','settings.css?v=65','time-controls.js?v=65','time-controls.css?v=65','sleep.js?v=65','sleep.css?v=65','navigation.js?v=65','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=65','persistence-core.js?v=65','body-core.js?v=65','training-core.js?v=65','core.js?v=65','sync-core.js?v=65','recovery-store.js?v=65','app.js?v=65','reminder.js?v=65','body.js?v=65','training.js?v=65','cloud-sdk.js?v=65','sync-engine.js?v=65','sync.js?v=65','mobile.js?v=65','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('constancia-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
// Lembrete diário: todo push exibe uma notificação (regra do iOS para PWA instalada).
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{};}catch{}event.waitUntil(self.registration.showNotification(data.title||'Constância',{body:data.body||'Hora de marcar seus hábitos de hoje.',icon:'icon-192.png',badge:'icon-192.png',tag:data.tag||'constancia-reminder'}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list)if(client.url.startsWith(self.registration.scope))return client.focus();return self.clients.openWindow(self.registration.scope);}));});
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
