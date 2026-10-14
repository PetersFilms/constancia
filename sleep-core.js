(function(root){
 'use strict';
 const T=root.ToDoCore||require('./todo-core.js'),copy=x=>JSON.parse(JSON.stringify(x)),uuid=()=>root.crypto.randomUUID();
 const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],rrdays=['SU','MO','TU','WE','TH','FR','SA'];
 const instant=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&validDate(x.slice(0,10))&&time(x.slice(11,16))&&+x.slice(17,19)<60&&Number.isFinite(Date.parse(x)),validDate=x=>{try{return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&T.shift(x,0)===x;}catch{return false;}};
 const overrides=w=>Object.fromEntries(Object.entries(w||{}).filter(([,v])=>v!=null));
 const time=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x),num=(v,a,b)=>v==null||typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 const nowDay=(z='America/Sao_Paulo')=>T.day(new Date().toISOString(),z);
 const seed=()=>({version:1,records:[],settings:{timeZone:'America/Sao_Paulo',goalMinutes:480,wakeTime:null,latencyMinutes:15,bedTime:null,days:[0,1,2,3,4,5,6],byWeekday:{},reminderMinutes:null},settingsVersions:[],plans:[],history:[]});
 function settings(v){
  try{new Intl.DateTimeFormat('en',{timeZone:v.timeZone});}catch{throw Error('Fuso do sono inválido.');}
  if(!v||!num(v.goalMinutes,60,1080)||v.goalMinutes==null||!num(v.latencyMinutes,0,240)||v.latencyMinutes==null||v.wakeTime!=null&&!time(v.wakeTime)||v.bedTime!=null&&!time(v.bedTime)||!Array.isArray(v.days)||!v.days.length||new Set(v.days).size!==v.days.length||v.days.some(d=>!Number.isInteger(d)||d<0||d>6)||!num(v.reminderMinutes,0,40320)||v.reminderMinutes!=null&&!Number.isInteger(v.reminderMinutes))throw Error('Configuração do sono inválida.');
  if(!v.byWeekday||typeof v.byWeekday!=='object'||Array.isArray(v.byWeekday))throw Error('Dias do sono inválidos.');
  for(const [k,w]of Object.entries(v.byWeekday)){if(!/^[0-6]$/.test(k)||!w||w.wakeTime!=null&&!time(w.wakeTime)||!num(w.goalMinutes,60,1080)||!num(w.latencyMinutes,0,240))throw Error('Horários da semana inválidos.');}
  return v;
 }
 function configured(s,d){const w=new Date(d+'T12:00:00Z').getUTCDay();return {...s.settings,...overrides(s.settings.byWeekday[w]),weekday:w};}
 function goalAt(s,date){const versions=s.settingsVersions.filter(v=>v.effectiveDate<=date).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.at.localeCompare(b.at));const v=versions.at(-1)?.settings||{...seed().settings,timeZone:s.settings.timeZone};return {...v,...overrides(v.byWeekday?.[new Date(date+'T12:00:00Z').getUTCDay()])};}
 function audit(s,type,target,before,after,at){s.history.push({id:uuid(),type,target,at,before:copy(before),after:copy(after)});}
 function configure(s,changes,effectiveDate=nowDay(s.settings.timeZone),at=new Date().toISOString()){
  const before=copy(s.settings),next={...before,...changes,byWeekday:{...before.byWeekday,...changes.byWeekday}};settings(next);if(!validDate(effectiveDate))throw Error('Data da meta inválida.');
  s.settings=next;s.settingsVersions.push({id:uuid(),effectiveDate,at,settings:copy(next)});audit(s,'settings','settings',before,next,at);return next;
 }
 function calculate(r){
  if(!instant(r.attemptAt)||!instant(r.wakeAt)||!validDate(r.date)||T.day(r.wakeAt,r.timeZone)!==r.date)throw Error('A data deve corresponder ao dia em que você acordou.');
  const opportunity=Math.round((Date.parse(r.wakeAt)-Date.parse(r.attemptAt))/60000);
  if(opportunity<=0||opportunity>2160)throw Error('O despertar deve ocorrer após a tentativa de dormir, em até 36 horas.');
  if(!num(r.latencyMinutes,0,1440)||!num(r.awakeMinutes,0,1440)||!num(r.awakenings,0,100)||r.awakenings!=null&&!Number.isInteger(r.awakenings))throw Error('Tempos e despertares inválidos.');
  const deductions=(r.latencyMinutes??0)+(r.awakeMinutes??0);if(deductions>opportunity)throw Error('O tempo para adormecer e acordado não pode superar o intervalo da noite.');
  if(r.bedAt!=null&&(!instant(r.bedAt)||Date.parse(r.bedAt)>Date.parse(r.attemptAt)))throw Error('A entrada na cama deve ocorrer antes da tentativa de dormir.');
  if(r.outOfBedAt!=null&&(!instant(r.outOfBedAt)||Date.parse(r.outOfBedAt)<Date.parse(r.wakeAt)))throw Error('A saída da cama deve ocorrer após o despertar.');
  const bedMinutes=r.bedAt&&r.outOfBedAt?Math.round((Date.parse(r.outOfBedAt)-Date.parse(r.bedAt))/60000):null;
  if(bedMinutes!=null&&bedMinutes>2880)throw Error('Confira as datas de entrada e saída da cama.');
  return {opportunityMinutes:opportunity,estimatedMinutes:opportunity-deductions,bedMinutes,incompleteEstimate:r.latencyMinutes==null||r.awakeMinutes==null};
 }
 function saveRecord(s,input,at=new Date().toISOString()){
  if(!validDate(input.date)||input.date>nowDay(input.timeZone||s.settings.timeZone)||Date.parse(input.wakeAt)>Date.parse(at))throw Error('Registre uma noite já encerrada.');
  const old=s.records.find(r=>r.date===input.date),g=old?.goal||goalAt(s,input.date),p=old?.planned||planned(s,null,input.date);
  const r={...old,...input,id:old?.id||uuid(),timeZone:input.timeZone||s.settings.timeZone,kind:old?.kind||'night',source:old?.source||'manual',goal:copy(g),planned:p?{start:p.start,end:p.end,goalMinutes:p.goalMinutes}:null,createdAt:old?.createdAt||at,updatedAt:at};
  Object.assign(r,calculate(r));record(r);if(old)s.records[s.records.indexOf(old)]=r;else s.records.push(r);audit(s,'record',r.id,old||{},r,at);return r;
 }
 function record(r){
  calculate(r);if(!r.id||typeof r.id!=='string'||!num(r.quality,1,5)||!num(r.energy,1,5)||[r.quality,r.energy].some(v=>v!=null&&!Number.isInteger(v))||typeof(r.notes||'')!=='string'||(r.notes||'').length>4000||!r.goal||!num(r.goal.goalMinutes,60,1080)||r.goal.goalMinutes==null||!instant(r.createdAt)||!instant(r.updatedAt))throw Error('Registro de sono inválido.');return r;
 }
 function validate(s){
  if(!s||s.version!==1)throw Error('Histórico do sono inválido.');settings(s.settings);
  for(const k of ['records','settingsVersions','plans','history']){if(!Array.isArray(s[k])||s[k].length>(k==='history'?50000:10000))throw Error('Coleção do sono inválida.');const seen=new Set();for(const x of s[k]){const id=k==='records'?x.date:x.id;if(!id||seen.has(id))throw Error('Registro de sono duplicado.');seen.add(id);}}
  s.records.forEach(record);for(const v of s.settingsVersions){if(!validDate(v.effectiveDate)||!instant(v.at))throw Error('Versão de meta inválida.');settings(v.settings);}
  for(const p of s.plans)if(p.seriesDays&&(!Array.isArray(p.seriesDays)||!p.seriesDays.length||p.seriesDays.some(d=>!Number.isInteger(d)||d<0||d>6)||!validDate(p.until)||p.until<p.date||!time(p.wakeTime))||!validDate(p.date)||!instant(p.start)||!instant(p.end)||Date.parse(p.end)<=Date.parse(p.start)||!num(p.goalMinutes,60,1080)||p.goalMinutes==null||!instant(p.createdAt)||!instant(p.updatedAt))throw Error('Planejamento de sono inválido.');
  for(const h of s.history)if(!instant(h.at)||typeof h.type!=='string')throw Error('Histórico de alterações inválido.');return s;
 }
 function suggest(s,d){
  const c=configured(s,d);if(!c.wakeTime)return null;const end=T.fromLocal(d,c.wakeTime,c.timeZone),start=new Date(Date.parse(end)-(c.goalMinutes+c.latencyMinutes)*60000).toISOString();
  return {date:d,start,end,timeZone:c.timeZone,goalMinutes:c.goalMinutes,latencyMinutes:c.latencyMinutes,suggested:true};
 }
 function linked(s,todo,p,d){
  if(!todo||!p.itemId)return p;let i=todo.items.find(i=>i.id===p.itemId);
  if(p.seriesId){const occurrence=todo.items.find(i=>!i.seriesMaster&&i.sleepPlanId===p.seriesId&&T.day(i.event.end,i.event.timeZone)===d);if(occurrence)i=occurrence;else if(p.state==='superseded')return null;}
  if(!i)return {...p,syncState:'pending'};if(i.sync?.externalDeleted||i.execution.status==='canceled')return {...p,state:'canceled',syncState:i.sync?.state||'synced'};
  return {...p,...(!i.seriesMaster&&!p.localOverride?{start:i.event.start,end:i.event.end}:{}),syncState:i.sync?.state||'pending',eventId:i.google?.eventId||null,itemId:i.id};
 }
 function planned(s,todo,d){const own=s.plans.filter(p=>p.date===d&&p.state!=='superseded').at(-1);if(own)return linked(s,todo,own,d);
  const series=s.plans.filter(p=>p.seriesDays&&p.date<=d&&p.until>=d&&p.seriesDays.includes(new Date(d+'T12:00:00Z').getUTCDay())&&p.state!=='superseded').at(-1);if(!series)return null;
  const end=T.fromLocal(d,series.wakeTime,series.timeZone),start=new Date(Date.parse(end)-(series.goalMinutes+series.latencyMinutes)*60000).toISOString();return linked(s,todo,{...series,date:d,start,end},d);
 }
 function setPlan(s,input,at=new Date().toISOString()){
  const old=s.plans.find(p=>p.date===input.date&&!p.seriesDays&&p.state!=='superseded'),p={...old,...input,id:old?.id||uuid(),createdAt:old?.createdAt||at,updatedAt:at,state:'planned',localOverride:true};
  if(!instant(p.start)||!instant(p.end)||Date.parse(p.end)<=Date.parse(p.start)||T.day(p.end,p.timeZone)!==p.date)throw Error('Confira as datas e horários do planejamento.');
  if(old)s.plans[s.plans.indexOf(old)]=p;else s.plans.push(p);audit(s,'plan',p.id,old||{},p,at);return p;
 }
 function endSeries(s,todo,id,at=new Date().toISOString()){
  const p=s.plans.find(p=>p.id===id&&p.seriesDays);if(!p)throw Error('Planejamento recorrente não encontrado.');const i=todo.items.find(i=>i.id===p.itemId);const before=copy(p);
  if(i&&!i.sync?.externalDeleted){if(Date.parse(i.event.start)>=Date.parse(at))T.setStatus(todo,i.id,'canceled',null,at);else{const cutoff=new Date(Date.parse(at)-1000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');T.edit(todo,i.id,{...i.event,recurrence:i.event.recurrence.map(rule=>rule.replace(/;UNTIL=[^;]*/,'').replace(/;COUNT=[^;]*/,'')+';UNTIL='+cutoff)},false,at);}}
  p.state='superseded';p.endedAt=at;p.updatedAt=at;audit(s,'series_ended',p.id,before,p,at);return p;
 }
 function description(p){return 'Descanso planejado no Constância. Meta: '+p.goalMinutes+' minutos; margem para adormecer: '+p.latencyMinutes+' minutos. Este evento reserva tempo e não representa sono efetivamente registrado.';}
 function exportPlan(s,todo,p,calendarId,accountId,at=new Date().toISOString()){
  if(p.state==='canceled')throw Error('Este planejamento foi cancelado ou excluído na agenda. Crie outro planejamento explicitamente.');
  const existing=todo.items.find(i=>i.id===p.itemId),event={title:'Sono — Descanso planejado',description:description(p),allDay:false,start:p.start,end:p.end,timeZone:p.timeZone,reminders:{useDefault:false,overrides:s.settings.reminderMinutes==null?[]:[{method:'popup',minutes:s.settings.reminderMinutes}]}};
  let item;if(existing){if(existing.seriesMaster)throw Error('Escolha editar esta ocorrência ou atualizar os próximos horários.');T.edit(todo,existing.id,event,false,at);item=existing;}
  else{item=T.create(todo,event,at,calendarId,accountId);item.sleepPlanId=p.id;}
  p.itemId=item.id;p.localOverride=false;p.calendarId=calendarId;p.updatedAt=at;p.syncState='pending';audit(s,'calendar',p.id,{}, {itemId:item.id,calendarId},at);return item;
 }
 function exportSeries(s,todo,{date,until,days,calendarId,accountId,replace=false},at=new Date().toISOString()){
  if(!validDate(date)||!validDate(until)||until<date||until>T.shift(date,366)||!Array.isArray(days)||!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Escolha os dias e um período de até um ano.');
  const existing=s.plans.filter(p=>p.seriesDays&&p.calendarId===calendarId&&p.state!=='superseded'&&p.until>=date&&linked(s,todo,p,p.date)?.state!=='canceled'),dependencies=[];
  if(existing.length&&!replace)return existing.map(p=>todo.items.find(i=>i.id===p.itemId)).filter(Boolean);
  if(replace)for(const p of existing){const i=todo.items.find(i=>i.id===p.itemId);if(i&&!i.sync?.externalDeleted){
    if(Date.parse(i.event.start)>=Date.parse(at))T.setStatus(todo,i.id,'canceled',null,at);
    else{const untilUTC=new Date(Date.parse(at)-1000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const e={...i.event,recurrence:i.event.recurrence.map(rule=>rule.replace(/;UNTIL=[^;]*/,'').replace(/;COUNT=[^;]*/,'')+';UNTIL='+untilUTC)};T.edit(todo,i.id,e,false,at);}
    dependencies.push(i.id);
   }p.state='superseded';p.updatedAt=at;audit(s,'series_replaced',p.id,{}, {date,until},at);}
  const groups=new Map();for(const w of [...new Set(days)]){let first=date;while(new Date(first+'T12:00:00Z').getUTCDay()!==w)first=T.shift(first,1);if(first>until)continue;const c=configured(s,first);if(!c.wakeTime)throw Error('Defina o horário de despertar para os dias selecionados.');const k=[c.wakeTime,c.goalMinutes,c.latencyMinutes].join('|');if(!groups.has(k))groups.set(k,{c,days:[],first});const g=groups.get(k);g.days.push(w);if(first<g.first)g.first=first;}
  const created=[];for(const {c,days:ws,first}of groups.values()){
   const raw=suggest(s,first);if(Date.parse(raw.start)<=Date.parse(at))throw Error('A primeira noite precisa começar no futuro.');
   const p={...raw,id:uuid(),seriesId:null,seriesDays:ws,until,wakeTime:c.wakeTime,calendarId,state:'planned',createdAt:at,updatedAt:at};p.seriesId=p.id;
   const startDays=ws.map(w=>(w+(T.day(p.start,c.timeZone)===p.date?0:6))%7),endLimit=new Date(Date.parse(T.fromLocal(until,c.wakeTime,c.timeZone))-(c.goalMinutes+c.latencyMinutes)*60000+1000).toISOString(),rule='RRULE:FREQ=WEEKLY;BYDAY='+startDays.map(w=>rrdays[w]).join(',')+';UNTIL='+new Date(Date.parse(endLimit)-1000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
   const event={title:'Sono — Descanso planejado',description:description(p),allDay:false,start:p.start,end:p.end,timeZone:p.timeZone,recurrence:[rule],reminders:{useDefault:false,overrides:s.settings.reminderMinutes==null?[]:[{method:'popup',minutes:s.settings.reminderMinutes}]}};
   const i=T.create(todo,event,at,calendarId,accountId);i.sleepPlanId=p.id;i.seriesMaster=true;if(dependencies.length)i.pending.dependsOn=dependencies;p.itemId=i.id;p.syncState='pending';s.plans.push(p);created.push(i);audit(s,'series',p.id,{},p,at);
  }return created;
 }
 function conflicts(todo,p,ignored=[]){
  if(!p)return[];const result=[];for(const i of T.logicalItems(todo,true)){if(i.seriesMaster||i.sleepPlanId||i.sync?.externalDeleted||i.execution.status==='canceled'||ignored.includes(i.id))continue;
   const a=i.event.allDay?Date.parse(T.fromLocal(i.event.start,'00:00',p.timeZone)):Date.parse(i.event.start),b=i.event.allDay?Date.parse(T.fromLocal(i.event.end,'00:00',p.timeZone)):Date.parse(i.event.end),start=Date.parse(p.start),end=Date.parse(p.end),overlap=a<end&&b>start,near=!overlap&&((b<=start&&b>=start-60*60000)||(a>=end&&a<=end+30*60000));
   if(overlap||near)result.push({id:i.id,title:i.event.title,start:i.event.start,end:i.event.end,allDay:i.event.allDay,type:overlap?'overlap':'near'});
  }return result;
 }
 const duration=n=>n==null?'—':Math.floor(Math.round(Math.abs(n))/60)+'h'+String(Math.round(Math.abs(n))%60).padStart(2,'0');
 const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 const minutes=(at,z)=>{const t=T.localTime(at,z);return +t.slice(0,2)*60+ +t.slice(3);};
 const circleDiff=(a,b)=>((a-b+2160)%1440)-720;
 function circular(values){if(!values.length)return{mean:null,deviation:null};const x=mean(values.map(v=>Math.cos(v/1440*2*Math.PI))),y=mean(values.map(v=>Math.sin(v/1440*2*Math.PI))),m=(Math.atan2(y,x)*1440/(2*Math.PI)+1440)%1440;return{mean:m,deviation:Math.sqrt(mean(values.map(v=>circleDiff(v,m)**2)))};}
 function range(s,start,end){return s.records.filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>a.date.localeCompare(b.date));}
 function metrics(records){const calc=records.map(r=>({...r,...calculate(r)}));return {n:calc.length,mean:mean(calc.map(r=>r.estimatedMinutes)),met:calc.filter(r=>r.estimatedMinutes>=r.goal.goalMinutes).length,rate:calc.length?100*calc.filter(r=>r.estimatedMinutes>=r.goal.goalMinutes).length/calc.length:null,delta:calc.length?calc.reduce((a,r)=>a+r.estimatedMinutes-r.goal.goalMinutes,0):null,quality:mean(calc.filter(r=>r.quality!=null).map(r=>r.quality)),qualityN:calc.filter(r=>r.quality!=null).length,energy:mean(calc.filter(r=>r.energy!=null).map(r=>r.energy)),energyN:calc.filter(r=>r.energy!=null).length,start:circular(calc.map(r=>minutes(r.attemptAt,r.timeZone))),wake:circular(calc.map(r=>minutes(r.wakeAt,r.timeZone))),plannedN:calc.filter(r=>r.planned).length,plannedDelay:mean(calc.filter(r=>r.planned).map(r=>Math.round((Date.parse(r.attemptAt)-Date.parse(r.planned.start))/60000)))};}
 function compare(records,key){const yes=[],unknown=[];for(const r of records)(key(r)?yes:unknown).push(r);return {yes:{n:yes.length,mean:mean(yes.map(r=>calculate(r).estimatedMinutes))},unknown:{n:unknown.length,mean:mean(unknown.map(r=>calculate(r).estimatedMinutes))},sufficient:yes.length>=5&&unknown.length>=5};}
 function associations(state,records,habitId){
  const habit=habitId?compare(records,r=>!!state.checks[habitId]?.[T.shift(r.date,-1)]):null,training=compare(records,r=>(state.training?.sessions||[]).some(t=>t.date===T.shift(r.date,-1)));
  const durations=records.map(r=>({r,values:(state.training?.sessions||[]).filter(t=>t.date===T.shift(r.date,-1)&&t.duration!=null).map(t=>t.duration)})).filter(x=>x.values.length).map(x=>({...x,total:x.values.reduce((a,b)=>a+b,0)})),short=durations.filter(x=>x.total<=60),long=durations.filter(x=>x.total>60),trainingDuration={yes:{n:short.length,mean:mean(short.map(x=>calculate(x.r).estimatedMinutes))},unknown:{n:long.length,mean:mean(long.map(x=>calculate(x.r).estimatedMinutes))},sufficient:short.length>=5&&long.length>=5};
  const workoutNames=[...new Set((state.training?.sessions||[]).map(t=>t.name))];const workouts=workoutNames.map(name=>({name,...compare(records,r=>(state.training?.sessions||[]).some(t=>t.date===T.shift(r.date,-1)&&t.name===name))}));
  const productivity=records.map(r=>{const items=state.todo?T.logicalItems(state.todo,true).filter(i=>!i.sleepPlanId&&!i.seriesMaster&&!i.sync?.externalDeleted&&i.execution.status!=='canceled'&&T.startDay(i,state.todo.timeZone)===r.date):[];return {date:r.date,sleep:calculate(r).estimatedMinutes,goal:r.goal.goalMinutes,eligible:items.length,completed:items.filter(i=>i.execution.status==='completed').length,pending:items.filter(T.active).length,postponed:items.filter(i=>i.postponeCount>0).length,reschedules:items.reduce((a,i)=>a+i.postponeCount,0),rate:items.length?100*items.filter(i=>i.execution.status==='completed').length/items.length:null};});
  const met=productivity.filter(p=>p.sleep>=p.goal&&p.rate!=null),below=productivity.filter(p=>p.sleep<p.goal&&p.rate!=null);
  return {habit,training,trainingDuration,workouts,productivity,execution:{met:{n:met.length,mean:mean(met.map(p=>p.rate))},below:{n:below.length,mean:mean(below.map(p=>p.rate))},sufficient:met.length>=5&&below.length>=5}};
 }
 root.SleepCore={weekdays,seed,validate,settings,configured,configure,goalAt,calculate,saveRecord,suggest,planned,setPlan,exportPlan,exportSeries,endSeries,conflicts,duration,mean,minutes,circleDiff,circular,range,metrics,associations,nowDay,copy};if(typeof module!=='undefined')module.exports=root.SleepCore;
})(typeof window!=='undefined'?window:globalThis);
