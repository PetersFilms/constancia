// Regras puras do lembrete: que horas são no fuso do aparelho e quem está devido.
// Um lembrete é devido quando está ativo, o relógio local já passou do horário
// escolhido e ainda não houve envio na data local de hoje (catch-up no mesmo dia).
const FALLBACK_TZ='America/Sao_Paulo';

export function localParts(nowMs,tz){
 let zone=tz||FALLBACK_TZ;
 let parts;
 try{parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(nowMs));}
 catch{parts=new Intl.DateTimeFormat('en-CA',{timeZone:FALLBACK_TZ,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(nowMs));}
 const get=type=>parts.find(p=>p.type===type).value;
 // "24" aparece em algumas ICU para meia-noite; normaliza para 0.
 const hour=Number(get('hour'))%24;
 return {date:get('year')+'-'+get('month')+'-'+get('day'),minutes:hour*60+Number(get('minute'))};
}

const minutesOf=hhmm=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm||'');return m?Number(m[1])*60+Number(m[2]):null;}

export function due(rows,nowMs){
 return (rows||[]).filter(row=>{
  if(!row.enabled)return false;
  const target=minutesOf(row.remind_at);
  if(target===null)return false;
  const local=localParts(nowMs,row.tz);
  return local.minutes>=target&&row.last_sent!==local.date;
 });
}
