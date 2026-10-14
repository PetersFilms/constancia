import {digest} from './service.mjs';
export async function receiveNotice(req,rest){
 const id=req.headers.get('X-Goog-Channel-Id')||'',token=req.headers.get('X-Goog-Channel-Token')||'',resource=req.headers.get('X-Goog-Resource-Id')||'',number=req.headers.get('X-Goog-Message-Number')||'',state=req.headers.get('X-Goog-Resource-State');
 if(!/^[a-f0-9-]{36}$/i.test(id)||!token||token.length>256||!resource||resource.length>2048||!/^\d{1,30}$/.test(number)||!['sync','exists','not_exists'].includes(state))return new Response(null,{status:400});
 // Authenticate even the initial sync message; it can precede the watch response.
 const rows=await rest('constancia_calendar_channels?id=eq.'+id+'&token_hash=eq.'+await digest(token)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=resource_id');
 if(!rows?.length||rows[0].resource_id&&rows[0].resource_id!==resource)return new Response(null,{status:403});
 if(state!=='sync')await rest('rpc/constancia_calendar_notice',{method:'POST',body:JSON.stringify({channel_id:id,token_digest:await digest(token),resource,message_no:number})});
 return new Response(null,{status:204});
}
export async function ensureChannels({user,calendars,google,rest,address,clock=Date.now}){
 const rows=await rest('constancia_calendar_channels?user_id=eq.'+user+'&expires_at=gt.'+encodeURIComponent(new Date(clock()+86400000).toISOString())+'&select=calendar_id,expires_at');
 const resources=[{id:'__calendar_list'},...calendars];let expires=Infinity,failed=false;
 for(const c of resources){const existing=rows?.find(r=>r.calendar_id===c.id);if(existing){expires=Math.min(expires,Date.parse(existing.expires_at));continue;}
  const id=crypto.randomUUID(),bytes=crypto.getRandomValues(new Uint8Array(32)),token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),expiration=clock()+6*86400000;
  await rest('constancia_calendar_channels',{method:'POST',body:JSON.stringify({id,user_id:user,calendar_id:c.id,token_hash:await digest(token),expires_at:new Date(expiration).toISOString()})});
  try{const r=await google.watch(c.id,{id,type:'web_hook',address,token,expiration:String(expiration)});if(r.id!==id||!r.resourceId||!Number.isFinite(Number(r.expiration)))throw Error('Invalid watch response');const until=Number(r.expiration);await rest('constancia_calendar_channels?id=eq.'+id,{method:'PATCH',body:JSON.stringify({resource_id:r.resourceId,expires_at:new Date(until).toISOString()})});expires=Math.min(expires,until);}
  catch{failed=true;await rest('constancia_calendar_channels?id=eq.'+id,{method:'PATCH',body:JSON.stringify({expires_at:new Date(clock()).toISOString()})});}
 }
 return {watching:!failed,watchExpires:expires<Infinity?new Date(expires).toISOString():null};
}
