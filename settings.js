(function(){
 'use strict';
 const $=id=>document.getElementById(id),drawer=$('settingsDrawer'),opener=$('settingsOpen');
 let oldOverflow='';
 function open(){if(drawer.open)return;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';drawer.showModal();opener.setAttribute('aria-expanded','true');$('settingsClose').focus();}
 function closed(){document.body.style.overflow=oldOverflow;opener.setAttribute('aria-expanded','false');opener.focus();}
 opener.onclick=open;$('settingsClose').onclick=()=>drawer.close();drawer.addEventListener('close',closed);
 // Native dialog provides focus containment and Escape. A click outside the sheet closes it too.
 drawer.addEventListener('click',e=>{if(e.target!==drawer)return;const b=drawer.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)drawer.close();});
 $('settingsCloud').onclick=()=>{if(window.ConstanciaCalendar?.available())$('syncNow').click();else $('accountOpen').click();};
 // Keep notices available in settings without repeatedly announcing them on the main screen.
 const notice=()=>{const updateReady=!$('appUpdate').hidden,problem=!$('dataStatus').hidden||!$('todoConnectionError').hidden||['conflict','error'].includes($('syncStatus').dataset.kind);opener.querySelector('.update-dot').hidden=!updateReady;opener.setAttribute('aria-description',updateReady?'Atualização disponível. Abra o menu para atualizar o aplicativo.':problem?'Há um aviso em Configurações.':'Conta, sincronização, agenda e backups.');};
 new MutationObserver(notice).observe(drawer,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','data-kind']});notice();
 // Startup failures must remain actionable even if the rest of the app could not load.
 new MutationObserver(()=>{if(!$('dataStatus').hidden&&!drawer.open)open();}).observe($('dataStatus'),{attributes:true,attributeFilter:['hidden']});
 window.ConstanciaSettings={open,close:()=>drawer.close()};
})();
