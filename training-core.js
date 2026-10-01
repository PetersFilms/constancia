(function(root){
 'use strict';
 const groups=['Peito','Costas','Ombros','Bíceps','Tríceps','Antebraços','Quadríceps','Posteriores de coxa','Glúteos','Panturrilhas','Abdômen','Corpo inteiro','Não classificado'];
 const presets=[{name:'Peito e tríceps',groups:['Peito','Tríceps']},{name:'Costas e bíceps',groups:['Costas','Bíceps']},{name:'Ombros e abdômen',groups:['Ombros','Abdômen']},{name:'Pernas completo',groups:['Quadríceps','Posteriores de coxa','Glúteos','Panturrilhas']},{name:'Quadríceps e panturrilhas',groups:['Quadríceps','Panturrilhas']},{name:'Posteriores e glúteos',groups:['Posteriores de coxa','Glúteos']},{name:'Superiores',groups:['Peito','Costas','Ombros','Bíceps','Tríceps']},{name:'Corpo inteiro',groups:['Corpo inteiro']},...groups.filter(g=>!['Corpo inteiro','Não classificado'].includes(g)).map(name=>({name,groups:[name]}))];
 const labels={energy:['Péssima','Baixa','Regular','Boa','Excelente'],food:['Péssima','Ruim','Regular','Boa','Excelente'],stress:['Muito baixo','Baixo','Moderado','Alto','Muito alto'],performance:['Muito abaixo do esperado','Abaixo do esperado','Dentro do esperado','Bom','Excelente']};
 const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(new Date(d+'T12:00:00'))&&new Date(d+'T12:00:00').toISOString().slice(0,10)===d;
 const seed=()=>({version:1,sessions:[],exercises:[],workouts:[]});
 const number=(v,min,max)=>v==null||(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max);
 const text=(v,max)=>typeof v==='string'&&v.length<=max;
 const groupList=v=>v===undefined||(Array.isArray(v)&&v.length<=groups.length&&v.every(g=>groups.includes(g)));
 function validate(t){
  if(!t||t.version!==1||!Array.isArray(t.sessions)||t.sessions.length>5000)throw Error('Treinos inválidos.');
  const ids=new Set();
  for(const s of t.sessions){
   if(!s||!text(s.id,80)||!/^[a-zA-Z0-9-]{1,80}$/.test(s.id)||ids.has(s.id)||!validDate(s.date)||!text(s.name,80)||!s.name.trim()||!groupList(s.groups)||!number(s.duration,1,1440)||!number(s.performance,1,5)||!number(s.energy,1,5)||!number(s.food,1,5)||!number(s.sleep,0,24)||!number(s.stress,1,5)||!text(s.foodNotes||'',1200)||!text(s.dayNotes||'',2000)||!text(s.notes||'',2000)||!Array.isArray(s.exercises)||s.exercises.length>100)throw Error('Registro de treino inválido.');
   for(const k of ['performance','energy','food','stress'])if(s[k]!=null&&!Number.isInteger(s[k]))throw Error('Descrição de contexto inválida.');
   ids.add(s.id);
   for(const e of s.exercises){
    if(!e||!text(e.id,80)||!/^[a-zA-Z0-9-]{1,80}$/.test(e.id)||!text(e.name,100)||!e.name.trim()||(e.group!==undefined&&!groups.includes(e.group))||!text(e.method||'',120)||!text(e.notes||'',600)||!Array.isArray(e.sets)||e.sets.length>100)throw Error('Exercício inválido.');
    for(const x of e.sets){if(!x||!number(x.reps,1,1000)||!number(x.weight,0,2000)||!number(x.rir,0,10)||!text(x.notes||'',200)||(x.loadType!==undefined&&!['external','body','bar'].includes(x.loadType)))throw Error('Série inválida.');if(x.loadType==='body'&&x.weight!=null&&x.weight!==0)throw Error('Peso corporal usa carga externa zero.');}
   }
  }
  for(const key of ['exercises','workouts'])if(t[key]!==undefined){if(!Array.isArray(t[key])||t[key].length>1000)throw Error('Catálogo inválido.');const names=new Set();for(const x of t[key]){if(!x||!text(x.name,key==='exercises'?100:80)||!x.name.trim()||names.has(normalize(x.name))||(key==='exercises'&&!groups.includes(x.group))||(key==='workouts'&&!groupList(x.groups)))throw Error('Item de catálogo inválido.');names.add(normalize(x.name));}}
  return t;
 }
 const loadType=x=>x.loadType||(x.weight===0?'body':'external');
 const load=x=>loadType(x)==='body'?0:loadType(x)==='bar'?10+(x.weight||0):x.weight??null;
 const volume=s=>(s.exercises||[]).reduce((a,e)=>a+e.sets.reduce((b,x)=>b+(load(x)||0)*(x.reps||0),0),0);
 const setCount=s=>(s.exercises||[]).reduce((a,e)=>a+e.sets.length,0);
 const ordered=all=>[...all].sort((a,b)=>a.date.localeCompare(b.date));
 const bestLoad=(sessions,name)=>Math.max(0,...sessions.flatMap(s=>s.exercises.filter(e=>normalize(e.name)===normalize(name)).flatMap(e=>e.sets.map(x=>load(x)||0))));
 function exerciseCatalog(t){const map=new Map();for(const s of t?.sessions||[])for(const e of s.exercises)if(!map.has(normalize(e.name)))map.set(normalize(e.name),{name:e.name,group:e.group||'Não classificado'});for(const e of t?.exercises||[])map.set(normalize(e.name),e);return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
 function workoutCatalog(t){const map=new Map(presets.map(p=>[normalize(p.name),p]));for(const s of t?.sessions||[])if(!map.has(normalize(s.name)))map.set(normalize(s.name),{name:s.name,groups:s.groups||[]});for(const w of t?.workouts||[])map.set(normalize(w.name),w);return [...map.values()];}
 const exerciseGroup=(e,t)=>e.group||exerciseCatalog(t).find(x=>normalize(x.name)===normalize(e.name))?.group||'Não classificado';
 function grouped(t){const map=new Map();for(const s of ordered(t?.sessions||[])){const key=normalize(s.name);if(!map.has(key))map.set(key,{key,name:s.name,sessions:[],groups:new Set()});const g=map.get(key);g.sessions.push(s);(s.groups||[]).forEach(x=>g.groups.add(x));s.exercises.forEach(e=>g.groups.add(exerciseGroup(e,t)));}return [...map.values()].map(g=>({...g,groups:[...g.groups].filter(x=>x!=='Não classificado')}));}
 function points(all,name){return ordered(all).map(s=>{const exercises=s.exercises.filter(e=>normalize(e.name)===normalize(name)),sets=exercises.flatMap(e=>e.sets).filter(x=>load(x)!=null);if(!sets.length)return null;const peak=Math.max(...sets.map(load)),set=sets.find(x=>load(x)===peak);return {date:s.date,session:s.id,load:peak,reps:set.reps,body:loadType(set)==='body',method:[...new Set(exercises.map(e=>e.method||'Método não informado'))].join(' / ')};}).filter(Boolean);}
 function rankings(all,t,{exercise='',group=''}={}){const entries=[];for(const s of all)for(const e of s.exercises){const g=exerciseGroup(e,t);if(exercise&&normalize(e.name)!==normalize(exercise)||group&&g!==group)continue;for(const x of e.sets)if(load(x)!=null)entries.push({name:e.name,group:g,date:s.date,session:s.id,load:load(x),body:loadType(x)==='body',reps:x.reps,method:e.method||''});}return entries.sort((a,b)=>b.load-a.load||(b.reps||0)-(a.reps||0)||b.date.localeCompare(a.date));}
 function association(sessions,key){const rated=sessions.filter(s=>s[key]!=null&&s.performance!=null),high=rated.filter(s=>s[key]>=4),low=rated.filter(s=>s[key]<=3),avg=a=>a.reduce((n,s)=>n+s.performance,0)/a.length;if(high.length<2||low.length<2)return null;return {high:avg(high),low:avg(low),highN:high.length,lowN:low.length,difference:avg(high)-avg(low)};}
 function guidance(all){
  const sorted=ordered(all),recent=sorted.slice(-6),messages=[],evidence=[];
  if(!recent.length)return {title:'Seu histórico começa aqui',messages:['Registre algumas sessões do mesmo treino, incluindo sono, energia e desempenho, para receber uma leitura do histórico.'],evidence:[]};
  const sleep=recent.filter(s=>s.sleep!=null);if(sleep.length>=3){const avg=sleep.reduce((a,s)=>a+s.sleep,0)/sleep.length;evidence.push('Sono médio nas '+sleep.length+' sessões recentes: '+avg.toFixed(1).replace('.',',')+' h.');if(avg<7)messages.push('Priorize uma rotina de sono mais regular antes de tentar aumentar a exigência. Seu sono registrado está abaixo da referência geral de 7 horas para adultos de 18 a 60 anos. Isso não demonstra que o sono causou uma mudança no treino.');}
  const food=recent.filter(s=>s.food!=null);if(food.length>=3&&food.filter(s=>s.food<=2).length>=Math.ceil(food.length/2))messages.push('A alimentação foi descrita como ruim ou péssima em pelo menos metade das sessões avaliadas. Revise os horários e o que você relatou nas refeições para encontrar algo que possa organizar melhor.');
  const byWorkout=new Map();for(const s of sorted){const k=normalize(s.name);if(!byWorkout.has(k))byWorkout.set(k,[]);byWorkout.get(k).push(s);}let compared=0;
  for(const history of byWorkout.values()){const rated=history.filter(s=>s.performance!=null).slice(-6);if(rated.length<6||new Set(rated.map(s=>s.date)).size<4)continue;compared++;const previous=rated.slice(0,3),now=rated.slice(3),mean=a=>a.reduce((n,s)=>n+s.performance,0)/a.length,delta=mean(now)-mean(previous),lowEnergy=now.filter(s=>s.energy!=null&&s.energy<=2).length>=2,highStress=now.filter(s=>s.stress!=null&&s.stress>=4).length>=2;
   evidence.push(history[0].name+': percepção média '+mean(previous).toFixed(1).replace('.',',')+' → '+mean(now).toFixed(1).replace('.',',')+' nas últimas 6 sessões avaliadas.');
   if(delta<=-1&&(lowEnergy||highStress))messages.push('Em '+history[0].name+', o desempenho percebido caiu e houve baixa energia ou estresse alto em pelo menos duas sessões recentes. Considere discutir uma semana mais leve com seu treinador e acompanhe a recuperação antes de subir as cargas.');
   else if(delta>=0&&now.every(s=>s.performance>=4&&s.energy>=4&&s.stress!=null&&s.stress<=3))messages.push('Em '+history[0].name+', você relata bom desempenho e boa energia nas três sessões recentes. Uma progressão pequena pode ser avaliada se técnica, repetições previstas e recuperação continuarem boas; este registro ainda não define qual carga aumentar.');
   else messages.push('Em '+history[0].name+', mantenha uma referência comparável de exercícios, técnica e repetições nas próximas sessões. Os sinais registrados não sustentam escolher automaticamente uma semana mais pesada ou mais leve.');
  }
  if(!compared)messages.unshift('Ainda não há seis sessões avaliadas do mesmo treino, distribuídas em pelo menos quatro dias. Por enquanto, não há base suficiente para sugerir uma semana mais leve ou mais pesada.');
  return {title:'Uma leitura para os próximos treinos',messages,evidence};
 }
 root.Training={groups,presets,labels,normalize,seed,validate,validDate,load,loadType,volume,setCount,bestLoad,exerciseCatalog,workoutCatalog,exerciseGroup,grouped,points,rankings,association,guidance};
 if(typeof module!=='undefined')module.exports=root.Training;
})(typeof window!=='undefined'?window:globalThis);
