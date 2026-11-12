(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 // Chave pública VAPID do lembrete; o par privado vive só nos segredos da função push.
 const VAPID='BGVO9YpEWJpawyZcv-JGo3Sd5apJxxkkufSVVKcYefjocIEgegKajNGzvPhqOPHVitk3Xg5di9yANxWRsIsNing';
 const toggle=$('reminderToggle'),time=$('reminderTime'),note=$('reminderStatus');
 if(!toggle||!time||!note)return;
 const supported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const cloud=()=>window.ConstanciaPushCloud;
 const key=s=>{const pad='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob((s+pad).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));};
 let current=null,busy=false;
 function render(message){
  const on=!!current?.enabled;
  toggle.textContent=on?'Desativar lembrete':'Ativar lembrete';
  time.disabled=busy;toggle.disabled=busy;
  note.textContent=message??(on?'Lembrete ativo neste aparelho às '+time.value+'.':'Uma notificação por dia, no horário escolhido, neste aparelho.');
 }
 async function subscription(create){
  const registration=await navigator.serviceWorker.ready;
  let sub=await registration.pushManager.getSubscription();
  if(!sub&&create)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key(VAPID)});
  return sub;
 }
 async function refresh(){
  if(!supported()){toggle.disabled=true;time.disabled=true;note.textContent='Este navegador não recebe notificações. No iPhone, instale o Constância pela tela de início (Compartilhar → Adicionar à Tela de Início).';return;}
  if(!cloud()?.available()){current=null;render('Entre na sua conta para ativar o lembrete.');return;}
  try{
   const sub=await subscription(false);
   current=sub?await cloud().invoke('status',{endpoint:sub.endpoint}):null;
   if(current?.remind_at)time.value=current.remind_at;
   render();
  }catch{render('Não foi possível conferir o lembrete agora.');}
 }
 async function save(){
  const sub=await subscription(true);
  const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'America/Sao_Paulo';
  current=await cloud().invoke('save',{subscription:sub.toJSON(),remind_at:time.value||'20:00',tz});
 }
 toggle.onclick=async()=>{
  if(busy)return;busy=true;render();
  try{
   if(current?.enabled){
    const sub=await subscription(false);
    if(sub)await cloud().invoke('disable',{endpoint:sub.endpoint});
    current={enabled:false};
   }else{
    if(await Notification.requestPermission()!=='granted'){render('Permita notificações nos ajustes para receber o lembrete.');return;}
    await save();
   }
   busy=false;render();
  }catch(failure){busy=false;render(failure.message);}
 };
 time.onchange=async()=>{
  if(!current?.enabled||busy)return;busy=true;render();
  try{await save();busy=false;render();}
  catch(failure){busy=false;render(failure.message);}
 };
 window.addEventListener('constancia:account',refresh);
 refresh();
})();
