(function(root){
 'use strict';
 const KINDS=['texto','foto','audio'],MAX_CONTENT=1800000,MAX_NOTE=10000,OUTBOX_LIMIT=10;
 function capture(kind,content,note='',at=new Date().toISOString()){
  if(!KINDS.includes(kind))throw Error('Tipo de captura inválido.');
  const text=String(content||'');
  if(!text.trim())throw Error(kind==='texto'?'Escreva algo antes de guardar.':kind==='audio'?'O áudio não pôde ser lido.':'A foto não pôde ser lida.');
  if(kind==='foto'&&!/^data:image\/(jpeg|png|webp|heic|heif);base64,/.test(text))throw Error('A foto não pôde ser lida.');
  if(kind==='audio'&&!/^data:audio\/[a-z0-9.+-]+(;[a-z0-9.+=-]+)*;base64,/i.test(text))throw Error('O áudio não pôde ser lido.');
  if(text.length>MAX_CONTENT)throw Error('A captura é grande demais. Reduza o texto ou tente um arquivo menor.');
  const label=String(note||(kind==='texto'?text.trim().slice(0,120):'')).slice(0,MAX_NOTE);
  return {kind,content:text,note:label,created_at:at};
 }
 function readOutbox(raw){if(!raw)return [];const list=JSON.parse(raw);if(!Array.isArray(list))return [];return list.filter(x=>x&&KINDS.includes(x.kind)&&typeof x.content==='string'&&x.content);}
 function pushOutbox(list,item){if(list.length>=OUTBOX_LIMIT)throw Error('A fila deste aparelho está cheia. Conecte à internet para enviar as capturas guardadas.');return [...list,item];}
 const statusLabel=row=>row.status==='classificado'?'Classificado'+(row.result?' · '+row.result:''):row.status==='descartado'?'Descartado'+(row.result?' · '+row.result:''):'Aguardando classificação';
 root.BrainCore={KINDS,MAX_CONTENT,OUTBOX_LIMIT,capture,readOutbox,pushOutbox,statusLabel};
 if(typeof module!=='undefined')module.exports=root.BrainCore;
})(typeof window!=='undefined'?window:globalThis);
