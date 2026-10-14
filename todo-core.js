(function(root){
 'use strict';
 const STATUSES=['pending','in_progress','completed','canceled','postponed'];
 const LABELS={pending:'Pendente',in_progress:'Em andamento',completed:'Concluído',canceled:'Cancelado',postponed:'Adiado'};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const validDay=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;};
 const zones=new Map(),formatters=new Map();
 const zone=z=>{if(typeof z!=='string')return false;if(zones.has(z))return zones.get(z);let valid;try{new Intl.DateTimeFormat('pt-BR',{timeZone:z});valid=true;}catch{valid=false;}if(zones.size>=100)zones.clear();zones.set(z,valid);return valid;};
 function formatter(kind,z){const key=kind+'|'+z;if(!formatters.has(key)){if(formatters.size>=100)formatters.clear();formatters.set(key,new Intl.DateTimeFormat(kind==='day'?'en-CA':'en-GB',kind==='day'?{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}:{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));}return formatters.get(key);}
 const instant=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
 const seed=()=>({version:1,timeZone:'America/Sao_Paulo',items:[],history:[]});
 const uuid=()=>root.crypto.randomUUID();
 function day(value,z='America/Sao_Paulo'){
  if(validDay(value))return value;
  const parts=formatter('day',z).formatToParts(new Date(value));
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
 }
 function shift(d,n){const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);}
 function localTime(value,z){const p=formatter('time',z).formatToParts(new Date(value));return p.filter(x=>x.type==='hour'||x.type==='minute').map(x=>x.value).join(':');}
 function fromLocal(d,t,z='America/Sao_Paulo'){
  if(!validDay(d)||!/^\d{2}:\d{2}$/.test(t)||!zone(z)||+t.slice(0,2)>23||+t.slice(3)>59)throw Error('Informe uma data, horário e fuso válidos.');
  const target=Date.parse(d+'T'+t+':00Z');let v=target;
  for(let i=0;i<4;i++){const actual=Date.parse(day(v,z)+'T'+localTime(v,z)+':00Z');const delta=target-actual;if(!delta)break;v+=delta;}
  if(day(v,z)!==d||localTime(v,z)!==t)throw Error('Esse horário não existe no fuso selecionado.');
  return new Date(v).toISOString();
 }
 function schedule(e){
  if(e?.recurrence!==undefined&&(!Array.isArray(e.recurrence)||e.recurrence.length>8||e.recurrence.some(r=>typeof r!=='string'||r.length>2000||!/^(RRULE|EXRULE|RDATE|EXDATE):/.test(r))))throw Error('Recorrência inválida.');
  if(e?.reminders!==undefined&&(!e.reminders||typeof e.reminders.useDefault!=='boolean'||!Array.isArray(e.reminders.overrides)||e.reminders.overrides.length>5||e.reminders.overrides.some(r=>!['popup','email'].includes(r.method)||!Number.isInteger(r.minutes)||r.minutes<0||r.minutes>40320)))throw Error('Lembrete inválido.');
  if(!e||!zone(e.timeZone)||typeof e.title!=='string'||!e.title.trim()||e.title.length>2000||typeof e.description!=='string'||e.description.length>100000)throw Error('Dados do compromisso inválidos.');
  if(e.allDay){if(!validDay(e.start)||!validDay(e.end)||e.end<=e.start)throw Error('Datas de dia inteiro inválidas.');}
  else if(!instant(e.start)||!instant(e.end)||Date.parse(e.end)<=Date.parse(e.start))throw Error('O término deve ocorrer depois do início.');
  return e;
 }
 function validate(todo){
  if(!todo||todo.version!==1||!zone(todo.timeZone)||!Array.isArray(todo.items)||!Array.isArray(todo.history)||todo.items.length>50000||todo.history.length>200000)throw Error('Histórico do To-Do inválido.');
  if(todo.preferences!=null){const p=todo.preferences;if(!p||typeof p!=='object'||Array.isArray(p)||p.carryoverSince!=null&&!validDay(p.carryoverSince)||p.calendarIds!=null&&(!Array.isArray(p.calendarIds)||p.calendarIds.length>500||p.calendarIds.some(id=>typeof id!=='string'||!id||id.length>1024)))throw Error('Preferências do To-Do inválidas.');}
  const ids=new Set();for(const i of todo.items){
   if(!i||typeof i.id!=='string'||! /^[a-zA-Z0-9-]{1,100}$/.test(i.id)||ids.has(i.id)||['__proto__','constructor','prototype'].includes(i.id)||!STATUSES.includes(i.execution?.status)||!Number.isInteger(i.postponeCount)||i.postponeCount<0)throw Error('Item do To-Do inválido.');
   schedule(i.event);schedule(i.original);ids.add(i.id);
   for(const k of ['completedAt','canceledAt','startedAt'])if(i.execution[k]!=null&&!instant(i.execution[k]))throw Error('Registro de execução inválido.');
   if(i.execution.status==='completed'&&!i.execution.completedAt)throw Error('Conclusão sem horário real.');
   if(i.pending&&(!i.pending.operationId||!['create','patch'].includes(i.pending.kind)))throw Error('Operação de agenda inválida.');
   if(i.pending?.dependsOn&&(!Array.isArray(i.pending.dependsOn)||i.pending.dependsOn.length>100||i.pending.dependsOn.some(id=>typeof id!=='string'||! /^[a-zA-Z0-9-]{1,100}$/.test(id))))throw Error('Dependência de sincronização inválida.');
   if(i.pending)schedule(i.pending.event);
  }
  const auditIds=new Set();for(const h of todo.history){if(!h||typeof h.id!=='string'||auditIds.has(h.id)||typeof h.itemId!=='string'||!instant(h.at)||typeof h.type!=='string')throw Error('Auditoria do To-Do inválida.');auditIds.add(h.id);}
  return todo;
 }
 function audit(todo,item,type,before,after,at,id=uuid()){if(!todo.history.some(h=>h.id===id))todo.history.push({id,itemId:item.id,type,at,before:copy(before),after:copy(after)});}
 function queue(item,baseline=item.event){
  if(item.sync?.externalDeleted)throw Error('Este evento foi excluído na agenda. Seu histórico foi preservado.');
  const old=item.pending;
  item.pending={...(old?.dependsOn?{dependsOn:copy(old.dependsOn)}:{}),operationId:uuid(),kind:item.google?.eventId?'patch':'create',baseEtag:item.google?.etag||null,baseEvent:copy(old?.baseEvent||baseline),baseCanceled:old?.baseCanceled??item.google?.canceledMarker??false,event:copy(item.event),accountId:item.google?.accountId||null,canceled:item.execution.status==='canceled'};
  item.sync={...item.sync,state:'pending'};delete item.conflict;
 }
 function create(todo,event,at=new Date().toISOString(),calendarId='primary',accountId=null){
  schedule(event);const item={id:uuid(),origin:'constancia',event:copy(event),original:copy(event),google:{calendarId,accountId},execution:{status:'pending',completedAt:null,canceledAt:null,cancelReason:null,startedAt:null},postponeCount:0,sync:{state:'pending',lastSync:null,externalDeleted:false}};
  queue(item);todo.items.push(item);audit(todo,item,'created',{},event,at);return item;
 }
 function setStatus(todo,id,status,reason=null,at=new Date().toISOString()){
  if(!STATUSES.includes(status)||status==='postponed')throw Error('Para adiar, escolha uma nova data.');
  const i=todo.items.find(x=>x.id===id);if(!i)throw Error('Compromisso não encontrado.');if(i.sync?.externalDeleted)throw Error('Evento excluído na agenda; histórico preservado.');
  const before=copy(i.execution),old=before.status;if(old===status&&reason===before.cancelReason)return i;
  i.execution={...before,status,completedAt:status==='completed'?at:null,canceledAt:status==='canceled'?(old==='canceled'?before.canceledAt:at):null,cancelReason:status==='canceled'?reason:null,startedAt:status==='in_progress'?at:before.startedAt};
  if(status==='canceled'||old==='canceled')queue(i);
  audit(todo,i,'status',before,i.execution,at);return i;
 }
 function edit(todo,id,event,postponed=false,at=new Date().toISOString()){
  schedule(event);const i=todo.items.find(x=>x.id===id);if(!i)throw Error('Compromisso não encontrado.');
  const before={event:copy(i.event),execution:copy(i.execution)};
  if(postponed&&event.start===i.event.start&&event.end===i.event.end)throw Error('Escolha uma nova data ou horário para adiar.');
  i.event={...i.event,...copy(event)};
  if(postponed){i.postponeCount++;i.execution={...i.execution,status:'postponed',completedAt:null,canceledAt:null,cancelReason:null};}
  queue(i,before.event);audit(todo,i,postponed?'postponed':'edited',before,{event:i.event,execution:i.execution},at);return i;
 }
 function resolve(todo,id,choice,at=new Date().toISOString()){
  const i=todo.items.find(x=>x.id===id);if(!i?.conflict)throw Error('Não há conflito para revisar.');
  const c=copy(i.conflict);if(choice==='local'){i.event=copy(c.local);delete i.pending;queue(i,c.remote||i.event);}else if(choice==='google'){delete i.pending;i.sync.state='synced';if(i.execution.status==='canceled'&&!i.sync.externalDeleted)queue(i);}else throw Error('Escolha uma versão.');
  delete i.conflict;audit(todo,i,'conflict_resolved',c,{choice,event:i.event},at);
 }
 const active=i=>!i.sync?.externalDeleted&&!['completed','canceled'].includes(i.execution.status);
 const calendarAllowed=id=>!String(id||'').endsWith('#holiday@group.v.calendar.google.com');
 const calendarVisible=(todo,i)=>calendarAllowed(i.google?.calendarId)&&(!Array.isArray(todo.preferences?.calendarIds)||todo.preferences.calendarIds.includes(i.google?.calendarId)||i.google?.calendarId==='primary'&&todo.preferences.calendarIds.includes('primary'));
 function logicalItems(todo,visibleOnly=false){
  const actions=new Map();for(const h of todo.history)if(['status','edited','postponed','created','conflict_resolved'].includes(h.type))actions.set(h.itemId,Math.max(actions.get(h.itemId)||0,Date.parse(h.at)));
  const groups=new Map(),rank=i=>[i.sync?.externalDeleted?0:1,actions.get(i.id)||0,i.google?.writable?1:0,i.google?.primary?1:0,i.origin==='constancia'?1:0];
  for(const i of todo.items){if(visibleOnly&&!calendarVisible(todo,i))continue;const occurrence=i.google?.occurrence,o=occurrence?.dateTime?String(Date.parse(occurrence.dateTime)):occurrence?.date||'',key=i.google?.iCalUID?'uid:'+i.google.iCalUID+'|'+o:'id:'+i.id,old=groups.get(key);if(!old){groups.set(key,i);continue;}const a=rank(i),b=rank(old);let order=0;for(let n=0;n<a.length&&!order;n++)order=a[n]-b[n];if(order>0||!order&&i.id<old.id)groups.set(key,i);}
  return [...groups.values()];
 }
 const startDay=(i,z)=>i.event.allDay?i.event.start:day(i.event.start,z);
 function onDay(i,d,z){const a=startDay(i,z),b=i.event.allDay?shift(i.event.end,-1):day(Date.parse(i.event.end)-1,z);return a<=d&&b>=d;}
 const endDay=(i,z)=>i.event.allDay?shift(i.event.end,-1):day(Date.parse(i.event.end)-1,z);
 function carryover(todo,i,target){return !i.sleepPlanId&&!i.seriesMaster&&active(i)&&!!todo.preferences?.carryoverSince&&endDay(i,todo.timeZone)>=todo.preferences.carryoverSince&&endDay(i,todo.timeZone)<target;}
 const pendingSince=today=>[today.slice(0,4)+'-01-01',shift(today,-90)].sort().at(-1);
 function view(todo,name,today,nextDate=today){
  const z=todo.timeZone,cutoff=pendingSince(today);
  return logicalItems(todo,true).filter(i=>{
   if(!calendarAllowed(i.google?.calendarId))return false;
   const d=startDay(i,z);
   if(i.sync?.externalDeleted||i.seriesMaster)return false;
   if(name==='history')return ['completed','canceled','postponed'].includes(i.execution.status)||i.postponeCount>0;
   if(i.execution.status==='canceled')return false;
   if(name==='pending')return active(i)&&d>=cutoff&&d<today&&!onDay(i,today,z);
   if(name==='today')return onDay(i,today,z)||carryover(todo,i,today);
   if(name==='tomorrow')return onDay(i,shift(today,1),z)||carryover(todo,i,shift(today,1));
   return onDay(i,nextDate,z)&&nextDate>today;
  }).sort((a,b)=>a.event.start.localeCompare(b.event.start)||a.id.localeCompare(b.id));
 }
 function metrics(todo,today){
  const first=today.slice(0,4)+'-01-01',cutoff=pendingSince(today),inYear=d=>d>=first&&d<=today;
  const items=logicalItems(todo,true).filter(i=>!i.seriesMaster&&!i.sync?.externalDeleted&&calendarAllowed(i.google?.calendarId)&&(inYear(startDay(i,todo.timeZone))||inYear(startDay({event:i.original},todo.timeZone)))),eligible=items.filter(i=>!i.sync?.externalDeleted&&i.execution.status!=='canceled'),done=eligible.filter(i=>i.execution.status==='completed').length;
  return {planned:items.length,completed:done,pending:eligible.filter(i=>active(i)&&(startDay(i,todo.timeZone)>=cutoff||onDay(i,today,todo.timeZone))).length,canceled:items.filter(i=>!i.sync?.externalDeleted&&i.execution.status==='canceled').length,postponed:items.filter(i=>i.postponeCount>0).length,reschedules:items.reduce((n,i)=>n+i.postponeCount,0),backlog:view(todo,'pending',today).length,eligible:eligible.length,rate:eligible.length?Math.round(done/eligible.length*100):null};
 }
 function providerEvent(i){const p=i.pending;return {summary:(p.canceled?'[Cancelado] ':'')+p.event.title,description:p.event.description,start:p.event.allDay?{date:p.event.start}:{dateTime:p.event.start,timeZone:p.event.timeZone},end:p.event.allDay?{date:p.event.end}:{dateTime:p.event.end,timeZone:p.event.timeZone},...(p.event.recurrence?{recurrence:p.event.recurrence}:{}),...(p.event.reminders?{reminders:p.event.reminders}:{}),extendedProperties:{private:{constanciaId:i.id,constanciaOrigin:i.origin,constanciaCanceled:String(p.canceled),...(i.sleepPlanId?{constanciaSleepPlan:i.sleepPlanId}:{})}}};}
 function sameEvent(a,b){const recurrence=e=>(e.recurrence||[]).map(r=>r.split(';').sort().join(';')).sort().join('|'),reminders=e=>e.reminders?.useDefault===false?'custom|'+(e.reminders.overrides||[]).map(r=>r.method+':'+r.minutes).sort().join('|'):'default';return recurrence(a)===recurrence(b)&&reminders(a)===reminders(b)&&['title','description','allDay'].every(k=>a[k]===b[k])&&(a.allDay?a.start===b.start&&a.end===b.end:Date.parse(a.start)===Date.parse(b.start)&&Date.parse(a.end)===Date.parse(b.end));}
 function importEvent(todo,calendar,raw,id,at=new Date().toISOString()){
  let item=todo.items.find(i=>i.google?.calendarId===calendar.id&&i.google?.eventId===raw.id);
  if(!item&&raw.extendedProperties?.private?.constanciaId)item=todo.items.find(i=>i.id===raw.extendedProperties.private.constanciaId&&i.origin==='constancia'&&(!i.google.eventId||i.google.eventId===raw.id)&&(i.google.calendarId==='primary'&&calendar.primary||i.google.calendarId===calendar.id));
  if(raw.status==='cancelled'){
   const victims=raw.recurringEventId?(item?[item]:[]):todo.items.filter(i=>i.google?.calendarId===calendar.id&&(i.google?.eventId===raw.id||i.google?.recurringEventId===raw.id));
   for(const v of victims){if(!v.sync.externalDeleted){v.sync={...v.sync,externalDeleted:true,state:v.pending?'conflict':'synced',lastSync:at};if(v.pending)v.conflict={local:copy(v.pending.event),remote:null,reason:'deleted'};audit(todo,v,'external_deleted',v.event,{googleId:raw.id},at,'deleted-'+v.id+'-'+String(raw.updated||'deleted').replace(/[^a-zA-Z0-9]/g,''));}}return item;
  }
  if(!raw.start||!raw.end)return item;
  const marker=raw.extendedProperties?.private||{},event={title:String(raw.summary||'Sem título').replace(marker.constanciaCanceled==='true'?/^\[Cancelado\]\s*/:/^$/,''),description:String(raw.description||''),start:raw.start.date||raw.start.dateTime,end:raw.end.date||raw.end.dateTime,allDay:!!raw.start.date,timeZone:raw.start.timeZone||calendar.timeZone||todo.timeZone,...(raw.recurrence?{recurrence:copy(raw.recurrence)}:{}),...(raw.reminders?{reminders:{...copy(raw.reminders),overrides:copy(raw.reminders.overrides||[])}}:{})};schedule(event);
  if(!item){item={id,origin:marker.constanciaOrigin==='constancia'?'constancia':'google',event:copy(event),original:copy(event),google:{},execution:{status:'pending',completedAt:null,canceledAt:null,cancelReason:null,startedAt:null},postponeCount:0,sync:{}};todo.items.push(item);audit(todo,item,'imported',{},event,at,'import-'+id);}
  if(marker.constanciaSleepPlan){item.sleepPlanId=marker.constanciaSleepPlan;if(marker.constanciaCanceled==='true'&&item.execution.status!=='canceled')item.execution={...item.execution,status:'canceled',canceledAt:instant(raw.updated)?raw.updated:at};}if(raw.recurrence&&item.sleepPlanId)item.seriesMaster=true;
  // Re-reading an unchanged event must not rewrite a multi-megabyte private history.
  if(!item.pending&&!item.sync.externalDeleted&&raw.etag&&item.google.etag===raw.etag&&item.google.accountId===(calendar.accountId||item.google.accountId||null)&&item.google.primary===!!calendar.primary&&item.google.writable===['owner','writer'].includes(calendar.accessRole)&&item.google.iCalUID===(raw.iCalUID||item.google.iCalUID||null)&&sameEvent(item.event,event))return item;
  const before=copy(item.event);let conflict=false;
  if(item.pending){
   if(sameEvent(item.pending.event,event)&&item.pending.canceled===(marker.constanciaCanceled==='true'))delete item.pending;
   else if(item.pending.baseEtag&&item.pending.baseEtag!==raw.etag){if(sameEvent(item.pending.baseEvent||before,event)&&(item.pending.baseCanceled??item.google?.canceledMarker??false)===(marker.constanciaCanceled==='true')){item.pending.baseEtag=raw.etag;delete item.conflict;}else{item.conflict={local:copy(item.pending.event),remote:copy(event),reason:'edited'};conflict=true;}}
  }
  item.google={...item.google,calendarId:calendar.id,accountId:calendar.accountId||item.google.accountId||null,eventId:raw.id,etag:raw.etag||null,canceledMarker:marker.constanciaCanceled==='true',iCalUID:raw.iCalUID||item.google.iCalUID||null,primary:!!calendar.primary,recurringEventId:raw.recurringEventId||null,occurrence:raw.originalStartTime||null,writable:['owner','writer'].includes(calendar.accessRole)};
  item.event={...item.event,...copy(item.pending&&!conflict?item.pending.event:event)};item.sync={...item.sync,lastSync:at,externalDeleted:false,state:conflict?'conflict':item.pending?'pending':'synced'};
  if(!sameEvent(before,item.event)||before.timeZone!==item.event.timeZone)audit(todo,item,'google_updated',before,item.event,at,'google-'+id+'-'+String(raw.etag||raw.updated||at).replace(/[^a-zA-Z0-9]/g,''));
  return item;
 }
 root.ToDoCore={STATUSES,LABELS,seed,copy,validate,day,shift,localTime,fromLocal,schedule,create,setStatus,edit,resolve,active,calendarAllowed,calendarVisible,logicalItems,startDay,endDay,carryover,onDay,view,metrics,providerEvent,sameEvent,importEvent};
 if(typeof module!=='undefined')module.exports=root.ToDoCore;
})(typeof window!=='undefined'?window:globalThis);
