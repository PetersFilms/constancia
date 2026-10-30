(function(){
 'use strict';
 const $=id=>document.getElementById(id),B=BrainCore,panel=$('brainPanel'),OUTBOX='constancia.brain.outbox.v1';
 let rows=[],error='',busy=false,sending=false;
 const cloud=()=>window.ConstanciaBrainCloud,available=()=>!!cloud()?.available();
 const labelTime=iso=>new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 function readOutbox(){try{return B.readOutbox(localStorage.getItem(OUTBOX));}catch{return [];}}
 function writeOutbox(list){try{localStorage.setItem(OUTBOX,JSON.stringify(list));return true;}catch{return false;}}
 function row(kind,note,right,when){return `<div class="brain-row"><span class="brain-title">${kind==='foto'?'📷':'✏️'} ${esc(note||'Foto')}</span><span class="brain-status">${right}</span><span class="brain-when">${esc(when)}</span></div>`;}
 function render(){
  const draft=$('brainText')?.value,box=readOutbox();
  panel.innerHTML=`<section class="intro"><div><h1>Cérebro</h1></div></section><p class="brain-note">Capture agora; a classificação acontece quando você pedir ao Claude no computador. A foto vira texto no acervo e é apagada depois de classificada.</p><section class="card brain-form"><form id="brainForm"><label>O que você quer guardar?<textarea id="brainText" maxlength="100000" rows="4" placeholder="A ideia, o aprendizado, a referência…"></textarea></label><div class="form-actions"><button type="button" id="brainPhoto" class="quiet" ${sending?'disabled':''}>📷 Enviar foto</button><button class="primary" type="submit" ${sending?'disabled':''}>${sending?'Enviando…':'Guardar no cérebro'}</button></div><input id="brainFile" type="file" accept="image/*" hidden><p id="brainError" class="todo-error" role="alert">${esc(error)}</p></form></section>${box.length?`<section class="card brain-list"><h2>Neste aparelho · aguardando internet</h2>${box.map(i=>row(i.kind,i.note,'Na fila para envio',labelTime(i.created_at))).join('')}</section>`:''}<section class="card brain-list"><h2>Capturas enviadas</h2>${rows.length?rows.map(r=>`<div class="brain-row" data-state="${esc(r.status)}"><span class="brain-title">${r.kind==='foto'?'📷':'✏️'} ${esc(r.note||'Foto')}</span><span class="brain-status">${esc(B.statusLabel(r))}</span><span class="brain-when">${esc(labelTime(r.created_at))}</span></div>`).join(''):`<p class="muted">${available()?(busy?'Carregando…':'Nenhuma captura ainda. O que você guardar aparece aqui com o destino no acervo.'):'Entre na sua conta e vincule o histórico para enviar capturas.'}</p>`}</section>`;
  if(draft)$('brainText').value=draft;
  $('brainForm').onsubmit=submitText;$('brainPhoto').onclick=()=>$('brainFile').click();$('brainFile').onchange=photoChosen;
 }
 async function refresh(){if(!available()){rows=[];render();return;}if(busy)return;busy=true;render();try{rows=await cloud().list(20);error='';}catch(e){error=e.message;}finally{busy=false;render();}}
 async function send(item){
  if(available()&&navigator.onLine!==false){try{sending=true;render();await cloud().insert(item);sending=false;toast('Guardado. Peça ao Claude para processar quando quiser.');refresh();return;}catch{sending=false;}}
  try{const kept=writeOutbox(B.pushOutbox(readOutbox(),item));toast(kept?(available()?'Sem conexão agora. A captura ficou neste aparelho e será enviada depois.':'Você ainda não entrou na conta. A captura ficou neste aparelho e será enviada quando você entrar.'):'Não há espaço para guardar neste aparelho. Tente com internet.');}catch(e){toast(e.message);}
  render();
 }
 async function flushOutbox(){if(!available()||navigator.onLine===false)return;const box=readOutbox();if(!box.length)return;const rest=[];for(const item of box){try{await cloud().insert(item);}catch{rest.push(item);}}writeOutbox(rest);if(rest.length<box.length){toast('Capturas deste aparelho enviadas ao cérebro.');refresh();}}
 function submitText(e){e.preventDefault();error='';try{const item=B.capture('texto',$('brainText').value);$('brainText').value='';send(item);}catch(err){error=err.message;render();}}
 async function photoChosen(e){const file=e.target.files[0];e.target.value='';if(!file)return;error='';try{send(B.capture('foto',await shrink(file)));}catch(err){error=err.message;render();}}
 async function shrink(file,edge=1600,quality=0.82){
  const bitmap=await createImageBitmap(file).catch(()=>null);if(!bitmap)throw Error('A foto não pôde ser lida.');
  const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  const url=canvas.toDataURL('image/jpeg',quality);
  if(url.length>B.MAX_CONTENT){if(edge>1000)return shrink(file,1000,0.6);throw Error('A foto é grande demais. Tente enquadrar só o conteúdo.');}
  return url;
 }
 window.renderBrain=()=>{render();refresh();flushOutbox();};
 window.addEventListener('online',flushOutbox);
 window.addEventListener('constancia:account',()=>{rows=[];error='';render();flushOutbox();});
 render();
})();
