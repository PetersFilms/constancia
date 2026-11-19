'use strict';
const CACHE='constancia-shell-68';
const FILES=['./','index.html','history-store.js?v=68','bootstrap.js?v=68','calendar-sync.js?v=68','style.css?v=68','theme.css?v=68','todo.css?v=68','todo-core.js?v=68','todo.js?v=68','brain-core.js?v=68','brain.js?v=68','brain.css?v=68','sleep-core.js?v=68','sleep-cycle.js?v=68','settings.js?v=68','settings.css?v=68','time-controls.js?v=68','time-controls.css?v=68','sleep.js?v=68','sleep.css?v=68','navigation.js?v=68','pogonia-regular.woff2','pogonia-medium.woff2','pogonia-semibold.woff2','mobile.css?v=68','persistence-core.js?v=68','body-core.js?v=68','training-core.js?v=68','core.js?v=68','sync-core.js?v=68','recovery-store.js?v=68','app.js?v=68','reminder.js?v=68','body.js?v=68','training.js?v=68','cloud-sdk.js?v=68','sync-engine.js?v=68','sync.js?v=68','mobile.js?v=68','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
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
