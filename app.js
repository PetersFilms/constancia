const H=Habits,$=id=>document.getElementById(id),STORAGE='constancia.v1';
let today=H.key(new Date()),selected=today,month=today.slice(0,7),editing=null,pending=null,toastTimer;
const initial=()=>({version:1,habits:[['Estudo / leitura','Um tempo para aprender, todos os dias.'],['Treino','O movimento que você se propôs a fazer.'],['Alimentação','Cumprir a meta de alimentação que você definiu.']].map(([name,goal],i)=>({id:'habit-'+i,name,goal,start:today,days:[0,1,2,3,4,5,6]})),checks:{}});
let state,recoveryRequired=false,savedRevision=null;
const RECOVERY='constancia.recovery.before-training-v2';
try{
 const saved=localStorage.getItem(STORAGE);savedRevision=saved;
 Persistence.protect(localStorage,RECOVERY,saved);
 state=saved?H.validate(JSON.parse(saved)):initial();let migrated=false;
 if(state.body===undefined){state.body=Body.seed();migrated=true}
 if(state.training===undefined){state.training=Training.seed();migrated=true}
 if(migrated){const serialized=JSON.stringify(state);localStorage.setItem(STORAGE,serialized);savedRevision=serialized;}
}catch(e){state=initial();state.body=Body.seed();state.training=Training.seed();recoveryRequired=true;setTimeout(()=>toast('Os dados originais foram mantidos. Faça um backup e restaure um arquivo válido antes de registrar.'),100)}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(d,opts)=>H.date(d).toLocaleDateString('pt-BR',opts);
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500)}
function commit(next){try{
 H.validate(next);
 if(localStorage.getItem(STORAGE)!==savedRevision){toast('Outra aba alterou os dados. Recarregue para ver os registros atuais antes de salvar.');return false}
 const serialized=JSON.stringify(next);localStorage.setItem(STORAGE,serialized);savedRevision=serialized;state=next;render();return true
}catch(e){toast('Não foi possível salvar. Os registros anteriores foram mantidos; faça um backup.');return false}}
function update(fn){if(recoveryRequired){toast('Restaure um backup para proteger os dados que não puderam ser lidos.');return false}const next=JSON.parse(JSON.stringify(state));fn(next);return commit(next)}
function render(){
 $('dataStatus').hidden=!recoveryRequired;$('dataStatus').textContent=recoveryRequired?'Os dados salvos não puderam ser lidos. A versão original continua no navegador; faça um backup antes de restaurar. Novos registros estão bloqueados para proteger seu histórico.':'';
 if(window.renderBody)window.renderBody();if(window.renderTraining)window.renderTraining();
 today=H.key(new Date());if(selected>today)selected=today;$('date').max=today;$('date').value=selected;$('next').disabled=selected>=today;
 const daily=H.day(state,today),p=H.period(state,today,Number($('range').value)),total=Object.values(state.checks).reduce((sum,c)=>sum+Object.values(c).filter(Boolean).length,0),streak=H.streak(state,today);
 $('stats').innerHTML=`<div class="stat"><span class="label">Hoje</span><strong>${daily.done} <span>/ ${daily.planned}</span></strong><small>${daily.planned&&daily.done===daily.planned?'Seu dia está completo.':'Hábitos concluídos'}</small></div><div class="stat"><span class="label">Sequência atual</span><strong>${streak} <span>${streak===1?'dia':'dias'}</span></strong><small>Dias previstos completos</small></div><div class="stat"><span class="label">Pequenos avanços</span><strong>${total}</strong><small>Registros desde o início</small></div>`;
 $('dayTitle').textContent=selected===today?'Hábitos de hoje':format(selected,{day:'numeric',month:'long'});
 const visible=state.habits.filter(h=>H.scheduled(h,selected)||state.checks[h.id]?.[selected]);
 $('habitList').innerHTML=visible.length?visible.map(h=>{const checked=!!state.checks[h.id]?.[selected];return `<div class="habit-row ${checked?'done':''}"><button class="check" aria-label="${checked?'Desmarcar':'Concluir'} ${esc(h.name)}" aria-pressed="${checked}" data-toggle="${h.id}">✓</button><div class="habit-info"><strong>${esc(h.name)}</strong><p>${esc(h.goal||'Um passo de cada vez.')}</p></div><button class="quiet edit" aria-label="Editar ${esc(h.name)}" data-edit="${h.id}">···</button></div>`}).join(''):'<div class="empty">Nenhum hábito previsto para este dia.<br>Você pode criar um hábito ou escolher outra data.</div>';
 const sd=H.day(state,selected);$('daySummary').textContent=`${sd.done} de ${sd.planned} ${sd.planned===1?'concluído':'concluídos'}`;
 $('rate').innerHTML=`${p.rate}<span>%</span>`;
 const previous=H.period(state,H.shift(today,-p.points.length),p.points.length);
 $('comparison').textContent=!p.planned?'Seu gráfico começa com o primeiro hábito.':!previous.planned?'Seu ponto de partida. Cada registro constrói o próximo.':`${p.rate-previous.rate>0?'+':''}${p.rate-previous.rate} pontos percentuais em relação aos ${p.points.length} dias anteriores.`;
 renderChart(p);renderCalendar();if($('dayDialog').open)renderDayChoices();
 const archived=state.habits.filter(h=>h.archivedOn);$('archiveCount').textContent=`(${archived.length})`;$('archivedList').innerHTML=archived.length?archived.map(h=>`<div class="archived-row"><span>${esc(h.name)}</span><button class="quiet" data-restore="${h.id}">Reativar</button></div>`).join(''):'<p>Nenhum hábito arquivado.</p>';
}
function renderChart(p){
 const w=390,l=30,r=8,top=12,bottom=112,step=(w-l-r)/(p.points.length-1);
 let path='',open=false;const nodes=[];
 p.points.forEach((v,i)=>{const x=l+i*step,y=bottom-(v.planned?v.done/v.planned:0)*(bottom-top);if(!v.planned){open=false;return}path+=`${open?'L':'M'}${x},${y} `;open=true;nodes.push(`<circle cx="${x}" cy="${y}" r="${p.points.length>30?2:3}" fill="#315e48"><title>${format(v.date,{day:'2-digit',month:'2-digit'})}: ${v.done} de ${v.planned}</title></circle>`)});
 $('chart').innerHTML=`<svg viewBox="0 0 ${w} 140" role="img" aria-label="Evolução dos últimos ${p.points.length} dias: ${p.done} de ${p.planned} hábitos cumpridos, ${p.rate} por cento.">${[0,50,100].map(v=>`<line x1="${l}" x2="${w-r}" y1="${bottom-v}" y2="${bottom-v}" stroke="#edf0e9" stroke-dasharray="3 4"/><text x="0" y="${bottom-v+3}" fill="#8b9389" font-size="8">${v}%</text>`).join('')}<path d="${path}" fill="none" stroke="#315e48" stroke-width="2" stroke-linejoin="round"/>${nodes.join('')}<text x="${l}" y="136" fill="#8b9389" font-size="8">${format(p.points[0].date,{day:'2-digit',month:'short'})}</text><text x="${w-r}" y="136" text-anchor="end" fill="#8b9389" font-size="8">Hoje</text></svg>`;
}
function renderCalendar(){const start=month+'-01',first=H.date(start),length=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),offset=(first.getDay()+6)%7;
 $('monthLabel').textContent=format(start,{month:'long',year:'numeric'});$('nextMonth').disabled=month>=today.slice(0,7);
 $('calendar').innerHTML=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<div class="weekday">${x}</div>`).join('')+'<span></span>'.repeat(offset)+Array.from({length},(_,i)=>{const d=H.shift(start,i),v=H.day(state,d),level=v.planned&&v.done?Math.ceil(v.done/v.planned*4):0;return `<button class="day ${d===today?'today':''} ${d===selected?'selected':''}" data-day="${d}" data-level="${level}" ${d>today?'disabled':''} aria-label="${format(d,{day:'numeric',month:'long'})}: ${v.done} de ${v.planned} concluídos" title="${v.done} de ${v.planned} concluídos">${i+1}</button>`}).join('');
}
function choose(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||H.key(H.date(d))!==d||d>today)return;selected=d;month=d.slice(0,7);render()}
function openEditor(id){editing=id||null;const h=state.habits.find(x=>x.id===id);$('dialogTitle').textContent=h?'Editar hábito':'Novo hábito';$('name').value=h?.name||'';$('goal').value=h?.goal||'';$('start').value=h?.start||selected;$('archive').hidden=!h;$('weekdays').innerHTML=['D','S','T','Q','Q','S','S'].map((label,i)=>`<label title="${['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][i]}"><input type="checkbox" name="days" value="${i}" aria-label="${['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][i]}" ${(h?.days||[0,1,2,3,4,5,6]).includes(i)?'checked':''}><span>${label}</span></label>`).join('');$('editor').showModal();$('name').focus()}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.toggle){update(s=>{const id=t.dataset.toggle;s.checks[id]??={};if(s.checks[id][selected])delete s.checks[id][selected];else s.checks[id][selected]=true})}if(t.dataset.edit)openEditor(t.dataset.edit);if(t.dataset.day){choose(t.dataset.day);openDay();}if(t.dataset.restore){update(s=>{delete s.habits.find(h=>h.id===t.dataset.restore).archivedOn});toast('Hábito reativado. A programação original foi retomada.')}});
 $('add').onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();$('date').onchange=e=>choose(e.target.value);$('prev').onclick=()=>choose(H.shift(selected,-1));$('next').onclick=()=>choose(H.shift(selected,1));$('today').onclick=()=>choose(today);$('range').onchange=render;
function changeMonth(n){const d=H.date(month+'-01');d.setMonth(d.getMonth()+n);month=H.key(d).slice(0,7);renderCalendar()}$('prevMonth').onclick=()=>changeMonth(-1);$('nextMonth').onclick=()=>changeMonth(1);
$('habitForm').onsubmit=e=>{e.preventDefault();const days=[...document.querySelectorAll('input[name=days]:checked')].map(x=>Number(x.value)),name=$('name').value.trim();if(!name||!days.length){toast('Dê um nome ao hábito e escolha pelo menos um dia.');return}const ok=update(s=>{const h={id:editing||crypto.randomUUID(),name,goal:$('goal').value.trim(),start:$('start').value,days};const i=s.habits.findIndex(x=>x.id===editing);if(i>=0)s.habits[i]={...s.habits[i],...h};else s.habits.push(h)});if(ok){$('editor').close();toast('Hábito salvo.')}};
$('archive').onclick=()=>{if(update(s=>{s.habits.find(h=>h.id===editing).archivedOn=today})){$('editor').close();toast('Hábito arquivado. Seus registros foram preservados.')}};
function downloadBackup(content,name){const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export').onclick=()=>{downloadBackup(localStorage.getItem(STORAGE)||JSON.stringify(state,null,2),`constancia-${today}.json`);toast('Backup preparado para download.')};
$('recoveryBackup').onclick=()=>{const raw=localStorage.getItem(RECOVERY);if(!raw){toast('Não há uma cópia anterior nesta origem do navegador.');return}downloadBackup(raw,'constancia-antes-da-atualizacao.json');toast('Cópia anterior preparada para download.')};
$('restore').onclick=()=>$('import').click();$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;pending=null;try{if(f.size>15000000)throw Error('Arquivo grande demais.');const incoming=JSON.parse(await f.text());pending=Persistence.restore(incoming,state);pending=H.validate(pending);$('restoreDialog').showModal()}catch(err){pending=null;toast('Esse arquivo não é um backup válido do Constância. Os dados atuais foram preservados.')}e.target.value=''};
$('cancelRestore').onclick=()=>{pending=null;$('restoreDialog').close()};$('confirmRestore').onclick=()=>{if(!pending)return;try{const raw=localStorage.getItem(STORAGE);if(raw!==null)localStorage.setItem('constancia.recovery.before-restore',raw);}catch{toast('Não foi possível proteger os dados anteriores. A restauração foi cancelada.');return;}if(commit(pending)){recoveryRequired=false;pending=null;$('restoreDialog').close();toast('Backup restaurado. Partes ausentes no arquivo foram preservadas.')}};
window.addEventListener('storage',e=>{if(e.key===STORAGE&&e.newValue){try{const incoming=H.validate(JSON.parse(e.newValue));state=incoming;savedRevision=e.newValue;recoveryRequired=false;render()}catch{recoveryRequired=true;toast('Os dados de outra aba não puderam ser lidos. Os registros foram mantidos.')}}});
window.addEventListener('focus',()=>{if(H.key(new Date())!==today)render()});render();

$('past').onclick=()=>{ $('pastDate').max=today;$('pastDate').value=selected;$('pastHabit').innerHTML=state.habits.map(h=>`<option value="${h.id}">${esc(h.name)}${h.archivedOn?' (arquivado)':''}</option>`).join('');$('pastDialog').showModal() };
$('closePast').onclick=()=>$('pastDialog').close();
$('pastForm').onsubmit=e=>{e.preventDefault();const d=$('pastDate').value,id=$('pastHabit').value;if(!d||H.key(H.date(d))!==d||d>today||!state.habits.some(h=>h.id===id)){toast('Escolha um hábito e uma data até hoje.');return}const existed=!!state.checks[id]?.[d];if(update(s=>{s.checks[id]??={};s.checks[id][d]=true})){$('pastDialog').close();choose(d);toast(existed?'Esse hábito já estava registrado nessa data.':'Conclusão registrada no histórico.')}};
$('newPastHabit').onclick=()=>{const d=$('pastDate').value;if(!d||H.key(H.date(d))!==d||d>today){toast('Escolha uma data até hoje.');return}$('pastDialog').close();choose(d);openEditor();toast('Crie o hábito e marque a conclusão na data escolhida.')};

function renderDayChoices(){
 $('dayDialogTitle').textContent=format(selected,{day:'numeric',month:'long',year:'numeric'});
 const habits=state.habits.filter(h=>!h.archivedOn||selected<h.archivedOn||state.checks[h.id]?.[selected]);
 $('dayChoices').innerHTML=habits.length?habits.map(h=>`<label class="day-choice"><input type="checkbox" data-day-habit="${h.id}" ${state.checks[h.id]?.[selected]?'checked':''}><span><strong>${esc(h.name)}</strong><small>${esc(h.goal||'')}</small></span></label>`).join(''):'<p class="empty">Nenhum hábito disponível. Crie um hábito para registrar este dia.</p>';
}
function openDay(){renderDayChoices();$('daySaved').textContent='Marque os hábitos realizados. Salvo automaticamente.';$('dayDialog').showModal()}
$('dayChoices').addEventListener('change',e=>{const input=e.target,id=input.dataset.dayHabit;if(!id)return;const checked=input.checked;const ok=update(s=>{s.checks[id]??={};if(checked)s.checks[id][selected]=true;else delete s.checks[id][selected]});if(!ok)input.checked=!checked;else{$('daySaved').textContent='Alteração salva.';[...$('dayChoices').querySelectorAll('input')].find(el=>el.dataset.dayHabit===id)?.focus()}});
$('closeDay').onclick=$('dayDone').onclick=()=>$('dayDialog').close();
$('dayNew').onclick=()=>{$('dayDialog').close();openEditor()};
