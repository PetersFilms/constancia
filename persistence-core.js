(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const plain=x=>x!=null&&typeof x==='object'&&!Array.isArray(x);
 // Fill only absent fields. Present arrays (including empty ones) are intentional.
 function restore(incoming,current){const result=clone(incoming);function fill(target,source){if(!plain(target)||!plain(source))return;for(const key of Object.keys(source)){if(['__proto__','constructor','prototype'].includes(key))continue;if(!Object.hasOwn(target,key))Object.defineProperty(target,key,{value:clone(source[key]),writable:true,enumerable:true,configurable:true});else if(plain(target[key])&&plain(source[key]))fill(target[key],source[key]);}}fill(result,current);return result;}
 function protect(store,key,raw){if(raw!==null&&store.getItem(key)===null)store.setItem(key,raw);}
 root.Persistence={clone,restore,protect};if(typeof module!=='undefined')module.exports=root.Persistence;
})(typeof window!=='undefined'?window:globalThis);
