(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const plain=x=>x!=null&&typeof x==='object'&&!Array.isArray(x);
 // Fill only absent fields. Present arrays (including empty ones) are intentional.
 function restore(incoming,current){const result=clone(incoming);function fill(target,source){if(!plain(target)||!plain(source))return;for(const key of Object.keys(source)){if(['__proto__','constructor','prototype'].includes(key))continue;if(!Object.hasOwn(target,key))Object.defineProperty(target,key,{value:clone(source[key]),writable:true,enumerable:true,configurable:true});else if(plain(target[key])&&plain(source[key]))fill(target[key],source[key]);}}fill(result,current);return result;}
 function protect(store,key,raw){if(raw!==null&&store.getItem(key)===null)store.setItem(key,raw);}
 // Combine collections by their stable identity; existing records win conflicts.
 function merge(incoming,current){
  const conflicts=[];const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const norm=s=>String(s).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();
  function combine(a,b,path){
   if(a===undefined)return clone(b);if(b===undefined)return clone(a);
   if(plain(a)&&plain(b)){const out=clone(a);for(const k of Object.keys(b)){if(['__proto__','constructor','prototype'].includes(k))continue;Object.defineProperty(out,k,{value:combine(a[k],b[k],path?path+'.'+k:k),writable:true,enumerable:true,configurable:true});}return out;}
   if(Array.isArray(a)&&Array.isArray(b)){
    // Field arrays inside an identified record are kept intact, never mixed.
    const identified=path==='habits'?'id':path==='body.records'||path==='body.weights'?'date':path==='training.sessions'?'id':path==='training.exercises'||path==='training.workouts'?'name':null;
    if(identified){const out=clone(a),key=x=>identified==='name'?norm(x.name):x[identified];const map=new Map(out.map((x,i)=>[key(x),i]));for(const item of b){const k=key(item);if(!map.has(k)){map.set(k,out.length);out.push(clone(item));}else{const i=map.get(k);if(!equal(out[i],item)){const filled=restore(out[i],item);if(!equal(filled,restore(item,out[i])))conflicts.push(path+':'+k);out[i]=filled;}}}return out;}
    // Preserve new collections belonging to future areas too.
    if(path.startsWith('habits.')||path.startsWith('training.sessions.')||path.startsWith('body.records.'))return clone(a);
    const out=clone(a);for(const item of b)if(!out.some(x=>equal(x,item)))out.push(clone(item));return out;
   }
   return clone(a);
  }
  const state=combine(current,incoming,'');
  // Assessments are identified by date. Keep the existing id on a same-day merge.
  return {state,conflicts};
 }
 root.Persistence={clone,restore,merge,protect};if(typeof module!=='undefined')module.exports=root.Persistence;
})(typeof window!=='undefined'?window:globalThis);
