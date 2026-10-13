(function(){
 const areas={habits:'habitos',todo:'todo',training:'treinos',body:'corpo'};
 function show(area){
  if(!areas[area])area='habits';
  for(const key of Object.keys(areas)){document.getElementById(key+'Panel').hidden=key!==area;document.getElementById(key+'Tab').setAttribute('aria-pressed',String(key===area));}
  history.replaceState(null,'','#'+areas[area]);
  if(area==='todo')window.renderTodo?.();if(area==='training')window.renderTraining?.();if(area==='body')window.renderBody?.();
  window.dispatchEvent(new CustomEvent('constancia:area',{detail:area}));
 }
 for(const key of Object.keys(areas))document.getElementById(key+'Tab').onclick=()=>show(key);
 window.ConstanciaNavigate=show;
 const fromHash=()=>show(Object.keys(areas).find(k=>'#'+areas[k]===location.hash)||'habits');
 window.addEventListener('hashchange',fromHash);fromHash();
})();
