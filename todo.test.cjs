const test=require('node:test'),assert=require('node:assert/strict');
const T=require('./todo-core.js'),P=require('./persistence-core.js'),C=require('./sync-core.js');
const event=(d='2026-10-13',more={})=>({title:'Compromisso',description:'Descrição',allDay:false,start:T.fromLocal(d,'17:45'),end:T.fromLocal(d,'18:45'),timeZone:'America/Sao_Paulo',...more});
const cal={id:'primary-id',primary:true,accessRole:'owner',timeZone:'America/Sao_Paulo',accountId:'account-a'};
const raw=(id='event-a',more={})=>({id,etag:'"1"',summary:'Consulta',description:'Descrição original',start:{dateTime:'2026-10-13T17:45:00-03:00',timeZone:cal.timeZone},end:{dateTime:'2026-10-13T18:45:00-03:00',timeZone:cal.timeZone},...more});
const stamp='2026-10-13T21:00:00.000Z';
test('completion is immediate, records the real instant and can be undone without losing audit',()=>{const t=T.seed(),i=T.create(t,event());T.setStatus(t,i.id,'completed',null,stamp);assert.equal(i.execution.completedAt,stamp);assert.equal(T.metrics(t,'2026-10-13').rate,100);T.setStatus(t,i.id,'pending',null,'2026-10-13T21:01:00.000Z');assert.equal(i.execution.completedAt,null);assert.equal(t.history.at(-2).after.completedAt,stamp);T.validate(t);});
test('third party cancellation preserves original date, removes backlog and does not inflate completions',()=>{const t=T.seed(),a=T.create(t,event('2026-10-12')),b=T.create(t,event('2026-10-12'));T.setStatus(t,b.id,'completed',null,stamp);T.setStatus(t,a.id,'canceled','third_party',stamp);const m=T.metrics(t,'2026-10-13');assert.deepEqual([m.planned,m.completed,m.canceled,m.eligible,m.rate,m.backlog],[2,1,1,1,100,0]);assert.equal(a.original.start,event('2026-10-12').start);T.setStatus(t,a.id,'canceled','other','2026-10-13T22:00:00.000Z');assert.equal(a.execution.canceledAt,stamp);assert.equal(T.providerEvent(a).summary,'[Cancelado] Compromisso');T.setStatus(t,a.id,'pending');assert.equal(T.providerEvent(a).summary,'Compromisso');});
test('repeated rescheduling counts actions separately from distinct events',()=>{const t=T.seed(),i=T.create(t,event('2026-10-10'));const original=T.copy(i.original);T.edit(t,i.id,event('2026-10-11'),true,stamp);T.edit(t,i.id,event('2026-10-12'),true,stamp);assert.deepEqual(i.original,original);assert.equal(t.items.length,1);const m=T.metrics(t,'2026-10-13');assert.equal(m.postponed,1);assert.equal(m.reschedules,2);assert.equal(m.backlog,1);assert.equal(t.history.filter(h=>h.type==='postponed').length,2);assert.throws(()=>T.edit(t,i.id,event('2026-10-12'),true),/nova data/);});
test('all day, midnight, multi-day and timezone views have no artificial time',()=>{const t=T.seed();const all=T.create(t,event('2026-10-13',{allDay:true,start:'2026-10-13',end:'2026-10-15'}));const utc=T.create(t,event('2026-10-13',{start:'2026-10-14T01:00:00Z',end:'2026-10-14T02:00:00Z'}));const midnight=T.create(t,event('2026-10-13',{start:'2026-10-13T21:00:00-03:00',end:'2026-10-14T00:00:00-03:00'}));assert(T.view(t,'today','2026-10-13').includes(utc));assert(T.view(t,'tomorrow','2026-10-13').includes(all));assert(!T.view(t,'tomorrow','2026-10-13').includes(midnight));assert.deepEqual(T.providerEvent(all).start,{date:'2026-10-13'});assert.equal(T.fromLocal('2026-10-13','17:45'),'2026-10-13T20:45:00.000Z');assert.throws(()=>T.fromLocal('2026-03-29','01:30','Europe/London'),/não existe/);});
test('each recurring occurrence has independent execution; reimport does not duplicate',()=>{const t=T.seed();for(const [id,d]of [['r-1','2026-10-13'],['r-2','2026-10-14']]){const e=raw(id,{recurringEventId:'series',originalStartTime:{dateTime:d+'T17:45:00-03:00'}});T.importEvent(t,cal,e,'g-'+id,stamp);T.importEvent(t,cal,e,'g-'+id,stamp);}assert.equal(t.items.length,2);T.setStatus(t,t.items[0].id,'completed',null,stamp);assert.equal(t.items[1].execution.status,'pending');assert.equal(t.items[0].google.eventId,'r-1');assert.equal(t.history.filter(h=>h.type==='imported').length,2);});
test('Google deletion differs from operational cancellation and cannot be recreated by retry',()=>{const t=T.seed(),i=T.importEvent(t,cal,raw(),'g-event',stamp);T.edit(t,i.id,event(),false,stamp);T.importEvent(t,cal,{id:'event-a',status:'cancelled'},'g-event',stamp);assert(i.sync.externalDeleted);assert(i.conflict);assert.equal(i.execution.status,'pending');assert.equal(T.view(t,'pending','2026-10-14').length,0);assert.equal(T.view(t,'history','2026-10-14').length,1);assert.equal(T.metrics(t,'2026-10-14').eligible,0);assert.throws(()=>T.edit(t,i.id,event()),/excluído/);T.importEvent(t,cal,{id:'event-a',status:'cancelled'},'g-event',stamp);assert.equal(t.history.filter(h=>h.type==='external_deleted').length,1);});
test('remote edits retain local proposal; same server response acknowledges a lost reply',()=>{const t=T.seed(),i=T.importEvent(t,cal,raw(),'g-event',stamp);T.edit(t,i.id,event('2026-10-14',{title:'Meu título'}),false,stamp);const op=i.pending.operationId;T.importEvent(t,cal,raw(),'g-event',stamp);assert.equal(i.event.title,'Meu título');assert.equal(i.pending.operationId,op);T.importEvent(t,cal,raw('event-a',{etag:'"2"',summary:'Mudou no Google'}),'g-event',stamp);assert.equal(i.event.title,'Mudou no Google');assert.equal(i.conflict.local.title,'Meu título');T.resolve(t,i.id,'local',stamp);assert.equal(i.pending.baseEtag,'"2"');const e=T.providerEvent(i);T.importEvent(t,cal,{id:'event-a',etag:'"3"',...e},'g-event',stamp);assert.equal(i.pending,undefined);assert.equal(i.sync.state,'synced');});
test('backup merge identifies todo by id and preserves future fields and older histories',()=>{const a={version:1,todo:T.seed(),future:{value:42}},i=T.create(a.todo,event());i.future={value:1};const b=T.copy(a);b.todo.items[0].future.newField=2;T.setStatus(b.todo,i.id,'completed',null,stamp);const merged=P.merge(b,a);assert.equal(merged.state.todo.items.length,1);assert.equal(merged.state.todo.items[0].future.newField,2);assert(merged.conflicts.some(x=>x.startsWith('todo.items')));assert.equal(merged.state.future.value,42);assert.deepEqual(P.restore({version:1},a).todo,a.todo);});
test('two-device merge combines independent execution and Google edits, detects competing status changes',()=>{const base={todo:T.seed()},i=T.importEvent(base.todo,cal,raw(),'g-event',stamp),local=T.copy(base),remote=T.copy(base);T.setStatus(local.todo,i.id,'completed',null,stamp);T.importEvent(remote.todo,cal,raw('event-a',{etag:'"2"',summary:'Nova consulta'}),'g-event',stamp);const merged=C.reconcile(base,local,remote);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.state.todo.items[0].execution.status,'completed');assert.equal(merged.state.todo.items[0].event.title,'Nova consulta');assert.equal(merged.state.todo.history.length,3);T.setStatus(remote.todo,i.id,'in_progress',null,stamp);assert(C.reconcile(base,local,remote).conflicts.some(p=>p.endsWith('.execution')));});
test('read-only and future fields survive projections, validation rejects malformed structures',()=>{const t=T.seed(),i=T.importEvent(t,{...cal,accessRole:'reader'},raw(),'g-event',stamp);i.custom={keep:true};i.event.extra='keep';T.importEvent(t,cal,raw('event-a',{etag:'"2"',summary:'Alterado'}),'g-event',stamp);assert.equal(i.event.extra,'keep');assert.deepEqual(i.custom,{keep:true});const invalid=T.copy(t);invalid.items.push(invalid.items[0]);assert.throws(()=>T.validate(invalid));assert.throws(()=>T.validate({...t,timeZone:'Made/Up'}));});
test('postponing beyond today does not remove a planned task from the execution denominator',()=>{const t=T.seed(),i=T.create(t,event('2026-10-12')),done=T.create(t,event('2026-10-12'));T.setStatus(t,done.id,'completed',null,stamp);T.edit(t,i.id,event('2026-10-20'),true,stamp);const m=T.metrics(t,'2026-10-13');assert.equal(m.planned,2);assert.equal(m.eligible,2);assert.equal(m.rate,50);assert.equal(m.postponed,1);assert.equal(m.backlog,0);});
test('all-day export and equivalent instants acknowledge Google timezone normalization',()=>{const t=T.seed(),i=T.create(t,event('2026-10-13',{allDay:true,start:'2026-10-13',end:'2026-10-14',timeZone:'Europe/Lisbon'}),stamp,'primary','account-a'),p=T.providerEvent(i);T.importEvent(t,cal,{...p,id:'normalized',etag:'"1"'},'g-normalized',stamp);assert.equal(t.items.length,1);assert.equal(i.pending,undefined);assert.equal(i.event.timeZone,'America/Sao_Paulo');assert.equal(i.original.timeZone,'Europe/Lisbon');assert(T.sameEvent(event(),event('2026-10-13',{start:'2026-10-13T17:45:00-03:00',end:'2026-10-13T18:45:00-03:00',timeZone:'UTC'})));});
test('keeping Google date/title in a conflict still preserves the operational cancellation label',()=>{const t=T.seed(),i=T.importEvent(t,cal,raw(),'g-event',stamp);T.setStatus(t,i.id,'canceled','third_party',stamp);T.importEvent(t,cal,raw('event-a',{etag:'"2"',summary:'Título atualizado no Google'}),'g-event',stamp);assert(i.conflict);T.resolve(t,i.id,'google',stamp);assert.equal(i.execution.status,'canceled');assert.equal(i.pending.baseEtag,'"2"');assert.equal(T.providerEvent(i).summary,'[Cancelado] Título atualizado no Google');assert.equal(i.conflict,undefined);});

test('large calendar validation reuses timezone rules and retains every record',()=>{
 const vm=require('node:vm');let constructions=0;
 const sandbox={Intl:{DateTimeFormat:function(...args){constructions++;return new Intl.DateTimeFormat(...args);}},crypto,Date};
 vm.runInNewContext(require('node:fs').readFileSync('todo-core.js','utf8'),sandbox);
 const core=sandbox.ToDoCore,t=core.seed();for(let n=0;n<2500;n++)core.importEvent(t,cal,raw('bulk-'+n),'g-bulk-'+n,stamp);
 core.validate(t);assert.equal(t.items.length,2500);assert.equal(t.history.length,2500);assert(constructions<=3);
 for(let n=0;n<100;n++){core.day(stamp,cal.timeZone);core.localTime(stamp,cal.timeZone);}assert(constructions<=3);
 assert.throws(()=>core.validate({...t,timeZone:'Invalid/Zone'}));
});

test('holidays and prior-year backlog stay preserved but do not enter annual tracking',()=>{
 const t=T.seed();coreDates=['2025-12-31','2026-01-01','2026-10-12'];
 const previous=T.create(t,event('2025-12-31')),current=T.create(t,event('2026-10-12'));
 const holiday=T.importEvent(t,{...cal,id:'pt.brazilian#holiday@group.v.calendar.google.com'},raw('holiday',{start:{date:'2026-10-12'},end:{date:'2026-10-13'}}),'g-holiday',stamp);
 assert.deepEqual(T.view(t,'pending','2026-10-13').map(i=>i.id),[current.id]);assert.equal(T.metrics(t,'2026-10-13').planned,1);assert.equal(T.metrics(t,'2026-10-13').backlog,1);assert.equal(t.items.length,3);
 T.setStatus(t,previous.id,'completed',null,stamp);assert(T.view(t,'history','2026-10-13').some(i=>i.id===previous.id));assert(!T.view(t,'history','2026-10-13').some(i=>i.id===holiday.id));assert(T.calendarAllowed('work@example.com'));
});

test('pending window includes day 90, excludes day 91 and preserves state and annual execution base',()=>{
 const t=T.seed(),today='2026-10-13';
 const older=T.create(t,event(T.shift(today,-91))),boundary=T.create(t,event(T.shift(today,-90))),recent=T.create(t,event(T.shift(today,-1))),current=T.create(t,event(today));
 T.setStatus(t,older.id,'in_progress',null,stamp);const snapshot=JSON.stringify(t);
 assert.deepEqual(T.view(t,'pending',today).map(i=>i.id),[boundary.id,recent.id]);
 const m=T.metrics(t,today);assert.deepEqual([m.planned,m.eligible,m.pending,m.backlog,m.rate],[4,4,3,2,0]);assert.equal(JSON.stringify(t),snapshot);
 assert.deepEqual(T.view(t,'pending',T.shift(today,1)).map(i=>i.id),[recent.id,current.id]);
 T.setStatus(t,older.id,'completed',null,stamp);assert(T.view(t,'history',today).some(i=>i.id===older.id));assert.equal(T.metrics(t,today).rate,25);
});

test('90-day pending filter respects the year, local timezone and multi-day events still active today',()=>{
 const t=T.seed();T.create(t,event('2025-12-31'));const jan=T.create(t,event('2026-01-01'));assert.deepEqual(T.view(t,'pending','2026-01-02').map(i=>i.id),[jan.id]);
 const u=T.seed(),today='2026-10-13',cutoff=T.shift(today,-90);
 const outside=T.create(u,event(cutoff,{start:cutoff+'T01:30:00Z',end:cutoff+'T02:00:00Z'}));
 const inside=T.create(u,event(cutoff,{start:cutoff+'T03:00:00Z',end:cutoff+'T04:00:00Z'}));
 const ongoing=T.create(u,event(T.shift(today,-91),{allDay:true,start:T.shift(today,-91),end:T.shift(today,1)}));
 assert.deepEqual(T.view(u,'pending',today).map(i=>i.id),[inside.id]);assert(T.view(u,'today',today).some(i=>i.id===ongoing.id));assert.equal(T.metrics(u,today).pending,2);assert.equal(u.items.length,3);assert.equal(outside.execution.status,'pending');
});

test('one invitation across calendars counts once, retains user actions and separates occurrences',()=>{
 const t=T.seed(),secondary={...cal,id:'shared',primary:false};const r=raw('copy-a',{iCalUID:'invitation-uid'});const a=T.importEvent(t,cal,r,'g-copy-a',stamp),b=T.importEvent(t,secondary,{...r,id:'copy-b'},'g-copy-b',stamp);
 assert.equal(T.view(t,'today','2026-10-13').length,1);assert.equal(T.metrics(t,'2026-10-13').planned,1);assert.equal(t.items.length,2);
 T.setStatus(t,b.id,'completed',null,stamp);assert.equal(T.metrics(t,'2026-10-13').completed,1);assert.equal(T.view(t,'today','2026-10-13')[0].id,b.id);
 T.setStatus(t,b.id,'pending',null,'2026-10-13T21:01:00Z');assert.equal(T.metrics(t,'2026-10-13').completed,0);assert.equal(t.items.length,2);
 T.importEvent(t,secondary,raw('different',{iCalUID:'different-uid'}),'g-different',stamp);assert.equal(T.metrics(t,'2026-10-13').planned,2);
 for(const [n,d] of [[1,'2026-10-13'],[2,'2026-10-14']]){const rr=raw('r-'+n,{iCalUID:'series-uid',recurringEventId:'series',originalStartTime:{dateTime:d+'T17:45:00-03:00'}});T.importEvent(t,cal,rr,'g-r-'+n,stamp);T.importEvent(t,secondary,{...rr,id:'alias-'+n,originalStartTime:{dateTime:d+'T20:45:00Z'}},'g-alias-'+n,stamp);}
 assert.equal(T.logicalItems(t).length,4);assert.equal(t.items.length,7);T.validate(t);
});

test('metadata-only Google revisions rebase safely while real event edits still conflict',()=>{
 const t=T.seed(),i=T.importEvent(t,cal,raw('meta'),'g-meta',stamp);T.edit(t,i.id,event('2026-10-14'),true,stamp);
 const proposal=T.copy(i.pending.event);T.importEvent(t,cal,raw('meta',{etag:'"metadata-only"'}),'g-meta',stamp);assert.equal(i.conflict,undefined);assert.deepEqual(i.event,proposal);assert.equal(i.pending.baseEtag,'"metadata-only"');
 T.importEvent(t,cal,raw('meta',{etag:'"real-edit"',summary:'Alterado por outra pessoa'}),'g-meta',stamp);assert(i.conflict);assert.equal(i.conflict.local.start,proposal.start);
 const u=T.seed(),c=T.importEvent(u,cal,raw('cancel'),'g-cancel',stamp);T.setStatus(u,c.id,'canceled',null,stamp);T.importEvent(u,cal,raw('cancel',{etag:'"new-series-revision"'}),'g-cancel',stamp);assert.equal(c.conflict,undefined);assert.equal(c.pending.baseEtag,'"new-series-revision"');assert.equal(c.execution.status,'canceled');
});

test('selected calendars filter before invitation grouping and metrics, preserving hidden histories',()=>{
 const t=T.seed(),a=T.importEvent(t,cal,raw('a',{iCalUID:'same'}),'g-a',stamp),b=T.importEvent(t,{...cal,id:'work',primary:false},raw('b',{iCalUID:'same'}),'g-b',stamp);
 T.setStatus(t,a.id,'completed',null,stamp);t.preferences={calendarIds:['work'],carryoverSince:'2026-10-13',future:'keep'};const snapshot=JSON.stringify(t);
 assert.deepEqual(T.view(t,'today','2026-10-13').map(i=>i.id),[b.id]);assert.equal(T.metrics(t,'2026-10-13').planned,1);assert.equal(JSON.stringify(t),snapshot);
 t.preferences.calendarIds=['primary-id'];assert.deepEqual(T.view(t,'today','2026-10-13').map(i=>i.id),[a.id]);assert.equal(T.metrics(t,'2026-10-13').completed,1);assert.equal(t.items.length,2);assert.equal(t.preferences.future,'keep');
});
test('daily carryover starts at activation, keeps dates, creates no operations, and disappears on completion',()=>{
 const t=T.seed();t.preferences={carryoverSince:'2026-10-13'};const old=T.create(t,event('2026-10-12')),i=T.create(t,event());delete i.pending;i.sync.state='synced';const snapshot=JSON.stringify(t);
 assert.deepEqual(T.view(t,'tomorrow','2026-10-13').map(i=>i.id),[i.id]);assert.deepEqual(T.view(t,'today','2026-10-14').map(i=>i.id),[i.id]);assert.equal(T.view(t,'today','2026-10-15').length,1);assert.equal(JSON.stringify(t),snapshot);
 assert.equal(i.postponeCount,0);assert.deepEqual(i.event,i.original);assert.equal(i.pending,undefined);assert(!T.view(t,'today','2026-10-14').includes(old));
 T.setStatus(t,i.id,'completed',null,stamp);assert.equal(T.view(t,'today','2026-10-14').length,0);assert(T.view(t,'history','2026-10-14').includes(i));T.setStatus(t,i.id,'pending',null,stamp);assert(T.view(t,'today','2026-10-14').includes(i));T.setStatus(t,i.id,'canceled',null,stamp);assert.equal(T.view(t,'today','2026-10-14').length,0);
});
test('carryover respects local midnight, all-day and multi-day endings without duplicates',()=>{
 const t=T.seed();t.preferences={carryoverSince:'2026-10-13'};const multi=T.create(t,event('2026-10-13',{allDay:true,start:'2026-10-13',end:'2026-10-15'})),midnight=T.create(t,event('2026-10-13',{start:'2026-10-14T01:00:00Z',end:'2026-10-14T03:00:00Z'}));
 assert.equal(T.endDay(midnight,t.timeZone),'2026-10-13');assert(T.carryover(t,midnight,'2026-10-14'));assert(!T.carryover(t,multi,'2026-10-14'));assert(T.carryover(t,multi,'2026-10-15'));assert.equal(T.view(t,'today','2026-10-14').filter(i=>i.id===multi.id).length,1);assert.equal(T.view(t,'today','2026-10-15').length,2);
 midnight.sync.externalDeleted=true;assert(!T.carryover(t,midnight,'2026-10-15'));
});
test('recurring occurrences carry independently and explicit postponement stops the earlier carryover',()=>{
 const t=T.seed();t.preferences={carryoverSince:'2026-10-13'};
 const a=T.importEvent(t,cal,raw('r-a',{iCalUID:'series',recurringEventId:'s',originalStartTime:{date:'2026-10-13'}}),'g-r-a',stamp),b=T.importEvent(t,cal,raw('r-b',{iCalUID:'series',recurringEventId:'s',originalStartTime:{date:'2026-10-14'},start:{date:'2026-10-14'},end:{date:'2026-10-15'}}),'g-r-b',stamp);
 assert.equal(T.view(t,'today','2026-10-14').length,2);T.setStatus(t,a.id,'completed',null,stamp);assert.deepEqual(T.view(t,'today','2026-10-14').map(i=>i.id),[b.id]);T.edit(t,b.id,event('2026-10-20'),true,stamp);assert.equal(T.view(t,'today','2026-10-15').length,0);
});
test('preference backup and cross-device reconciliation keep habits, training, body, unknown fields and audits',()=>{
 const base={version:1,habits:[{id:'h',custom:1}],checks:{keep:true},body:{weights:[{date:'2026-10-12',weight:70.5}]},training:{sessions:[{id:'s',custom:2}]},future:{preserved:true},todo:T.seed()};T.create(base.todo,event());
 const local=T.copy(base),remote=T.copy(base);local.todo.preferences={calendarIds:['work'],carryoverSince:'2026-10-13',unknown:'keep'};remote.todo.items[0].event.title='Updated remotely';const merged=C.reconcile(base,local,remote);assert.deepEqual(merged.conflicts,[]);assert.deepEqual(merged.state.todo.preferences,local.todo.preferences);for(const k of ['habits','checks','body','training','future'])assert.deepEqual(merged.state[k],base[k]);assert.deepEqual(merged.state.todo.history,base.todo.history);assert.equal(merged.state.todo.items[0].event.title,'Updated remotely');T.validate(merged.state.todo);
 assert.deepEqual(P.restore(base,local).todo.preferences,local.todo.preferences);assert.throws(()=>T.validate({...local.todo,preferences:{calendarIds:'bad'}}));assert.throws(()=>T.validate({...local.todo,preferences:{carryoverSince:'2026-02-30'}}));
});

test('an event already spanning the activation day carries after its final day without importing older backlog',()=>{const t=T.seed();t.preferences={carryoverSince:'2026-10-13'};const i=T.create(t,event('2026-10-11',{allDay:true,start:'2026-10-11',end:'2026-10-14'}));assert(T.view(t,'today','2026-10-13').includes(i));assert(T.view(t,'today','2026-10-14').includes(i));});
