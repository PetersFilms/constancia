#!/usr/bin/env node
// Fila do segundo cérebro (constancia_brain_inbox) — uso pelo Claude no Mac do proprietário.
//   node processar.mjs list                     → pendências (sem conteúdo)
//   node processar.mjs fetch <id> <arquivo>     → grava o conteúdo (foto .jpg / texto .txt)
//   node processar.mjs done <id> <resultado…>   → marca classificado e esvazia o conteúdo
//   node processar.mjs discard <id> <motivo…>   → marca descartado e esvazia o conteúdo
// A chave fica fora do repositório, em ~/.config/constancia/brain.env (SUPABASE_SERVICE_KEY=…).
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
const BASE='https://ahsnobrlcyaefdanjdsm.supabase.co';
let env={};
try{env=Object.fromEntries(readFileSync(homedir()+'/.config/constancia/brain.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]));}catch{}
const KEY=env.SUPABASE_SERVICE_KEY;
if(!KEY){console.error('Crie ~/.config/constancia/brain.env com SUPABASE_SERVICE_KEY=<service_role do projeto>.');process.exit(1);}
async function rest(path,options={}){const r=await fetch(BASE+'/rest/v1/'+path,{...options,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});if(!r.ok)throw Error('Supabase '+r.status+': '+await r.text());const t=await r.text();return t?JSON.parse(t):null;}
const [cmd,id,...args]=process.argv.slice(2);
if(cmd==='list'){
 const rows=await rest('constancia_brain_inbox?status=eq.pendente&select=id,created_at,kind,note&order=created_at');
 console.log(JSON.stringify(rows,null,1));
}else if(cmd==='fetch'&&id&&args[0]){
 const rows=await rest('constancia_brain_inbox?id=eq.'+encodeURIComponent(id)+'&select=kind,content,note');
 const row=rows?.[0];if(!row)throw Error('Captura não encontrada.');
 if(row.kind==='texto')writeFileSync(args[0],row.content);
 else writeFileSync(args[0],Buffer.from(row.content.slice(row.content.indexOf(',')+1),'base64'));
 const mime=row.kind==='texto'?'texto':(row.content.match(/^data:([^;]+);/)?.[1]||'desconhecido');
 console.log('ok '+args[0]+' ('+mime+')'+(row.note?'\nnota: '+row.note:''));
}else if((cmd==='done'||cmd==='discard')&&id&&args.length){
 await rest('constancia_brain_inbox?id=eq.'+encodeURIComponent(id)+'&status=eq.pendente',{method:'PATCH',body:JSON.stringify({status:cmd==='done'?'classificado':'descartado',result:args.join(' ').slice(0,10000),processed_at:new Date().toISOString(),content:''})});
 console.log('ok');
}else{
 console.log('Uso: list | fetch <id> <arquivo> | done <id> <resultado…> | discard <id> <motivo…>');
 process.exit(cmd?1:0);
}
