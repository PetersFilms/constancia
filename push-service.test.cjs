'use strict';
const {test}=require('node:test');
const assert=require('node:assert');
const load=()=>import('./supabase/functions/push/service.mjs');

// 2026-11-12 15:00 UTC = 12:00 em São Paulo (UTC-3).
const NOON_SP=Date.UTC(2026,10,12,15,0);

test('localParts calcula data e minutos no fuso',async()=>{
 const {localParts}=await load();
 assert.deepStrictEqual(localParts(NOON_SP,'America/Sao_Paulo'),{date:'2026-11-12',minutes:720});
});

test('fuso inválido cai no padrão em vez de quebrar',async()=>{
 const {localParts}=await load();
 assert.deepStrictEqual(localParts(NOON_SP,'Nao/Existe'),localParts(NOON_SP,'America/Sao_Paulo'));
});

test('devido só após o horário e uma vez por dia local',async()=>{
 const {due}=await load();
 const base={enabled:true,tz:'America/Sao_Paulo',last_sent:null};
 const rows=[
  {...base,id:'antes',remind_at:'20:00'},               // ainda não deu a hora
  {...base,id:'agora',remind_at:'12:00'},               // exatamente agora
  {...base,id:'catchup',remind_at:'08:00'},             // atrasado, mas ainda hoje
  {...base,id:'ja-enviado',remind_at:'08:00',last_sent:'2026-11-12'},
  {...base,id:'desligado',remind_at:'08:00',enabled:false},
  {...base,id:'hora-invalida',remind_at:'25:99'},
 ];
 assert.deepStrictEqual(due(rows,NOON_SP).map(r=>r.id),['agora','catchup']);
});

test('virada de dia no fuso: 23h30 em SP ainda é o dia local anterior ao UTC',async()=>{
 const {due,localParts}=await load();
 // 2026-11-13 02:30 UTC = 2026-11-12 23:30 em São Paulo.
 const lateNight=Date.UTC(2026,10,13,2,30);
 assert.strictEqual(localParts(lateNight,'America/Sao_Paulo').date,'2026-11-12');
 const row={enabled:true,tz:'America/Sao_Paulo',remind_at:'20:00',last_sent:'2026-11-12'};
 assert.strictEqual(due([row],lateNight).length,0); // já avisou no dia local
});
