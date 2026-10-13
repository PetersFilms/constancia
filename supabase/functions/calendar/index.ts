import {synchronize,digest,ProviderError} from './service.mjs';
const env=(key:string)=>Deno.env.get(key)||'';
const base=env('SUPABASE_URL'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY'),publicKey=env('SUPABASE_ANON_KEY')||serviceKey;
const appUrls=(env('CALENDAR_APP_URLS')||'https://petersfilms.github.io/constancia/,http://127.0.0.1:8771/').split(',').map(s=>new URL(s.trim()));
const configured=()=>{try{return !!env('GOOGLE_CLIENT_ID')&&!!env('GOOGLE_CLIENT_SECRET')&&decode(env('GOOGLE_TOKEN_KEY')).length===32;}catch{return false;}};
const redirectUri=()=>env('GOOGLE_REDIRECT_URI')||base+'/functions/v1/calendar/callback';
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(text:string)=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function encrypt(value:unknown){const key=decode(env('GOOGLE_TOKEN_KEY'));if(key.length!==32)throw Error('Encryption key unavailable');const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(value)));return {v:1,iv:encode(iv),data:encode(new Uint8Array(cipher))};}
async function decrypt(box:any){const aes=await crypto.subtle.importKey('raw',decode(env('GOOGLE_TOKEN_KEY')),'AES-GCM',false,['decrypt']);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(box.iv)},aes,decode(box.data))));}
async function rest(path:string,options:any={},jwt:string|null=null){
 const response=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:jwt?publicKey:serviceKey,Authorization:'Bearer '+(jwt||serviceKey),'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new ProviderError(response.status,'Não foi possível salvar a sincronização.');const text=await response.text();return text?JSON.parse(text):null;
}
async function userFor(req:Request){const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))throw new ProviderError(401,'Entre na sua conta para continuar.');const response=await fetch(base+'/auth/v1/user',{headers:{Authorization:auth,apikey:publicKey},signal:AbortSignal.timeout(10000)});if(!response.ok)throw new ProviderError(401,'Seu acesso expirou. Entre novamente.');const user=await response.json();if(!user.id)throw new ProviderError(401);return {id:user.id,jwt:auth.slice(7)};}
async function tokenExchange(params:Record<string,string>){const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET')}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new ProviderError(response.status===400?401:response.status,'A autorização do Google expirou. Reconecte sua agenda.');return response.json();}
function allowedReturn(value:string){const url=new URL(value);if(url.username||url.password||!appUrls.some(a=>a.origin===url.origin&&url.pathname.startsWith(a.pathname)))throw new ProviderError(400,'Endereço de retorno não autorizado.');url.search='';url.hash='';return url.toString();}
function json(data:unknown,status:number,cors:Record<string,string>){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...cors}});}
async function callback(req:Request){
 const url=new URL(req.url),state=url.searchParams.get('state');if(!state)return new Response('Conexão inválida.',{status:400});
 const rows=await rest('constancia_calendar_oauth?state_hash=eq.'+await digest(state),{method:'DELETE'}),stored=rows?.[0];
 if(!stored||Date.parse(stored.expires_at)<Date.now())return new Response('Conexão expirada. Volte ao Constância e tente novamente.',{status:400});
 const destination=new URL(allowedReturn(stored.return_url));destination.hash='todo';
 try{
  const code=url.searchParams.get('code');if(!code||url.searchParams.get('error'))throw Error('Consent not completed');
  const verifier=await decrypt(stored.verifier_box),tokens=await tokenExchange({code,code_verifier:verifier.value,redirect_uri:redirectUri(),grant_type:'authorization_code'});
  if(!tokens.refresh_token||!tokens.access_token)throw Error('Offline authorization missing');
  let primary:any,page='',attempts=0;do{const response=await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250'+(page?'&pageToken='+encodeURIComponent(page):''),{headers:{Authorization:'Bearer '+tokens.access_token},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Calendar unavailable');const calendars=await response.json();primary=calendars.items?.find((c:any)=>c.primary);page=calendars.nextPageToken||'';}while(!primary&&page&&++attempts<20);if(!primary)throw Error('Primary calendar missing');
  const token_box=await encrypt({accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:Date.now()+tokens.expires_in*1000});
  // No credentials or calendar content are sent back to the browser.
  const payload={user_id:stored.user_id,account_id:primary.id,token_box,cursors:{},reconnect:false,last_sync:null};
  const existing=await rest('constancia_calendar_connections?user_id=eq.'+stored.user_id+'&select=user_id');
  const saved=existing?.length?await rest('constancia_calendar_connections?user_id=eq.'+stored.user_id+'&lease_until=lt.'+encodeURIComponent(new Date().toISOString()),{method:'PATCH',body:JSON.stringify(payload)}):await rest('constancia_calendar_connections?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(payload)});
  if(!saved?.length)throw Error('Connection busy');
  destination.searchParams.set('calendar','connected');
 }catch{destination.searchParams.set('calendar','failed');}
 return new Response(null,{status:302,headers:{Location:destination.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export async function handler(req:Request){
 const origin=req.headers.get('Origin'),allowed=!origin||appUrls.some(u=>u.origin===origin),cors=allowed&&origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'}:{};
 if(!allowed)return json({error:'Origem não autorizada.'},403,{});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method==='GET'&&new URL(req.url).pathname.endsWith('/callback')){try{return await callback(req);}catch{return new Response('Não foi possível conectar. Volte ao Constância.',{status:400});}}
 if(req.method!=='POST')return json({error:'Método não permitido.'},405,cors);
 try{
  const user=await userFor(req),payloadText=await req.text();if(payloadText.length>8192)throw new ProviderError(413,'Solicitação grande demais.');const input=JSON.parse(payloadText),filter='user_id=eq.'+encodeURIComponent(user.id);
  if(input.action==='status'){
   const rows=await rest('constancia_calendar_connections?'+filter+'&select=reconnect,last_sync,account_id');const row=rows?.[0];
   return json({configured:configured(),connected:!!row,reconnect:!!row?.reconnect,lastSync:row?.last_sync||null,accountId:row?.account_id||null},200,cors);
  }
  if(input.action==='disconnect'){
   const rows=await rest('constancia_calendar_connections?'+filter+'&select=lease_until');if(rows?.[0]?.lease_until&&Date.parse(rows[0].lease_until)>Date.now())throw new ProviderError(409,'Aguarde a sincronização terminar antes de desconectar.');
   // Only revoke this application's credential storage; never delete events or state.
   await rest('constancia_calendar_connections?'+filter,{method:'DELETE'});await rest('constancia_calendar_oauth?'+filter,{method:'DELETE'});return json({connected:false},200,cors);
  }
  if(!configured())return json({error:'O proprietário precisa configurar o cliente OAuth do Google Cloud e os secrets do backend.'},200,cors);
  if(input.action==='connect'){
   const returnUrl=allowedReturn(input.returnUrl),state=encode(crypto.getRandomValues(new Uint8Array(32))),verifier=encode(crypto.getRandomValues(new Uint8Array(32))),stateHash=await digest(state);
   const old=await rest('constancia_calendar_connections?'+filter+'&select=lease_until');if(old?.[0]?.lease_until&&Date.parse(old[0].lease_until)>Date.now())throw new ProviderError(409,'Aguarde a sincronização terminar antes de reconectar.');
   await rest('constancia_calendar_oauth?'+filter,{method:'DELETE'});
   await rest('constancia_calendar_oauth',{method:'POST',body:JSON.stringify({state_hash:stateHash,user_id:user.id,return_url:returnUrl,verifier_box:await encrypt({value:verifier}),expires_at:new Date(Date.now()+600000).toISOString()})});
   const challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),redirect_uri:redirectUri(),response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',access_type:'offline',prompt:'consent select_account',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
   return json({url:url.toString()},200,cors);
  }
  if(input.action!=='sync')throw new ProviderError(400,'Ação inválida.');
  if(input.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date||+input.date.slice(0,4)<1900||+input.date.slice(0,4)>2200))throw new ProviderError(400,'Escolha uma data válida entre 1900 e 2200.');
  const linked=await rest('constancia_calendar_connections?'+filter+'&select=account_id,reconnect');if(!linked?.length||linked[0].reconnect)throw new ProviderError(401,'Reconecte sua conta Google para sincronizar.');
  let connection:any,tokens:any,currentLease:string;
  const db={
   claim:async(lease:string)=>{const rows=await rest('constancia_calendar_connections?'+filter+'&lease_until=lt.'+encodeURIComponent(new Date().toISOString()),{method:'PATCH',body:JSON.stringify({lease_id:lease,lease_until:new Date(Date.now()+120000).toISOString()})});if(rows?.length)currentLease=lease;return !!rows?.length;},
   release:async(lease:string)=>{await rest('constancia_calendar_connections?'+filter+'&lease_id=eq.'+lease,{method:'PATCH',body:JSON.stringify({lease_id:null,lease_until:'1970-01-01T00:00:00Z'})});},
   connection:async()=>{const rows=await rest('constancia_calendar_connections?'+filter);connection=rows?.[0];if(!connection)throw new ProviderError(401,'Conecte sua conta Google.');try{tokens=await decrypt(connection.token_box);}catch{await db.saveConnection({reconnect:true});throw new ProviderError(401,'Reconecte sua conta Google; os registros permanecem protegidos.');}return connection;},
   readState:async()=>{const rows=await rest('constancia_states?'+filter+'&select=state,revision',{},user.jwt);return rows?.[0];},
   saveState:async(revision:number,state:unknown)=>{const result=await rest('rpc/constancia_save',{method:'POST',body:JSON.stringify({owner_id:user.id,expected_revision:revision,next_state:state})},user.jwt);return result.saved;},
   saveConnection:async(values:unknown)=>{await rest('constancia_calendar_connections?'+filter+'&lease_id=eq.'+currentLease,{method:'PATCH',body:JSON.stringify(values)});}
  };
  async function googleRequest(path:string,options:any={},retry=true):Promise<any>{
   if(Date.now()>tokens.expiresAt-60000){let refreshed;try{refreshed=await tokenExchange({grant_type:'refresh_token',refresh_token:tokens.refreshToken});}catch(e){if(e instanceof ProviderError&&e.status===401)await db.saveConnection({reconnect:true});throw e;}tokens={...tokens,accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token||tokens.refreshToken,expiresAt:Date.now()+refreshed.expires_in*1000};await db.saveConnection({token_box:await encrypt(tokens)});}
   const response=await fetch('https://www.googleapis.com/calendar/v3/'+path,{...options,headers:{Authorization:'Bearer '+tokens.accessToken,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
   if(response.status===401&&retry){tokens.expiresAt=0;return googleRequest(path,options,false);}
   if(!response.ok){if(response.status===401)await db.saveConnection({reconnect:true});throw new ProviderError(response.status);}return response.json();
  }
  const google={
   calendars:async()=>{let page='',items:any[]=[];do{const result=await googleRequest('users/me/calendarList?maxResults=250'+(page?'&pageToken='+encodeURIComponent(page):''));items.push(...(result.items||[]));page=result.nextPageToken||'';}while(page);return items.filter(c=>!c.deleted);},
   events:(id:string,query:any)=>googleRequest('calendars/'+encodeURIComponent(id)+'/events?'+new URLSearchParams(query)),
   get:(id:string,event:string)=>googleRequest('calendars/'+encodeURIComponent(id)+'/events/'+encodeURIComponent(event)),
   insert:(id:string,body:any)=>googleRequest('calendars/'+encodeURIComponent(id)+'/events?sendUpdates=none',{method:'POST',body:JSON.stringify(body)}),
   patch:(id:string,event:string,body:any,etag:string)=>googleRequest('calendars/'+encodeURIComponent(id)+'/events/'+encodeURIComponent(event)+'?sendUpdates=none',{method:'PATCH',headers:{'If-Match':etag},body:JSON.stringify(body)})
  };
  try{return json(await synchronize({db,google,user:user.id,date:input.date,pageBudget:3}),200,cors);}
  catch(e){throw e;}
 }catch(e){if(!(e instanceof ProviderError))console.warn('calendar_sync_failure',JSON.stringify({name:e?.name||'Unknown',reason:['Dados do compromisso inválidos.','Datas de dia inteiro inválidas.','O término deve ocorrer depois do início.','Histórico do To-Do inválido.','Item do To-Do inválido.'].includes(e?.message)?e.message:'unexpected',frames:String(e?.stack||'').split('\n').slice(1,4)}));const status=e instanceof ProviderError?e.status:503;return json({error:e instanceof ProviderError?e.message:'A sincronização está indisponível. Seu histórico permanece salvo.'},status,cors);}
}
// JWT checks are performed with Auth.getUser equivalent for every POST. The only
// unauthenticated GET is the OAuth callback, guarded by expiring, single-use state.
Deno.serve(handler);
