// Lembrete diário por Web Push. Ações autenticadas (save/disable/status) vêm do
// aplicativo com o JWT do usuário; /cron é chamada pelo agendamento do banco e é
// idempotente (last_sent limita a um envio por dia por aparelho).
import webpush from 'npm:web-push@3.6.7';
import {due,localParts} from './service.mjs';
const env=(key:string)=>Deno.env.get(key)||'';
const base=env('SUPABASE_URL'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY'),publicKey=env('SUPABASE_ANON_KEY')||serviceKey;
const appUrls=(env('CALENDAR_APP_URLS')||'https://petersfilms.github.io/constancia/,http://127.0.0.1:8771/').split(',').map(s=>new URL(s.trim()));
const vapid=()=>({subject:env('VAPID_SUBJECT')||'mailto:example@example.com',publicKey:env('VAPID_PUBLIC_KEY'),privateKey:env('VAPID_PRIVATE_KEY')});
function json(data:unknown,status:number,cors:Record<string,string>={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...cors}});}
async function rest(path:string,options:any={}){
 const response=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('rest '+response.status);
 const text=await response.text();return text?JSON.parse(text):null;
}
async function userFor(req:Request){
 const auth=req.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))throw Error('Entre na sua conta para continuar.');
 const response=await fetch(base+'/auth/v1/user',{headers:{Authorization:auth,apikey:publicKey},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Seu acesso expirou. Entre novamente.');
 const user=await response.json();if(!user.id)throw Error('Seu acesso expirou. Entre novamente.');
 return user.id as string;
}
function validSubscription(sub:any){
 try{const url=new URL(sub?.endpoint);return url.protocol==='https:'&&typeof sub?.keys?.p256dh==='string'&&typeof sub?.keys?.auth==='string';}catch{return false;}
}
const MESSAGES:Record<string,string>={habitos:'Hora de marcar seus hábitos de hoje.',sono:'Bom dia. Registre como foi sua noite de sono.'};
async function sendDue(){
 const rows=await rest('constancia_push_reminders?enabled=is.true&select=*')||[];
 const now=Date.now(),targets=due(rows,now);
 let sent=0,dropped=0;
 for(const row of targets){
  const today=localParts(now,row.tz).date;
  try{
   await webpush.sendNotification(row.subscription,JSON.stringify({title:'Constância',body:MESSAGES[row.kind]||MESSAGES.habitos,tag:'constancia-'+(row.kind||'habitos')}),{vapidDetails:vapid(),TTL:3600});
   await rest('constancia_push_reminders?id=eq.'+row.id,{method:'PATCH',body:JSON.stringify({last_sent:today})});sent++;
  }catch(failure:any){
   // Assinatura morta (aparelho desinstalou/revogou): desativa em vez de insistir.
   if(failure?.statusCode===404||failure?.statusCode===410){await rest('constancia_push_reminders?id=eq.'+row.id,{method:'PATCH',body:JSON.stringify({enabled:false})});dropped++;}
  }
 }
 return {checked:rows.length,sent,dropped};
}
export async function handler(req:Request){
 if(new URL(req.url).pathname.endsWith('/cron')){
  if(req.method!=='POST')return json({error:'método'},405);
  try{return json(await sendDue(),200);}catch{return json({error:'send failed'},503);}
 }
 const origin=req.headers.get('Origin'),allowed=!origin||appUrls.some(u=>u.origin===origin);
 const cors=allowed&&origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'}:{};
 if(!allowed)return json({error:'Origem não autorizada.'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'método'},405,cors);
 try{
  const user=await userFor(req);
  const body=await req.json().catch(()=>({}));
  const kind=['habitos','sono'].includes(body.kind)?body.kind:'habitos';
  if(body.action==='save'){
   if(!validSubscription(body.subscription))return json({error:'Inscrição de notificação inválida.'},400,cors);
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.remind_at||''))return json({error:'Horário inválido.'},400,cors);
   const tz=typeof body.tz==='string'&&body.tz.length<=64?body.tz:'America/Sao_Paulo';
   await rest('constancia_push_reminders?on_conflict=user_id,endpoint,kind',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:user,endpoint:body.subscription.endpoint,subscription:body.subscription,remind_at:body.remind_at,tz,kind,enabled:true,last_sent:null})});
   return json({enabled:true,remind_at:body.remind_at},200,cors);
  }
  if(body.action==='disable'){
   await rest('constancia_push_reminders?user_id=eq.'+user+'&kind=eq.'+kind+'&endpoint=eq.'+encodeURIComponent(body.endpoint||''),{method:'PATCH',body:JSON.stringify({enabled:false})});
   return json({enabled:false},200,cors);
  }
  if(body.action==='status'){
   const rows=await rest('constancia_push_reminders?user_id=eq.'+user+'&kind=eq.'+kind+'&endpoint=eq.'+encodeURIComponent(body.endpoint||'')+'&select=enabled,remind_at')||[];
   return json(rows[0]||{enabled:false},200,cors);
  }
  return json({error:'Ação desconhecida.'},400,cors);
 }catch(failure:any){
  return json({error:failure?.message||'Não foi possível salvar o lembrete.'},401,cors);
 }
}
Deno.serve(handler);
