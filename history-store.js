(function(root){
 'use strict';
 // Keep the original JSON and stable key. IndexedDB is used only when localStorage
 // cannot fit the larger history; legacy histories and recovery keys are untouched.
 class HistoryStore{
  constructor({storage,indexedDB,notify=()=>{}}){Object.assign(this,{storage,indexedDB,notify});this.key='constancia.v1';this.syncKey='constancia.sync.v1';this.raw=storage.getItem(this.key);this.persisted=this.raw;this.syncRaw=storage.getItem(this.syncKey);this.syncPersisted=this.syncRaw;this.syncIndexed=false;this.mode='local';this.tail=Promise.resolve();this.failure=null;}
  async init(){if(!this.indexedDB)return;this.db=await new Promise((resolve,reject)=>{const r=this.indexedDB.open('constancia-history',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Feche outras abas para abrir o histórico.'));});const raw=await this.readDB();if(typeof raw==='string'){this.mode='indexed';this.raw=this.persisted=raw;}const meta=await this.readDB(this.syncKey);if(typeof meta==='string'){this.syncIndexed=true;this.syncRaw=this.syncPersisted=meta;}}
  readDB(key=this.key){return new Promise((resolve,reject)=>{const r=this.db.transaction('records','readonly').objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  getItem(key){return key===this.key?(this.mode==='local'?this.storage.getItem(key):this.raw):key===this.syncKey?(this.syncIndexed?this.syncRaw:this.storage.getItem(key)):this.storage.getItem(key);}
  setItem(key,raw){
   if(key!==this.key&&key!==this.syncKey)return this.storage.setItem(key,raw);
   if(key===this.syncKey){if(this.failure)throw this.failure;if(!this.syncIndexed&&this.mode==='local'){try{this.storage.setItem(key,raw);this.syncRaw=this.syncPersisted=raw;return;}catch(e){if(e.name!=='QuotaExceededError'||!this.db)throw e;}}if(!this.syncIndexed){this.syncIndexed=true;this.syncPersisted=null;}this.syncRaw=raw;this.tail=this.tail.then(()=>this.writeDB(raw,key)).catch(error=>{this.failure=error;throw error;});this.tail.catch(()=>{});return;}
   if(this.failure)throw this.failure;if(typeof raw!=='string')throw Error('Histórico inválido.');
   if(this.mode==='local'){if(this.storage.getItem(key)!==this.raw)throw Error('Outra aba atualizou o histórico. Reabra o aplicativo.');try{this.storage.setItem(key,raw);this.raw=this.persisted=raw;return;}catch(e){if(e.name!=='QuotaExceededError'||!this.db)throw e;this.mode='indexed';this.persisted=null;}}
   const previous=this.raw;this.raw=raw;
   this.tail=this.tail.then(()=>this.writeDB(raw)).catch(error=>{this.failure=error;this.raw=this.persisted??previous;this.notify('error',{raw:this.raw,error});throw error;});
   // Observe rejections even when a form uses an optimistic UI. settle() still rejects.
   this.tail.catch(()=>{});
  }
  async writeDB(raw,key=this.key){const expected=key===this.key?this.persisted:this.syncPersisted;await new Promise((resolve,reject)=>{const tx=this.db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get(key);let stale=false;r.onsuccess=()=>{if((r.result??null)!==expected){stale=true;tx.abort();return;}store.put(raw,key);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(stale?Error('Outra aba atualizou o histórico. Reabra o aplicativo.'):tx.error||Error('A gravação foi interrompida.'));});if(key===this.key)this.persisted=raw;else this.syncPersisted=raw;this.notify('saved',{raw});}
  observeLocal(key,raw){if(key===this.key&&this.mode==='local'){this.raw=this.persisted=raw;this.notify('external',{raw});}if(key===this.syncKey&&!this.syncIndexed)this.syncRaw=this.syncPersisted=raw;}
  settle(){return this.tail;}
  async refresh(){await this.settle();if(!this.db)return;const raw=await this.readDB();const meta=await this.readDB(this.syncKey);if(typeof meta==='string'){this.syncIndexed=true;this.syncRaw=this.syncPersisted=meta;}if(typeof raw==='string'&&raw!==this.raw){this.mode='indexed';this.raw=this.persisted=raw;this.notify('external',{raw});}}
 }
 root.ConstanciaHistoryStore=HistoryStore;if(typeof module!=='undefined')module.exports=HistoryStore;
})(typeof window!=='undefined'?window:globalThis);
