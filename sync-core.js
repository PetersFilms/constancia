(function(root){
 'use strict';
 const missing=Symbol('missing'),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>x===missing?missing:JSON.parse(JSON.stringify(x));
 function equal(a,b){if(a===missing||b===missing)return a===b;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));if(plain(a)&&plain(b)){const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));}return a===b;}
 const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
 const identity=path=>path==='habits'||path==='training.sessions'?'id':path==='body.weights'||path==='body.records'?'date':path==='training.exercises'||path==='training.workouts'?'name':null;
 // Three-way merging recognizes removals. Sets and assessment records remain atomic.
 function reconcile(base,local,remote,prefer='local'){
  const conflicts=[];
  function merge(b,l,r,path,atomic=false){
   if(equal(l,r))return copy(l);if(equal(l,b))return copy(r);if(equal(r,b))return copy(l);
   if(!atomic&&plain(l)&&plain(r)&&(plain(b)||b===missing)){
    const out={};for(const k of new Set([...Object.keys(b===missing?{}:b),...Object.keys(l),...Object.keys(r)])){
     if(['__proto__','constructor','prototype'].includes(k))continue;
     const value=merge(b!==missing&&Object.hasOwn(b,k)?b[k]:missing,Object.hasOwn(l,k)?l[k]:missing,Object.hasOwn(r,k)?r[k]:missing,path?path+'.'+k:k);
     if(value!==missing)Object.defineProperty(out,k,{value,writable:true,enumerable:true,configurable:true});
    }return out;
   }
   const key=identity(path);
   if(!atomic&&key&&Array.isArray(l)&&Array.isArray(r)&&(Array.isArray(b)||b===missing)){
    const id=x=>key==='name'?norm(x[key]):x[key],bm=new Map((b===missing?[]:b).map(x=>[id(x),x])),lm=new Map(l.map(x=>[id(x),x])),rm=new Map(r.map(x=>[id(x),x])),out=[];
    for(const k of new Set([...rm.keys(),...lm.keys(),...bm.keys()])){
     const value=merge(bm.has(k)?bm.get(k):missing,lm.has(k)?lm.get(k):missing,rm.has(k)?rm.get(k):missing,path+':'+k,true);
     if(value!==missing)out.push(value);
    }return out;
   }
   conflicts.push(path||'histórico');return copy(prefer==='remote'?r:l);
  }
  return {state:merge(base??missing,local,remote,''),conflicts};
 }
 root.ConstanciaSyncCore={equal,reconcile};if(typeof module!=='undefined')module.exports=root.ConstanciaSyncCore;
})(typeof window!=='undefined'?window:globalThis);
