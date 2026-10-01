(function(root){
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const date=s=>new Date(s+'T12:00:00');
  const shift=(s,n)=>{const d=date(s);d.setDate(d.getDate()+n);return key(d)};
  const scheduled=(h,d)=>d>=h.start&&(!h.archivedOn||d<h.archivedOn)&&h.days.includes(date(d).getDay());
  const day=(state,d)=>{const planned=state.habits.filter(h=>scheduled(h,d)||state.checks[h.id]?.[d]);return {planned:planned.length,done:planned.filter(h=>state.checks[h.id]?.[d]).length}};
  const period=(state,end,n)=>{let planned=0,done=0;const points=[];for(let i=n-1;i>=0;i--){const d=shift(end,-i),v=day(state,d);planned+=v.planned;done+=v.done;points.push({date:d,...v})}return {planned,done,rate:planned?Math.round(done/planned*100):0,points}};
  const streak=(state,today)=>{let d=today,count=0;const first=[...state.habits.map(h=>h.start),...Object.values(state.checks).flatMap(c=>Object.keys(c))].reduce((a,d)=>d<a?d:a,today);const current=day(state,d);if(!current.planned||current.done!==current.planned)d=shift(d,-1);while(d>=first){const v=day(state,d);if(v.planned){if(v.done!==v.planned)break;count++}d=shift(d,-1)}return count};
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(date(s).getTime())&&key(date(s))===s;
  const validate=s=>{if(!s||s.version!==1||!Array.isArray(s.habits)||s.habits.length>100||!s.checks||typeof s.checks!=='object'||Array.isArray(s.checks))throw Error('Arquivo de backup inválido.');const ids=new Set();for(const h of s.habits){if(!h||typeof h.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(h.id)||['constructor','prototype','__proto__'].includes(h.id)||ids.has(h.id)||typeof h.name!=='string'||!h.name.trim()||h.name.length>60||typeof h.goal!=='string'||h.goal.length>80||!validDate(h.start)||!Array.isArray(h.days)||!h.days.length||h.days.some(d=>!Number.isInteger(d)||d<0||d>6)||(h.archivedOn!=null&&!validDate(h.archivedOn)))throw Error('Hábitos inválidos no backup.');ids.add(h.id)}for(const [id,checks]of Object.entries(s.checks)){if(!ids.has(id)||!checks||typeof checks!=='object'||Array.isArray(checks)||Object.entries(checks).some(([d,v])=>!validDate(d)||v!==true))throw Error('Registros inválidos no backup.')}if(s.body!==undefined)root.Body.validate(s.body);return s};
  root.Habits={key,date,shift,scheduled,day,period,streak,validate};
  if(typeof module!=='undefined')module.exports=root.Habits;
})(typeof window!=='undefined'?window:globalThis);
