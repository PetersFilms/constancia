import '../../../todo-core.js';
const T=globalThis.ToDoCore;
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export const eventId=async(user,id)=>'c'+await digest(user+'|'+id);
export const itemId=async(calendar,e)=>'g-'+(await digest(calendar+'|'+e.id+'|'+JSON.stringify(e.originalStartTime||null))).slice(0,64);
export class ProviderError extends Error{constructor(status,message='Falha na agenda'){super(message);this.status=status;}}
// Injectable adapter: the test suite never calls a real Google calendar.
export async function synchronize({db,google,user,date,clock=()=>new Date().toISOString(),pageBudget=Infinity,noticeVersion=0,refresh=false}){
 const lease=crypto.randomUUID(),at=clock(),pause=Symbol('continue');let remaining=pageBudget,cursors={},calendars=[],connection,jobNoticeVersion=noticeVersion;
 if(!await db.claim(lease))return {busy:true};
 // O prazo conta a partir da trava: a espera pelo claim não pode comer o tempo do lote. Trava (15s) + prazo (70s) + uma
 // leitura/gravação do histórico iniciada no limite (60s) ficam abaixo dos 150s da Edge Function.
 const t0=Date.now(),deadline=t0+70000;
 const check=()=>{if(Date.now()>deadline)throw pause;};
 const take=()=>{check();if(remaining--<=0)throw pause;};
 const answer=partial=>({accountId:connection.account_id,connected:true,configured:true,reconnect:false,partial,calendarSyncedVersion:jobNoticeVersion,lastSync:partial?connection.last_sync:clock(),calendars:calendars.map(({id,summary,primary,accessRole,timeZone})=>({id,summary,primary,accessRole,timeZone}))});
 // O histórico tem megabytes: cada execução lê a cópia completa uma vez e a reusa. Uma gravação
 // aceita atualiza o cache; uma recusada o invalida, e a tentativa seguinte relê a revisão nova.
 let stateCache=null;
 const readState=async()=>stateCache??=await db.readState();
 async function change(fn){for(let attempt=0;attempt<6;attempt++){check();const row=await readState();if(!row?.state)throw Error('Vincule seu histórico antes de sincronizar a agenda.');const next=T.copy(row.state);next.todo??=T.seed();await fn(next.todo);T.validate(next.todo);check();if(JSON.stringify(next)===JSON.stringify(row.state))return next.todo;if(await db.saveState(row.revision,next)){stateCache={state:next,revision:row.revision+1};return next.todo;}stateCache=null;}throw Error('O histórico mudou em outro aparelho. Tente novamente.');}
 async function merge(calendar,events){return change(async todo=>{for(const e of events)T.importEvent(todo,calendar,e,await itemId(calendar.id,e),clock());});}
 const checkpoint=()=>db.saveConnection({cursors});
 try{
  connection=await db.connection();cursors=T.copy(connection.cursors||{});cursors.__constancia_diag={start:new Date(t0).toISOString(),ops:0};jobNoticeVersion=cursors.__constancia_notice_version??noticeVersion;cursors.__constancia_notice_version=jobNoticeVersion;calendars=(await google.calendars()).filter(c=>T.calendarAllowed(c.id)).map(c=>({...c,accountId:connection.account_id}));
  // Conflict resolution may discard imports the sync token already acknowledged; one expansion pass re-reads them while keeping tokens and identityVersion.
  if(refresh){for(const [id,cursor] of Object.entries(cursors))if(!id.startsWith('__')&&cursor&&typeof cursor==='object'){delete cursor.fullDay;delete cursor.work;}cursors.__constancia_next=null;await checkpoint();}
  // Janela enxuta: alterações no Google chegam no máximo 1 dia para trás; itens mais antigos ficam no estado e nunca são verificados nem marcados como apagados.
  const wanted=date||T.day(at),timeMin=T.shift(wanted,-1)+'T00:00:00Z',timeMax=T.shift(wanted,366)+'T23:59:59Z';
  const resumed=calendars.findIndex(c=>c.id===cursors.__constancia_next?.id),start=cursors.__constancia_next?.id==='__operations'?calendars.length:Math.max(0,resumed);
  for(let index=start;index<calendars.length;index++){
   const calendar=calendars[index];cursors.__constancia_next={id:calendar.id};check();
   const cursor=cursors[calendar.id]??={};let work=cursor.work;
   if(!work||work.date!==wanted||work.min!==timeMin){work=cursor.work={date:wanted,min:timeMin,phase:'raw',token:cursor.token||null,page:null,expand:!cursor.token||wanted<cursor.min||wanted>cursor.max||cursor.fullDay!==T.day(at)||cursor.identityVersion!==2,rawSeen:[],seen:[]};}
   try{
    while(work.phase==='raw'){
     take();let result;try{result=await google.events(calendar.id,{singleEvents:false,showDeleted:true,maxResults:250,...work.token?{syncToken:work.token}:{timeMin,timeMax},...work.page?{pageToken:work.page}:{}});}catch(e){if(e.status===410&&work.token){Object.assign(work,{token:null,page:null,expand:true,rawSeen:[],seen:[]});await checkpoint();continue;}throw e;}
     const events=result.items||[];if(events.some(e=>e.recurrence||e.recurringEventId))work.expand=true;
     for(const e of events)if(!e.recurrence)work.rawSeen.push(e.id);
     await merge(calendar,events.filter(e=>!e.recurrence||e.status==='cancelled'||e.extendedProperties?.private?.constanciaSleepPlan));work.page=result.nextPageToken||null;
     if(!work.page){if(result.nextSyncToken)cursor.token=result.nextSyncToken;work.phase=work.expand?'expand':'done';}
     await checkpoint();
    }
    while(work.phase==='expand'){
     take();const result=await google.events(calendar.id,{singleEvents:true,showDeleted:true,maxResults:250,timeMin,timeMax,...work.page?{pageToken:work.page}:{}});
     for(const e of result.items||[])work.seen.push(e.id);await merge(calendar,result.items||[]);work.page=result.nextPageToken||null;
     if(!work.page){const seen=new Set([...work.rawSeen,...work.seen]),row=await readState();work.missing=(row.state.todo?.items||[]).filter(i=>i.google?.calendarId===calendar.id&&i.google.eventId&&!seen.has(i.google.eventId)&&!i.sync?.externalDeleted&&i.event.start>=timeMin.slice(0,10)&&i.event.start<=timeMax.slice(0,10)).map(i=>i.google.eventId);work.verifyIndex=0;work.phase='verify';delete work.rawSeen;delete work.seen;}
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
  // Pedido do Pedro (05/11/2026): operações de compromissos anteriores à janela (mais de 1 dia atrás) não vão mais ao Google;
  // a execução marcada no app fica. Conflitos ficam para revisão manual. Séries (Sono) começam no passado mas valem adiante e o
  // encerramento da antiga precede a substituta: nunca são descartadas. Mesma gravação do ajuste de conta, sem custo extra.
  const windowStart=timeMin.slice(0,10);
  await change(todo=>{for(const i of todo.items){if(!i.conflict&&!i.seriesMaster&&!i.sleepPlanId&&(i.event?.start||'').slice(0,10)<windowStart&&(i.pending||i.sync?.state==='error')){delete i.pending;i.sync={...i.sync,state:'synced'};delete i.sync.error;continue;}if(i.pending&&!i.pending.accountId&&!i.google?.accountId){i.pending.accountId=connection.account_id;i.google.accountId=connection.account_id;}}});
  const row=await readState(),queue=(row.state.todo?.items||[]).filter(i=>i.pending&&!i.conflict&&!i.sync?.externalDeleted);
  // Diagnóstico: ms desde a trava até a fila começar e quantas operações cada lote tentou (sai no cursor, sem dado pessoal).
  cursors.__constancia_diag.queueAt=Date.now()-t0;cursors.__constancia_diag.queued=queue.length;
  // Rodízio: retoma após a última operação que gastou orçamento; com pageBudget pequeno, uma operação presa no início da fila esfomearia as novas para sempre.
  const rotate=queue.findIndex(i=>i.pending.operationId===cursors.__constancia_op_after)+1,operations=[...queue.slice(rotate),...queue.slice(0,rotate)];
  for(const queued of operations){
   take();cursors.__constancia_op_after=queued.pending.operationId;cursors.__constancia_diag.ops++;cursors.__constancia_diag.lastOpAt=Date.now()-t0;let snapshot=(await readState()).state.todo?.items.find(i=>i.id===queued.id);if(!snapshot?.pending||snapshot.conflict||snapshot.sync?.externalDeleted)continue;if(snapshot.pending.dependsOn?.length){const latest=await readState();if(snapshot.pending.dependsOn.some(id=>{const i=latest.state.todo.items.find(i=>i.id===id);return i?.pending||i?.conflict;}))continue;}const primary=calendars.find(c=>c.primary),calendar=calendars.find(c=>c.id===snapshot.google.calendarId)||(snapshot.google.calendarId==='primary'?primary:null);
   let op=snapshot.pending.operationId;
   if(snapshot.pending.accountId!==connection.account_id||!calendar||!['owner','writer'].includes(calendar.accessRole)){
    await change(todo=>{const i=todo.items.find(i=>i.id===snapshot.id);if(i?.pending?.operationId===op)i.sync={...i.sync,state:'error',error:snapshot.pending.accountId!==connection.account_id?'O compromisso pertence a outra conta Google. Reconecte a conta original.':'Esta agenda não permite edição. A execução foi salva no Constância.'};});continue;
   }
   let result;
   try{
    // A persistent provider identity always wins over an old outbox kind.
    let remote=null,target=snapshot.google.eventId;
    if(target){remote=await google.get(calendar.id,target);}
    else{
     const stableId=await eventId(user,snapshot.id);
     try{remote=await google.get(calendar.id,stableId);}catch(e){if(e.status!==404)throw e;}
     if(remote&&remote.extendedProperties?.private?.constanciaId!==snapshot.id)throw new ProviderError(409,'Identificação de evento em conflito.');
     if(!remote){
      // Recover older/missing associations by the exact private task marker, never by title.
      let page='',matches=[];do{check();const found=await google.events(calendar.id,{privateExtendedProperty:'constanciaId='+snapshot.id,singleEvents:false,showDeleted:true,maxResults:250,...page?{pageToken:page}:{}});matches.push(...(found.items||[]).filter(e=>e.extendedProperties?.private?.constanciaId===snapshot.id&&!e.recurringEventId));page=found.nextPageToken||'';}while(page);
      if(matches.length>1){await change(todo=>{const i=todo.items.find(i=>i.id===snapshot.id);if(i?.pending?.operationId===op)i.sync={...i.sync,state:'error',error:'Há mais de um evento com o vínculo desta tarefa. Revise as cópias no Google Agenda antes de reenviar.'};});continue;}
      remote=matches[0]||null;
     }
     if(remote)target=remote.id;
     else if(snapshot.pending.kind!=='create')throw new ProviderError(409,'O vínculo deste evento precisa ser revisado. Nenhum novo evento foi criado.');
    }
    if(remote){
     await merge(calendar,[remote]);
     snapshot=(await readState()).state.todo.items.find(i=>i.id===queued.id);
     if(!snapshot?.pending||snapshot.conflict||snapshot.sync?.externalDeleted)continue;
     op=snapshot.pending.operationId;
     if(remote.status==='cancelled')continue;
     if(!snapshot.pending.baseEtag||snapshot.pending.baseEtag!==remote.etag)continue;
     const body=T.providerEvent(snapshot);body.extendedProperties={...remote.extendedProperties,private:{...remote.extendedProperties?.private,...body.extendedProperties.private}};
     // Esmaecido ao concluir: guarda a cor original do evento uma vez e a devolve ao desmarcar (null limpa campo e marcador no PATCH).
     const priv=body.extendedProperties.private;
     if(snapshot.pending.completed){if(priv.constanciaColor==null)priv.constanciaColor=remote.colorId||'';}
     else if(priv.constanciaColor!=null){body.colorId=priv.constanciaColor||null;priv.constanciaColor=null;}
     result=await google.patch(calendar.id,target,body,remote.etag);
    }else{
     const id=await eventId(user,snapshot.id),body=T.providerEvent(snapshot);if(snapshot.pending.completed)body.extendedProperties.private.constanciaColor='';
     try{result=await google.insert(calendar.id,{...body,id});}
     catch(e){if(e.status!==409)throw e;const found=await google.get(calendar.id,id);if(found.extendedProperties?.private?.constanciaId!==snapshot.id)throw new ProviderError(409,'Identificação de evento em conflito.');await merge(calendar,[found]);continue;}
    }
    await change(async todo=>{
     const i=todo.items.find(i=>i.id===snapshot.id);if(!i)return;
     const newer=i.pending&&i.pending.operationId!==op,preserved=newer?T.copy(i.pending):null;
     T.importEvent(todo,calendar,result,await itemId(calendar.id,result),clock());
     if(newer){i.pending={...preserved,kind:'patch',baseEtag:result.etag,baseEvent:T.copy(snapshot.pending.event),baseCanceled:snapshot.pending.canceled,baseCompleted:snapshot.pending.completed??false,baseInProgress:snapshot.pending.inProgress??false};i.event=T.copy(preserved.event);delete i.conflict;i.sync.state='pending';}
     else if(i.pending?.operationId===op){i.conflict={local:T.copy(i.pending.event),remote:T.copy(i.event),reason:'edited'};i.sync.state='conflict';}
     delete i.sync.error;
    });
   }catch(e){
    if(e===pause)throw e;
    if(e.status===412){await merge(calendar,[await google.get(calendar.id,snapshot.google.eventId)]);continue;}
    if([404,410].includes(e.status)&&snapshot.google.eventId){await merge(calendar,[{id:snapshot.google.eventId,status:'cancelled'}]);continue;}
    await change(todo=>{const i=todo.items.find(i=>i.id===snapshot.id);if(i?.pending?.operationId===op)i.sync={...i.sync,state:'error',error:e.status===401?'A autorização expirou. Reconecte sua conta Google.':e.status===409?e.message:'Não foi possível enviar. O registro está protegido; tente sincronizar novamente.'};});
    if(e.status===401)throw e;
   }
  }
  cursors.__constancia_next=null;delete cursors.__constancia_notice_version;await db.saveConnection({cursors,last_sync:clock()});
  return answer(false);
 }catch(e){
  if(e!==pause){
   // Na fase da fila o cursor só carrega rodízio e diagnóstico; gravar o motivo da falha ali não arrisca progresso parcial de importação.
   if(cursors.__constancia_next?.id==='__operations'&&cursors.__constancia_diag){cursors.__constancia_diag.endAt=Date.now()-t0;cursors.__constancia_diag.error=String(e?.name||'Error')+':'+String(e?.status??'').slice(0,6);await checkpoint().catch(()=>{});}
   throw e;
  }
  cursors.__constancia_diag.endAt=Date.now()-t0;await checkpoint();return answer(true);
 }finally{await db.release(lease);}
}
