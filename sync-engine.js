(function(root){
 'use strict';
 const C=root.ConstanciaSyncCore||(typeof require==='function'?require('./sync-core.js'):null);
 const codec=root.ConstanciaCloud||(typeof require==='function'?require('lz-string'):null);
 class SyncEngine{
  constructor({store,data,readCloud,saveCloud,status}){Object.assign(this,{store,data,readCloud,saveCloud,status});this.key='constancia.sync.v1';this.running=false;this.conflict=null;this.generation=0;this.meta=this.load();}
  load(){const raw=this.store.getItem(this.key);if(!raw)return {version:1};let value=JSON.parse(raw);if(value.version===2&&value.codec==='lz-utf16'&&typeof value.payload==='string'&&codec?.decompressFromUTF16){const decoded=codec.decompressFromUTF16(value.payload);if(!decoded)throw Error('Configuração de sincronização inválida; histórico preservado.');value=JSON.parse(decoded);}if(value.version!==1)throw Error('Versão de sincronização incompatível. Atualize o aplicativo.');return value;}
  persist(meta){const raw=JSON.stringify(meta),stored=raw.length>80000&&codec?.compressToUTF16?JSON.stringify({version:2,codec:'lz-utf16',payload:codec.compressToUTF16(raw)}):raw;this.store.setItem(this.key,stored);this.meta=meta;}
  owned(user){return !!user&&this.meta.owner===user;}
  link(user,pristine){if(this.meta.owner&&this.meta.owner!==user)throw Error('Entre na conta original deste histórico.');const baseline=this.data.read(),gen=this.generation,finish=()=>{if(gen!==this.generation||this.meta.owner&&this.meta.owner!==user)throw Error('A conta mudou durante a vinculação.');this.persist({...this.meta,owner:user,firstMode:pristine?'cloud':'import',joinBaseline:baseline});};const protection=this.data.protect('constancia.recovery.before-account-link',baseline);return protection?.then?protection.then(async()=>{finish();await this.data.settled?.();}):finish();}
  cancel(){this.generation++;this.conflict=null;}
  flush(user,preference){
   if(this.running){if(this.flushingUser!==user)return Promise.resolve(false);if(!preference)return this.inflight;const generation=this.generation;return this.inflight.then(()=>generation===this.generation&&this.owned(user)?this.flush(user,preference):false);}
   this.flushingUser=user;return this.inflight=this.run(user,preference);
  }
  async run(user,preference){
   if(this.running||!this.owned(user)||this.data.blocked())return false;
   this.running=true;this.lastError=null;const gen=this.generation;let done=false;
   try{
    await this.data.settled?.();this.meta=this.load();if(!this.owned(user))return false;this.status('Sincronizando…');
    for(let attempt=0;attempt<5;attempt++){
     const cloud=await this.readCloud(user);if(gen!==this.generation||!this.owned(user))return false;
     const local=this.data.read();let result;
     if(!cloud.state)result={state:local,conflicts:[]};
     else if(!this.meta.base&&this.meta.firstMode==='import')result=root.Persistence.merge(cloud.state,local);
     else result=C.reconcile(this.meta.base||this.meta.joinBaseline||cloud.state,local,cloud.state,preference||'local');
     if(result.conflicts.length&&!preference){
      this.conflict={local,remote:cloud.state,base:this.meta.base,conflicts:result.conflicts};
      await this.data.protect('constancia.recovery.sync-conflicts',this.conflict);
      if(gen!==this.generation||!this.owned(user))return false;
      this.status('Há versões diferentes · Toque para revisar','conflict');return false;
     }
     if(result.conflicts.length&&preference==='remote'&&!this.meta.base&&this.meta.firstMode==='import')result=root.Persistence.merge(local,cloud.state);
     // Keep an on-device recovery copy before changing the cloud or this device.
     if(!this.meta.base)await this.data.protect('constancia.recovery.before-first-sync',local);
     if(gen!==this.generation||!this.owned(user))return false;
     let saved=cloud;
     if(!cloud.state||!C.equal(result.state,cloud.state)){
      saved=await this.saveCloud(user,cloud.revision||0,result.state);
      if(gen!==this.generation||!this.owned(user))return false;
      if(!saved.saved){continue;}
     }
     // Include edits made while the request was in flight, without overwriting them.
     const latest=this.data.read(),after=C.reconcile(local,latest,saved.state);
     if(after.conflicts.length){this.status('Alterações novas aguardam sincronização');return false;}
     if(!C.equal(latest,after.state)&&!await this.data.apply(after.state,latest)){this.status('Os registros foram mantidos · Tente sincronizar novamente');return false;}
     this.persist({...this.meta,base:saved.state,revision:saved.revision,lastSync:new Date().toISOString(),firstMode:undefined,joinBaseline:undefined});
     await this.data.settled?.();this.conflict=null;preference=undefined;
     if(C.equal(this.data.read(),saved.state)){done=true;this.status('Sincronizado · Seu histórico está atualizado','ok');return true;}
    }
    this.status('Salvo neste aparelho · Nova tentativa em breve');return false;
   }catch(error){this.lastError=error;this.status(error.name==='QuotaExceededError'?'Salvo neste aparelho · Espaço insuficiente para sincronizar':navigatorOffline()?'Salvo neste aparelho · Aguardando internet':'Salvo neste aparelho · Sincronização pendente','pending',error);return false;}
   finally{this.running=false;this.onComplete?.(done);}
  }
 }
 function navigatorOffline(){return typeof navigator!=='undefined'&&navigator.onLine===false;}
 root.ConstanciaSyncEngine=SyncEngine;if(typeof module!=='undefined')module.exports=SyncEngine;
})(typeof window!=='undefined'?window:globalThis);
