'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('./sleep-core.js');
const at='2026-11-15T20:00:00Z';
const night={date:'2026-11-14',timeZone:'America/Sao_Paulo',attemptAt:'2026-11-13T23:00:00-03:00',wakeAt:'2026-11-14T06:30:00-03:00'};
const nap=(id)=>({id,date:'2026-11-14',timeZone:'America/Sao_Paulo',attemptAt:'2026-11-14T14:00:00-03:00',wakeAt:'2026-11-14T14:40:00-03:00',notes:'pós-almoço'});

test('soneca e noite convivem na mesma data e o estado valida',()=>{
 const s=S.seed();
 S.saveRecord(s,night,at);
 const n=S.saveNap(s,nap(),at);
 assert.equal(n.kind,'nap');
 assert.equal(n.estimatedMinutes,40);
 assert.equal(s.records.length,2);
 S.validate(s);
 assert.equal(S.nights(s.records).length,1);
});

test('duas sonecas no mesmo dia passam; segunda NOITE na mesma data continua proibida',()=>{
 const s=S.seed();
 S.saveNap(s,nap(),at);
 S.saveNap(s,{...nap(),attemptAt:'2026-11-14T17:00:00-03:00',wakeAt:'2026-11-14T17:20:00-03:00'},at);
 S.validate(s);
 s.records.push({...s.records[0],id:'outro',kind:'night',goal:s.records[0].goal});
 s.records.push({...s.records[0],id:'outra-noite',kind:'night'});
 assert.throws(()=>S.validate(s),/duplicado/);
});

test('soneca atravessando a meia-noite é recusada e edição por id preserva criação',()=>{
 const s=S.seed();
 assert.throws(()=>S.saveNap(s,{...nap(),wakeAt:'2026-11-15T00:30:00-03:00'},at));
 const first=S.saveNap(s,nap(),at);
 const edited=S.saveNap(s,{...nap(first.id),wakeAt:'2026-11-14T15:00:00-03:00'},'2026-11-15T21:00:00Z');
 assert.equal(edited.id,first.id);
 assert.equal(edited.createdAt,first.createdAt);
 assert.equal(edited.estimatedMinutes,60);
 assert.equal(s.records.length,1);
});

test('removeNap tira só a soneca e exige id existente',()=>{
 const s=S.seed();
 S.saveRecord(s,night,at);
 const n=S.saveNap(s,nap(),at);
 S.removeNap(s,n.id,at);
 assert.equal(s.records.length,1);
 assert.equal(s.records[0].kind,'night');
 assert.throws(()=>S.removeNap(s,'nao-existe',at),/não encontrada/);
});

test('editar a noite de uma data com soneca pega a noite, não a soneca',()=>{
 const s=S.seed();
 S.saveNap(s,nap(),at);
 const r=S.saveRecord(s,night,at);
 assert.equal(r.kind,'night');
 const again=S.saveRecord(s,{...night,quality:4},'2026-11-15T21:00:00Z');
 assert.equal(again.id,r.id);
 assert.equal(s.records.filter(x=>x.kind==='night').length,1);
});
