(function(){
 'use strict';
 const doc=document;
 let active=null,picker=null,serial=0;
 const pad=n=>String(n).padStart(2,'0');
 function parse(raw){
  const value=String(raw??'').trim().toLowerCase();if(!value)return '';
  let h,m,parts=value.match(/^(\d{1,2})\s*[:h]\s*(\d{1,2})?\s*(?:min)?$/);
  if(parts){h=+parts[1];m=+(parts[2]||0);}
  else if(/^\d{1,4}$/.test(value)){h=+(value.length<=2?value:value.slice(0,-2));m=value.length<=2?0:+value.slice(-2);}
  else return null;
  return h<24&&m<60?pad(h)+':'+pad(m):null;
 }
 function notify(input){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
 function normalize(input){const value=parse(input.value);input.setCustomValidity(value===null?'Use um horário de 00:00 a 23:59. Ex.: 7:30 ou 0730.':'');if(value!==null&&input.value!==value){input.value=value;notify(input);}return value!==null;}
 function close(restore=false){
  const previous=active;active=null;if(picker){if(picker.hasAttribute('popover')&&picker.matches(':popover-open'))picker.hidePopover();picker.hidden=true;}
  if(previous){previous.button.setAttribute('aria-expanded','false');if(restore&&previous.input.isConnected)previous.input.focus();}
 }
 function updateParts(h,m){
  picker.querySelector('#timePickerHours').value=pad(h);picker.querySelector('#timePickerMinutes').value=pad(m);
  picker.querySelector('#timePickerHours').setAttribute('aria-valuenow',h);picker.querySelector('#timePickerMinutes').setAttribute('aria-valuenow',m);
  for(const b of picker.querySelectorAll('[data-time-minute]'))b.setAttribute('aria-pressed',String(+b.dataset.timeMinute===m));
  picker.querySelector('.time-picker-error').textContent='';
 }
 function draft(){const h=picker.querySelector('#timePickerHours').value,m=picker.querySelector('#timePickerMinutes').value;return /^\d{1,2}$/.test(h)&&/^\d{1,2}$/.test(m)&&+h<24&&+m<60?{h:+h,m:+m}:null;}
 function apply(){
  const value=draft();if(!value){picker.querySelector('.time-picker-error').textContent='Confira a hora (00–23) e os minutos (00–59).';return;}
  const input=active?.input;if(!input?.isConnected||input.disabled)return close();
  input.value=pad(value.h)+':'+pad(value.m);input.setCustomValidity('');notify(input);close(true);
 }
 function shift(part,amount){const field=picker.querySelector(part==='hour'?'#timePickerHours':'#timePickerMinutes'),max=part==='hour'?24:60,current=Number(field.value)||0,value=((current+amount)%max+max)%max;field.value=pad(value);field.setAttribute('aria-valuenow',value);const d=draft();if(d)updateParts(d.h,d.m);}
 function position(){
  if(!active||!picker)return;const b=active.input.getBoundingClientRect(),v=window.visualViewport,left=v?.offsetLeft||0,top=v?.offsetTop||0,width=v?.width||innerWidth,height=v?.height||innerHeight,w=Math.min(300,width-24);
  picker.style.width=w+'px';picker.style.maxHeight=Math.max(160,height-24)+'px';
  const h=picker.getBoundingClientRect().height;
  picker.style.left=Math.max(left+12,Math.min(b.left,left+width-w-12))+'px';
  const below=b.bottom+8,above=b.top-h-8;picker.style.top=Math.max(top+12,Math.min(below+h<=top+height-12?below:above,top+height-h-12))+'px';
 }
 function createPicker(){
  if(picker)return;picker=doc.createElement('div');picker.id='constanciaTimePicker';picker.className='time-picker';picker.hidden=true;picker.setAttribute('role','dialog');picker.tabIndex=-1;picker.setAttribute('aria-label','Escolher horário');picker.setAttribute('aria-describedby','timePickerContext');
  picker.innerHTML=`<div class="time-picker-heading"><p id="timePickerContext"></p><button type="button" class="time-picker-close" data-time-cancel aria-label="Fechar seletor de horário">✕</button></div><div class="time-picker-segments"><div><label for="timePickerHours">Hora</label><input id="timePickerHours" class="time-part-input" inputmode="numeric" type="text" maxlength="2" role="spinbutton" aria-valuemin="0" aria-valuemax="23" autocomplete="off"><div class="time-picker-step"><button type="button" data-time-part="hour" data-time-step="-1" aria-label="Diminuir hora">−</button><button type="button" data-time-part="hour" data-time-step="1" aria-label="Aumentar hora">+</button></div></div><span class="time-picker-colon" aria-hidden="true">:</span><div><label for="timePickerMinutes">Minutos</label><input id="timePickerMinutes" class="time-part-input" inputmode="numeric" type="text" maxlength="2" role="spinbutton" aria-valuemin="0" aria-valuemax="59" autocomplete="off"><div class="time-picker-step"><button type="button" data-time-part="minute" data-time-step="-1" aria-label="Diminuir minuto">−</button><button type="button" data-time-part="minute" data-time-step="1" aria-label="Aumentar minuto">+</button></div></div></div><div class="time-picker-shortcuts" role="group" aria-label="Minutos rápidos">${[0,15,30,45].map(n=>`<button type="button" data-time-minute="${n}" aria-label="${n} minutos">:${pad(n)}</button>`).join('')}</div><p class="time-picker-error" role="status"></p><div class="time-picker-actions"><button type="button" data-time-cancel>Cancelar</button><button type="button" class="primary" data-time-apply>Pronto</button></div>`;
  if(typeof picker.showPopover==='function')picker.setAttribute('popover','auto');
  picker.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.preventDefault();if(b.hasAttribute('data-time-cancel'))return close(true);if(b.hasAttribute('data-time-apply'))return apply();if(b.dataset.timePart)return shift(b.dataset.timePart,+b.dataset.timeStep);if(b.hasAttribute('data-time-minute')){const h=Number(picker.querySelector('#timePickerHours').value)||0;updateParts(Math.min(23,Math.max(0,h)),+b.dataset.timeMinute);}});
  picker.addEventListener('input',()=>{const d=draft();if(d){for(const [id,value]of [['timePickerHours',d.h],['timePickerMinutes',d.m]])picker.querySelector('#'+id).setAttribute('aria-valuenow',value);for(const b of picker.querySelectorAll('[data-time-minute]'))b.setAttribute('aria-pressed',String(+b.dataset.timeMinute===d.m));}picker.querySelector('.time-picker-error').textContent='';});
  picker.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)&&e.target.matches('.time-part-input')){e.preventDefault();shift(e.target.id==='timePickerHours'?'hour':'minute',e.key==='ArrowUp'?1:-1);}else if(e.key==='Enter'&&e.target.matches('.time-part-input')){e.preventDefault();apply();}});
  picker.addEventListener('toggle',e=>{if(e.newState==='closed'&&active&&!picker.matches(':popover-open'))close();});
 }
 function open(input,button){
  if(input.disabled||input.readOnly)return;if(active?.input===input)return close(true);close();createPicker();
  (input.closest('dialog[open]')||doc.body).appendChild(picker);picker.querySelector('#timePickerContext').textContent=button.dataset.timeLabel;
  active={input,button};const value=parse(input.value)||'00:00';updateParts(+value.slice(0,2),+value.slice(3));picker.hidden=false;
  if(picker.hasAttribute('popover'))picker.showPopover();button.setAttribute('aria-expanded','true');position();
  // Focus the panel, not a text box: keyboard navigation works without opening the phone keyboard.
  picker.focus({preventScroll:true});
 }
 function enhance(input){
  if(input.dataset.timeControl)return;const label=input.getAttribute('aria-label')||input.closest('label')?.firstChild?.textContent?.trim()||'Horário';
  input.dataset.timeControl='true';input.setAttribute('aria-label',label);input.type='text';input.inputMode='numeric';input.autocomplete='off';input.maxLength=7;input.pattern='([01][0-9]|2[0-3]):[0-5][0-9]';input.placeholder='HH:MM';input.classList.add('time-control-input');
  const wrapper=doc.createElement('span');wrapper.className='time-control';input.before(wrapper);wrapper.appendChild(input);
  const button=doc.createElement('button');button.type='button';button.className='time-control-open';button.setAttribute('aria-label','Escolher horário · '+label);button.dataset.timeLabel=label;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','constanciaTimePicker');button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';wrapper.appendChild(button);button.onclick=()=>open(input,button);
  input.addEventListener('blur',()=>normalize(input));input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('keydown',e=>{if(e.key==='Enter')normalize(input);else if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();open(input,button);}});
 }
 function scan(){
  if(active&&(!active.input.isConnected||active.input.disabled||active.input.closest('dialog:not([open])')))close();
  for(const input of doc.querySelectorAll('input[type=time]'))enhance(input);
  for(const input of doc.querySelectorAll('input[data-time-control]')){const button=input.parentElement.querySelector('.time-control-open'),disabled=input.disabled||input.readOnly;if(button&&button.disabled!==disabled)button.disabled=disabled;}
 }
 new MutationObserver(scan).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly']});scan();
 doc.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
 doc.addEventListener('pointerdown',e=>{if(active&&!picker.contains(e.target)&&!active.input.parentElement.contains(e.target))close();},true);
 doc.addEventListener('focusin',e=>{if(active&&!picker.contains(e.target)&&!active.input.parentElement.contains(e.target))close();});
 doc.addEventListener('close',e=>{if(active&&e.target.contains(active.input))close();},true);
 doc.addEventListener('scroll',()=>{if(active)position();},true);window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
 window.ConstanciaTimeControls={enhance:scan,parse,editing:root=>!!active&&root.contains(active.input)};
})();
