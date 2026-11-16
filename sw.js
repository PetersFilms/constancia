'use strict';
const CACHE='constancia-shell-67';
const FILES=['./','index.html','history-store.js?v=67','bootstrap.js?v=67','calendar-sync.js?v=67','style.css?v=67','theme.css?v=67','todo.css?v=67','todo-core.js?v=67','todo.js?v=67','brain-core.js?v=67','brain.js?v=67','brain.css?v=67','sleep-core.js?v=67','sleep-cycle.js?v=67','settings.js?v=67','settings.css?v=67','time-controls.js?v=67','time-controls.css?v=67','sleep.js?v=67','sleep.css?v=67','navigation.js?v=67','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=67','persistence-core.js?v=67','body-core.js?v=67','training-core.js?v=67','core.js?v=67','sync-core.js?v=67','recovery-store.js?v=67','app.js?v=67','reminder.js?v=67','body.js?v=67','training.js?v=67','cloud-sdk.js?v=67','sync-engine.js?v=67','sync.js?v=67','mobile.js?v=67','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
