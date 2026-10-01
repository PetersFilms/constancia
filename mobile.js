(function(){
 const $=id=>document.getElementById(id);let installPrompt,waiting;
 $('installOpen').onclick=()=>$('installDialog').showModal();$('installClose').onclick=()=>$('installDialog').close();
 if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)$('installOpen').hidden=true;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('nativeInstall').hidden=false;});
 $('nativeInstall').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();const {outcome}=await installPrompt.userChoice;if(outcome==='accepted'){$('installDialog').close();$('installOpen').hidden=true;}installPrompt=null;};
 if('serviceWorker' in navigator&&location.protocol!=='file:'){
  navigator.serviceWorker.register('./sw.js').then(registration=>{
   function ready(worker){waiting=worker;$('appUpdate').hidden=false;}
   if(registration.waiting)ready(registration.waiting);
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)ready(worker);});});
  }).catch(()=>{console.warn('O aplicativo está disponível; a instalação offline não pôde ser preparada.');});
  let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing&&waiting){refreshing=true;location.reload();}});
  $('appReload').onclick=()=>{if(waiting)waiting.postMessage('ACTIVATE_UPDATE');else location.reload();};
 }
})();
