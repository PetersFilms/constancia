(function(root){
 'use strict';
 class RecoveryStore{
  constructor({storage,indexedDB}){this.storage=storage;this.indexedDB=indexedDB;this.opening=null;}
  open(){
   if(!this.opening)this.opening=new Promise((resolve,reject)=>{
    const request=this.indexedDB.open('constancia-recovery',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('copies');
    request.onerror=()=>{this.opening=null;reject(request.error);};
    request.onblocked=()=>{this.opening=null;reject(Error('Feche outras abas para proteger a recuperação.'));};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.opening=null;};resolve(db);};
   });return this.opening;
  }
  async save(key,raw){
   if(typeof raw!=='string')throw Error('Cópia de recuperação inválida.');
   if(!this.indexedDB){this.storage.setItem(key,raw);return;}
   const db=await this.open();
   await new Promise((resolve,reject)=>{const tx=db.transaction('copies','readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Recuperação interrompida.'));tx.objectStore('copies').put(raw,key);});
   if(await this.read(key)!==raw)throw Error('Não foi possível conferir a recuperação.');
  }
  async read(key){
   if(this.indexedDB){const db=await this.open(),raw=await new Promise((resolve,reject)=>{const request=db.transaction('copies','readonly').objectStore('copies').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});if(typeof raw==='string')return raw;}
   return this.storage.getItem(key);
  }
 }
 root.ConstanciaRecoveryStore=RecoveryStore;
 if(typeof module!=='undefined')module.exports=RecoveryStore;
 else root.ConstanciaRecovery=new RecoveryStore({storage:root.localStorage,indexedDB:root.indexedDB});
})(typeof window!=='undefined'?window:globalThis);
