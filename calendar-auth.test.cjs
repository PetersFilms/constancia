const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module'),{pathToFileURL}=require('node:url');
test('HTTP auth, encrypted OAuth/PKCE, callback replay, token refresh and disconnect use only fake services',async()=>{
 const originalFetch=global.fetch,originalDeno=global.Deno;
 const secret='fake-client-secret',refresh='fake-refresh-token',access='fake-access-token',uid='00000000-0000-0000-0000-000000000001';
 const env={SUPABASE_URL:'https://supabase-fake.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-service-key',SUPABASE_ANON_KEY:'fake-anon',GOOGLE_CLIENT_ID:'fake-client-id',GOOGLE_CLIENT_SECRET:secret,GOOGLE_TOKEN_KEY:Buffer.alloc(32,1).toString('base64url')};
 let states=[],connections=[],revision=1,data={version:1,habits:[],checks:{},todo:require('./todo-core.js').seed()},refreshes=0,verifierSent=null;
 const seen=[];
 const ok=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 global.Deno={env:{get:k=>env[k]},serve:()=>{}};
 global.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET',body=options.body?String(options.body):null;seen.push({url:u.toString(),method,body});
  if(u.hostname==='supabase-fake.invalid'){
   const headers=new Headers(options.headers);if(u.pathname==='/auth/v1/user')return headers.get('Authorization')==='Bearer valid-user'?ok({id:uid}):ok({},401);
   if(u.pathname.endsWith('/constancia_calendar_oauth')){
    if(method==='POST'){states.push(JSON.parse(body));return ok(states,201);}if(method==='DELETE'){const hash=u.searchParams.get('state_hash')?.slice(3);const rows=hash?states.filter(x=>x.state_hash===hash):states;states=hash?states.filter(x=>x.state_hash!==hash):[];return ok(rows);}return ok(states);
   }
   if(u.pathname.endsWith('/constancia_calendar_connections')){
    if(method==='POST'){connections=[JSON.parse(body)];return ok(connections,201);}if(method==='DELETE'){connections=[];return ok([]);}if(method==='PATCH'){
     const where=u.searchParams.get('lease_until');if(where?.startsWith('lt.')&&connections[0]?.lease_until&&Date.parse(connections[0].lease_until)>=Date.parse(where.slice(3)))return ok([]);
     const lease=u.searchParams.get('lease_id');if(lease?.startsWith('eq.')&&connections[0]?.lease_id!==lease.slice(3))return ok([]);
     if(!connections.length)return ok([]);Object.assign(connections[0],JSON.parse(body));return ok(connections);
    }return ok(connections);
   }
   if(u.pathname.endsWith('/constancia_states'))return ok([{state:structuredClone(data),revision}]);
   if(u.pathname.endsWith('/rpc/constancia_save')){const b=JSON.parse(body);assert.equal(b.owner_id,uid);assert.equal(headers.get('Authorization'),'Bearer valid-user');const saved=b.expected_revision===revision;if(saved){data=b.next_state;revision++;}return ok({saved,state:data,revision});}
  }
  if(u.hostname==='oauth2.googleapis.com'){const params=new URLSearchParams(body);assert.equal(params.get('client_secret'),secret);if(params.get('grant_type')==='refresh_token'){assert.equal(params.get('refresh_token'),refresh);refreshes++;return ok({access_token:access,expires_in:3600});}verifierSent=params.get('code_verifier');return ok({access_token:access,refresh_token:refresh,expires_in:0});}
  if(u.hostname==='www.googleapis.com'){
   assert.equal(new Headers(options.headers).get('Authorization'),'Bearer '+access);
   if(u.pathname.endsWith('/calendarList'))return ok({items:[{id:'google-account',summary:'Teste',summaryOverride:'Pessoal',primary:true,accessRole:'owner',timeZone:'America/Sao_Paulo'},{id:'work',summary:'Trabalho',primary:false,accessRole:'reader',timeZone:'America/Sao_Paulo'},{id:'brazil#holiday@group.v.calendar.google.com',summary:'Feriados'}]});
   if(u.pathname.endsWith('/events'))return ok({items:[],nextSyncToken:'token'});
  }
  throw Error('Unexpected network target '+url);
 };
 try{
  let source=fs.readFileSync('supabase/functions/calendar/index.ts','utf8');source=source.replace("'./service.mjs'",JSON.stringify(pathToFileURL(require('node:path').resolve('supabase/functions/calendar/service.mjs')).href));
  const code=stripTypeScriptTypes(source),{handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const post=(action,extra={},headers={})=>handler(new Request('https://supabase-fake.invalid/functions/v1/calendar',{method:'POST',headers:{Authorization:'Bearer valid-user','Content-Type':'application/json',Origin:'http://127.0.0.1:8771',...headers},body:JSON.stringify({action,...extra})}));
  assert.equal((await post('status',{}, {Authorization:''})).status,401);
  assert.equal((await post('status',{}, {Origin:'https://evil.invalid'})).status,403);
  assert.equal((await post('connect',{returnUrl:'https://evil.invalid/'})).status,400);
  let result=await (await post('connect',{returnUrl:'http://127.0.0.1:8771/'})).json();const url=new URL(result.url),state=url.searchParams.get('state');assert(state);assert.equal(url.searchParams.get('access_type'),'offline');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert(!JSON.stringify(states).includes(secret));assert(!JSON.stringify(states).includes(state));
  const callback=new Request('https://supabase-fake.invalid/functions/v1/calendar/callback?state='+state+'&code=fake-code');const redirect=await handler(callback);assert.equal(redirect.status,302);assert.match(redirect.headers.get('Location'),/calendar=connected#todo/);
  const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifierSent))).toString('base64url');assert.equal(challenge,url.searchParams.get('code_challenge'));
  assert.equal(connections.length,1);connections[0].lease_until='1970-01-01T00:00:00Z';assert(!JSON.stringify(connections).includes(refresh));assert(!JSON.stringify(connections).includes(access));
  assert.equal((await handler(callback)).status,400);
  const status=await (await post('status')).json();assert.equal(status.connected,true);assert(!JSON.stringify(status).includes('token_box'));assert(!JSON.stringify(status).includes(refresh));
  assert.equal((await post('calendars',{}, {Authorization:''})).status,401);assert.equal((await post('calendars',{}, {Origin:'https://evil.invalid'})).status,403);const prior=structuredClone(data),priorRevision=revision;const requestsBefore=seen.length;result=await (await post('calendars')).json();assert.deepEqual(result.calendars.map(c=>c.summary),['Pessoal','Trabalho']);assert.equal(result.calendars[0].primary,true);assert.equal(result.accountId,'google-account');assert.equal(result.token_box,undefined);assert(!JSON.stringify(result).includes(access));assert.deepEqual(data,prior);assert.equal(revision,priorRevision);assert(!seen.slice(requestsBefore).some(x=>x.url.includes('/events')));assert.equal(connections[0].lease_id,null);connections[0].lease_until=new Date(Date.now()+60000).toISOString();assert.equal((await (await post('calendars')).json()).busy,true);connections[0].lease_until='1970-01-01T00:00:00Z';
  result=await (await post('sync',{date:'2026-10-13'})).json();assert.equal(result.connected,true);assert.equal(refreshes,1);assert.equal(connections[0].lease_id,null);assert.equal(data.habits.length,0);
  const before=structuredClone(data);result=await (await post('disconnect')).json();assert.equal(result.connected,false);assert.deepEqual(data,before);assert.equal(connections.length,0);assert(!seen.some(x=>x.url.includes('googleapis.com/calendar')&&x.method==='DELETE'));
  delete env.GOOGLE_CLIENT_SECRET;result=await (await post('connect',{returnUrl:'http://127.0.0.1:8771/'})).json();assert.match(result.error,/configurar/);
 }finally{global.fetch=originalFetch;global.Deno=originalDeno;}
});
