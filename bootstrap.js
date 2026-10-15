(async function(){
 'use strict';
 try{
  let channel;
  const store=new ConstanciaHistoryStore({storage:localStorage,indexedDB:window.indexedDB,notify:(kind,detail)=>{if(kind==='saved')channel?.postMessage('updated');else window.dispatchEvent(new CustomEvent('constancia:history-'+kind,{detail}));}});
  await store.init();window.ConstanciaHistory=store;
  if(window.BroadcastChannel){channel=new BroadcastChannel('constancia-history');channel.onmessage=()=>store.refresh().catch(()=>{});}
  window.addEventListener('storage',e=>store.observeLocal(e.key,e.newValue));
  window.addEventListener('focus',()=>store.refresh().catch(()=>{}));
  for(const name of ['app','body','training','sync-engine','calendar-sync','sync','todo','sleep','navigation','mobile'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=name+'.js?v=50';s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar o aplicativo.'));document.body.appendChild(s);});
 }catch{const el=document.getElementById('dataStatus');el.hidden=false;el.textContent='Não foi possível abrir o histórico local. Feche e reabra o aplicativo; seus registros foram preservados.';}
})();
