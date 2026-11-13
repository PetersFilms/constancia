'use strict';
const {test}=require('node:test');
const assert=require('node:assert');
const T=require('./training-core.js');
const base={id:'a1',date:'2026-11-13',name:'Hyrox',groups:['Corpo inteiro'],exercises:[]};

test('sessão WOD válida passa',()=>{
 assert.ok(T.validate({version:1,sessions:[{...base,modality:'hyrox',wod:{type:'Hyrox Full',result:'58:30'}}]}));
});
test('modalidade desconhecida é recusada',()=>{
 assert.throws(()=>T.validate({version:1,sessions:[{...base,modality:'natacao'}]}));
});
test('wod malformado é recusado',()=>{
 assert.throws(()=>T.validate({version:1,sessions:[{...base,modality:'cross',wod:{type:'A'.repeat(50)}}]}));
 assert.throws(()=>T.validate({version:1,sessions:[{...base,modality:'cross',wod:[]}]}));
});
test('sessão de academia antiga continua passando sem os campos novos',()=>{
 assert.ok(T.validate({version:1,sessions:[{id:'b2',date:'2026-11-10',name:'Peito e tríceps',exercises:[{id:'e1',name:'Supino',sets:[{reps:10,weight:60}]}]}]}));
});
