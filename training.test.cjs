const assert=require('node:assert/strict');
const T=require('./training-core.js');
const base={id:'t-1',date:'2026-09-30',name:'Peito e tríceps',duration:60,performance:4,energy:4,food:5,sleep:7.5,stress:2,foodNotes:'Almocei bem.',dayNotes:'Dia normal.',notes:'Boa técnica.',exercises:[{id:'e-1',name:'Supino reto',method:'Progressão de carga',notes:'',sets:[{reps:10,weight:40,rir:3,notes:''},{reps:8,weight:50,rir:1,notes:''}]}]};
assert.equal(T.validate({version:1,sessions:[base]}).sessions.length,1);
assert.equal(T.volume(base),800);
assert.equal(T.setCount(base),2);
assert.equal(T.bestLoad([base],'supino reto'),50);
assert.throws(()=>T.validate({version:1,sessions:[{...base,date:'2026-02-30'}]}));
assert.throws(()=>T.validate({version:1,sessions:[{...base,performance:6}]}));
assert.throws(()=>T.validate({version:1,sessions:[{...base,exercises:[{...base.exercises[0],sets:[{reps:0,weight:40,rir:1,notes:''}]}]}]}));
const data=[
 {...base,id:'t-1',date:'2026-09-20',food:5,performance:5},
 {...base,id:'t-2',date:'2026-09-21',food:4,performance:4},
 {...base,id:'t-3',date:'2026-09-22',food:3,performance:3},
 {...base,id:'t-4',date:'2026-09-23',food:2,performance:2}
];
const a=T.association(data,'food');assert.equal(a.high,4.5);assert.equal(a.low,2.5);assert.equal(a.difference,2);
assert.equal(T.association(data.slice(0,3),'food'),null);
console.log('OK: validação, volume, séries, maior carga e associação de contexto do treino.');
const bar={reps:10,weight:20,loadType:'bar',rir:2};
assert.equal(T.load(bar),30);assert.equal(T.load({...bar,weight:0}),10);
assert.equal(T.load({reps:10,weight:0,loadType:'body'}),0);
assert.equal(T.load({reps:10,weight:null}),null);
assert.equal(T.load({reps:10,weight:40}),40); // Old kg totals never gain a bar.
assert.equal(T.volume({exercises:[{sets:[bar]}]}),300);
const mixed={version:1,sessions:[base,{...base,id:'t-2',name:' peito  e TRÍCEPS ',date:'2026-10-01'}]};
assert.equal(T.grouped(mixed).length,1);assert.equal(T.grouped(mixed)[0].sessions.length,2);
assert.equal(T.exerciseCatalog(mixed).length,1);
assert.equal(T.points(mixed.sessions,'SUPINO RETO').length,2);
assert.equal(T.rankings(mixed.sessions,mixed,{exercise:'supino reto'}).length,4);
assert.equal(T.rankings(mixed.sessions,mixed,{group:'Não classificado'}).length,4);
assert.match(T.guidance(data.slice(0,2)).messages[0],/não há seis/);
const low=Array.from({length:6},(_,i)=>({...base,id:'low-'+i,date:'2026-09-'+String(10+i).padStart(2,'0'),performance:i<3?4:2,energy:2,stress:5,sleep:6}));
assert(T.guidance(low).messages.some(m=>m.includes('semana mais leve')));
assert(T.guidance(low).messages.some(m=>m.includes('sono')));
const high=low.map(s=>({...s,performance:4,energy:4,stress:2,sleep:8}));
assert(T.guidance(high).messages.some(m=>m.includes('progressão pequena')));
const noStress=high.map(s=>({...s,stress:null}));
assert(!T.guidance(noStress).messages.some(m=>m.includes('progressão pequena')));
assert.throws(()=>T.validate({version:1,sessions:[{...base,stress:2.5}]}));
const P=require('./persistence-core.js');
const old={version:1,habits:[],checks:{},body:{version:1,records:[]}};
const current={...old,body:{...old.body,weights:[{date:'2026-09-30',weight:70}],futureMeasure:{value:12}},training:{...mixed,futureTraining:'kept'},futureTab:{records:[{id:'x',values:[1,2]}]}};
const merged=P.restore(old,current);
assert.deepEqual(merged.training,current.training);assert.deepEqual(merged.futureTab,current.futureTab);assert.deepEqual(merged.body.weights,current.body.weights);
assert.deepEqual(merged.body.records,[]);assert.deepEqual(old,{version:1,habits:[],checks:{},body:{version:1,records:[]}});
assert.deepEqual(P.restore({...old,training:{version:1,sessions:[]}},current).training.sessions,[]);
console.log('OK: barra 10 kg, corporal, carga antiga, sessões agrupadas, gráficos, rankings, leitura condicional e proteção genérica de abas futuras.');
