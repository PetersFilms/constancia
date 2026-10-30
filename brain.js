(function(){
 'use strict';
 const $=id=>document.getElementById(id),B=BrainCore,panel=$('brainPanel'),OUTBOX='constancia.brain.outbox.v1';
 let rows=[],error='',busy=false,sending=false;
 const cloud=()=>window.ConstanciaBrainCloud,available=()=>!!cloud()?.available();
 const labelTime=iso=>new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 function readOutbox(){try{return B.readOutbox(localStorage.getItem(OUTBOX));}catch{return [];}}
 function writeOutbox(list){try{localStorage.setItem(OUTBOX,JSON.stringify(list));return true;}catch{return false;}}
 const ICONS={texto:'✏️',foto:'📷',audio:'🎙️'},FALLBACK={foto:'Foto',audio:'Áudio'};
 function row(kind,note,right,when){return `<div class="brain-row"><span class="brain-title">${ICONS[kind]||'✏️'} ${esc(note||FALLBACK[kind]||'Captura')}</span><span class="brain-status">${right}</span><span class="brain-when">${esc(when)}</span></div>`;}
 function render(){
  const draft=$('brainText')?.value,box=readOutbox();
  panel.innerHTML=`<section class="intro"><div><h1>Cérebro</h1></div></section><p class="brain-note">Capture agora; a classificação acontece no computador, na rotina semanal ou quando você pedir. Foto e áudio viram texto no acervo e são apagados depois de classificados.</p><section class="card brain-form"><form id="brainForm"><label>O que você quer guardar?<textarea id="brainText" maxlength="100000" rows="4" placeholder="A ideia, o aprendizado, a referência…"></textarea></label><div class="form-actions"><button type="button" id="brainPhoto" class="quiet" ${sending||recorder?'disabled':''}>📷 Enviar foto</button><button type="button" id="brainAudio" class="quiet" ${sending?'disabled':''}>${recorder?'⏹ Parar e guardar':'🎙️ Gravar áudio'}</button><button class="primary" type="submit" ${sending||recorder?'disabled':''}>${sending?'Enviando…':'Guardar no cérebro'}</button></div><input id="brainFile" type="file" accept="image/*" hidden><p id="brainError" class="todo-error" role="alert">${esc(error)}</p></form></section>${box.length?`<section class="card brain-list"><h2>Neste aparelho · aguardando internet</h2>${box.map(i=>row(i.kind,i.note,'Na fila para envio',labelTime(i.created_at))).join('')}</section>`:''}<section class="card brain-list"><h2>Capturas enviadas</h2>${rows.length?rows.map(r=>`<div class="brain-row" data-state="${esc(r.status)}"><span class="brain-title">${ICONS[r.kind]||'✏️'} ${esc(r.note||FALLBACK[r.kind]||'Captura')}</span><span class="brain-status">${esc(B.statusLabel(r))}</span><span class="brain-when">${esc(labelTime(r.created_at))}</span></div>`).join(''):`<p class="muted">${available()?(busy?'Carregando…':'Nenhuma captura ainda. O que você guardar aparece aqui com o destino no acervo.'):'Entre na sua conta e vincule o histórico para enviar capturas.'}</p>`}</section>`;
  if(draft)$('brainText').value=draft;
  $('brainForm').onsubmit=submitText;$('brainPhoto').onclick=()=>$('brainFile').click();$('brainFile').onchange=photoChosen;$('brainAudio').onclick=toggleRecord;
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
 let recorder=null,recordedAt=0,recordTimer=null;
 const blobDataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('O áudio não pôde ser lido.'));r.readAsDataURL(blob);});
 async function toggleRecord(){
  if(recorder){recorder.stop();return;}
  if(!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia){error='Este navegador não grava áudio. Use o texto ou a foto.';render();return;}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch{error='Permita o acesso ao microfone para gravar.';render();return;}
  const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  const active=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000}),chunks=[];
  active.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  active.onstop=async()=>{clearTimeout(recordTimer);stream.getTracks().forEach(t=>t.stop());const seconds=Math.max(1,Math.round((Date.now()-recordedAt)/1000)),blob=new Blob(chunks,{type:active.mimeType||'audio/mp4'});recorder=null;render();
   try{const url=await blobDataUrl(blob);if(url.length>B.MAX_CONTENT)throw Error('O áudio ficou longo demais. Grave trechos de até uns 5 minutos.');send(B.capture('audio',url,'Áudio · '+Math.floor(seconds/60)+'m'+String(seconds%60).padStart(2,'0')+'s'));}catch(e){error=e.message;render();}};
  recorder=active;recordedAt=Date.now();error='';active.start();recordTimer=setTimeout(()=>{if(recorder===active)active.stop();},5*60000);render();
 }
 // Navegadores sem decodificador HEIC (Chrome) enviam o arquivo original; a conversão acontece na classificação.
 const rawDataUrl=(file,mime)=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).replace(/^data:[^;,]*;base64,/,'data:'+mime+';base64,'));r.onerror=()=>reject(Error('A foto não pôde ser lida.'));r.readAsDataURL(file);});
 async function shrink(file,edge=1600,quality=0.82){
  const bitmap=await createImageBitmap(file).catch(()=>null);
  if(!bitmap){
   const heif=/hei[cf]$/i.test(file.name||'')||/hei[cf]/i.test(file.type||'');
   if(!heif)throw Error('A foto não pôde ser lida.');
   const raw=await rawDataUrl(file,/heif/i.test((file.type||'')+(file.name||''))?'image/heif':'image/heic');
   if(raw.length>B.MAX_CONTENT)throw Error('Esta foto HEIC é grande demais para enviar sem conversão. Tente uma foto menor ou em JPEG.');
   return raw;
  }
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
