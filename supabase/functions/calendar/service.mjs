import '../../../todo-core.js';
const T=globalThis.ToDoCore;
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export const eventId=async(user,id)=>'c'+await digest(user+'|'+id);
export const itemId=async(calendar,e)=>'g-'+(await digest(calendar+'|'+e.id+'|'+JSON.stringify(e.originalStartTime||null))).slice(0,64);
export class ProviderError extends Error{constructor(status,message='Falha na agenda'){super(message);this.status=status;}}
// Injectable adapter: the test suite never calls a real Google calendar.
export async function synchronize({db,google,user,date,clock=()=>new Date().toISOString(),pageBudget=Infinity}){
 const lease=crypto.randomUUID(),at=clock(),deadline=Date.now()+40000,pause=Symbol('continue');let remaining=pageBudget,cursors={},calendars=[],connection;
 if(!await db.claim(lease))return {busy:true};
 const check=()=>{if(Date.now()>deadline)throw pause;};
 const take=()=>{check();if(remaining--<=0)throw pause;};
 const answer=partial=>({accountId:connection.account_id,connected:true,configured:true,reconnect:false,partial,lastSync:partial?connection.last_sync:clock(),calendars:calendars.map(({id,summary,primary,accessRole,timeZone})=>({id,summary,primary,accessRole,timeZone}))});
 async function change(fn){for(let attempt=0;attempt<6;attempt++){check();const row=await db.readState();if(!row?.state)throw Error('Vincule seu histórico antes de sincronizar a agenda.');const next=T.copy(row.state);next.todo??=T.seed();await fn(next.todo);T.validate(next.todo);check();if(JSON.stringify(next)===JSON.stringify(row.state))return next.todo;if(await db.saveState(row.revision,next))return next.todo;}throw Error('O histórico mudou em outro aparelho. Tente novamente.');}
 async function merge(calendar,events){return change(async todo=>{for(const e of events)T.importEvent(todo,calendar,e,await itemId(calendar.id,e),clock());});}
 const checkpoint=()=>db.saveConnection({cursors});
 try{
  connection=await db.connection();cursors=T.copy(connection.cursors||{});calendars=(await google.calendars()).filter(c=>T.calendarAllowed(c.id)).map(c=>({...c,accountId:connection.account_id}));
  const wanted=date||T.day(at),timeMin=T.shift(wanted,-366)+'T00:00:00Z',timeMax=T.shift(wanted,366)+'T23:59:59Z';
  const resumed=calendars.findIndex(c=>c.id===cursors.__constancia_next?.id),start=cursors.__constancia_next?.id==='__operations'?calendars.length:Math.max(0,resumed);
  for(let index=start;index<calendars.length;index++){
   const calendar=calendars[index];cursors.__constancia_next={id:calendar.id};check();
   const cursor=cursors[calendar.id]??={};let work=cursor.work;
   if(!work||work.date!==wanted){work=cursor.work={date:wanted,phase:'raw',token:cursor.token||null,page:null,expand:!cursor.token||wanted<cursor.min||wanted>cursor.max||cursor.fullDay!==T.day(at)||cursor.identityVersion!==2,rawSeen:[],seen:[]};}
   try{
    while(work.phase==='raw'){
     take();let result;try{result=await google.events(calendar.id,{singleEvents:false,showDeleted:true,maxResults:250,...work.token?{syncToken:work.token}:{},...work.page?{pageToken:work.page}:{}});}catch(e){if(e.status===410&&work.token){Object.assign(work,{token:null,page:null,expand:true,rawSeen:[],seen:[]});await checkpoint();continue;}throw e;}
     const events=result.items||[];if(events.some(e=>e.recurrence||e.recurringEventId))work.expand=true;
     for(const e of events)if(!e.recurrence)work.rawSeen.push(e.id);
     await merge(calendar,events.filter(e=>!e.recurrence||e.status==='cancelled'));work.page=result.nextPageToken||null;
     if(!work.page){if(result.nextSyncToken)cursor.token=result.nextSyncToken;work.phase=work.expand?'expand':'done';}
     await checkpoint();
    }
    while(work.phase==='expand'){
     take();const result=await google.events(calendar.id,{singleEvents:true,showDeleted:true,maxResults:250,timeMin,timeMax,...work.page?{pageToken:work.page}:{}});
     for(const e of result.items||[])work.seen.push(e.id);await merge(calendar,result.items||[]);work.page=result.nextPageToken||null;
     if(!work.page){const seen=new Set([...work.rawSeen,...work.seen]),row=await db.readState();work.missing=(row.state.todo?.items||[]).filter(i=>i.google?.calendarId===calendar.id&&i.google.eventId&&!seen.has(i.google.eventId)&&!i.sync?.externalDeleted&&i.event.start>=timeMin.slice(0,10)&&i.event.start<=timeMax.slice(0,10)).map(i=>i.google.eventId);work.verifyIndex=0;work.phase='verify';delete work.rawSeen;delete work.seen;}
     await checkpoint();
    }
    while(work.phase==='verify'&&work.verifyIndex<work.missing.length){
     take();const id=work.missing[work.verifyIndex];try{await merge(calendar,[await google.get(calendar.id,id)]);}catch(e){if([404,410].includes(e.status))await merge(calendar,[{id,status:'cancelled'}]);else throw e;}work.verifyIndex++;await checkpoint();
    }
    cursor.min=timeMin.slice(0,10);cursor.max=timeMax.slice(0,10);if(work.expand)cursor.fullDay=T.day(at);cursor.identityVersion=2;delete cursor.work;
    cursors.__constancia_next=index+1<calendars.length?{id:calendars[index+1].id}:{id:'__operations'};await checkpoint();
   }catch(e){if(e===pause)throw e;if([403,404].includes(e.status)){await change(todo=>{for(const i of todo.items)if(i.google?.calendarId===calendar.id)i.sync={...i.sync,state:'error',error:'Sem acesso a esta agenda; seu histórico foi preservado.'};});delete cursor.work;cursors.__constancia_next=index+1<calendars.length?{id:calendars[index+1].id}:{id:'__operations'};await checkpoint();continue;}throw e;}
  }
  cursors.__constancia_next={id:'__operations'};await checkpoint();
  await change(todo=>{for(const i of todo.items)if(i.pending&&!i.pending.accountId&&!i.google?.accountId){i.pending.accountId=connection.account_id;i.google.accountId=connection.account_id;}});
  const row=await db.readState(),operations=(row.state.todo?.items||[]).filter(i=>i.pending&&!i.conflict&&!i.sync?.externalDeleted);
  for(const snapshot of operations){
   take();const primary=calendars.find(c=>c.primary),calendar=calendars.find(c=>c.id===snapshot.google.calendarId)||(snapshot.google.calendarId==='primary'?primary:null);
   const op=snapshot.pending.operationId;
   if(snapshot.pending.accountId!==connection.account_id||!calendar||!['owner','writer'].includes(calendar.accessRole)){
    await change(todo=>{const i=todo.items.find(i=>i.id===snapshot.id);if(i?.pending?.operationId===op)i.sync={...i.sync,state:'error',error:snapshot.pending.accountId!==connection.account_id?'O compromisso pertence a outra conta Google. Reconecte a conta original.':'Esta agenda não permite edição. A execução foi salva no Constância.'};});continue;
   }
   let result;
   try{
    const body=T.providerEvent(snapshot);
    if(snapshot.pending.kind==='create'){
     const id=await eventId(user,snapshot.id);
     try{result=await google.insert(calendar.id,{...body,id});}
     catch(e){if(e.status!==409)throw e;result=await google.get(calendar.id,id);if(result.extendedProperties?.private?.constanciaId!==snapshot.id)throw new ProviderError(409,'Identificação de evento em conflito.');}
    }else{
     const remote=await google.get(calendar.id,snapshot.google.eventId);
     if(remote.status==='cancelled'){await merge(calendar,[remote]);continue;}
     if(!snapshot.pending.baseEtag||remote.etag!==snapshot.pending.baseEtag){await merge(calendar,[remote]);continue;}
     body.extendedProperties={...remote.extendedProperties,private:{...remote.extendedProperties?.private,...body.extendedProperties.private}};
     result=await google.patch(calendar.id,snapshot.google.eventId,body,snapshot.pending.baseEtag);
    }
    await change(async todo=>{
     const i=todo.items.find(i=>i.id===snapshot.id);if(!i)return;
     const newer=i.pending&&i.pending.operationId!==op,preserved=newer?T.copy(i.pending):null;
     T.importEvent(todo,calendar,result,await itemId(calendar.id,result),clock());
     if(newer){i.pending={...preserved,kind:'patch',baseEtag:result.etag};i.event=T.copy(preserved.event);delete i.conflict;i.sync.state='pending';}
     else if(i.pending?.operationId===op){i.conflict={local:T.copy(i.pending.event),remote:T.copy(i.event),reason:'edited'};i.sync.state='conflict';}
     delete i.sync.error;
    });
   }catch(e){
    if(e.status===412){await merge(calendar,[await google.get(calendar.id,snapshot.google.eventId)]);continue;}
    if([404,410].includes(e.status)&&snapshot.google.eventId){await merge(calendar,[{id:snapshot.google.eventId,status:'cancelled'}]);continue;}
    await change(todo=>{const i=todo.items.find(i=>i.id===snapshot.id);if(i?.pending?.operationId===op)i.sync={...i.sync,state:'error',error:e.status===401?'A autorização expirou. Reconecte sua conta Google.':'Não foi possível enviar. O registro está protegido; tente sincronizar novamente.'};});
    if(e.status===401)throw e;
   }
  }
  cursors.__constancia_next=null;await db.saveConnection({cursors,last_sync:clock()});
  return answer(false);
 }catch(e){if(e!==pause)throw e;await checkpoint();return answer(true);}finally{await db.release(lease);}
}
