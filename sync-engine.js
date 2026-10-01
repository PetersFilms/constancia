(function(root){
 'use strict';
 const C=root.ConstanciaSyncCore||(typeof require==='function'?require('./sync-core.js'):null);
 class SyncEngine{
  constructor({store,data,readCloud,saveCloud,status}){Object.assign(this,{store,data,readCloud,saveCloud,status});this.key='constancia.sync.v1';this.running=false;this.conflict=null;this.generation=0;this.meta=this.load();}
  load(){const raw=this.store.getItem(this.key);if(!raw)return {version:1};const value=JSON.parse(raw);if(value.version!==1)throw Error('Versão de sincronização incompatível. Atualize o aplicativo.');return value;}
  persist(meta){this.store.setItem(this.key,JSON.stringify(meta));this.meta=meta;}
  owned(user){return !!user&&this.meta.owner===user;}
  link(user,pristine){if(this.meta.owner&&this.meta.owner!==user)throw Error('Entre na conta original deste histórico.');this.data.protect('constancia.recovery.before-account-link',this.data.read());this.persist({...this.meta,owner:user,firstMode:pristine?'cloud':'import',joinBaseline:this.data.read()});}
  cancel(){this.generation++;this.conflict=null;}
  async flush(user,preference){
   if(this.running||!this.owned(user)||this.data.blocked())return false;
   this.running=true;const gen=this.generation;let done=false;
   try{
    this.meta=this.load();if(!this.owned(user))return false;this.status('Sincronizando…');
    for(let attempt=0;attempt<5;attempt++){
     const cloud=await this.readCloud(user);if(gen!==this.generation||!this.owned(user))return false;
     const local=this.data.read();let result;
     if(!cloud.state)result={state:local,conflicts:[]};
     else if(!this.meta.base&&this.meta.firstMode==='import')result=root.Persistence.merge(cloud.state,local);
     else result=C.reconcile(this.meta.base||this.meta.joinBaseline||cloud.state,local,cloud.state,preference||'local');
     if(result.conflicts.length&&!preference){
      this.conflict={local,remote:cloud.state,base:this.meta.base,conflicts:result.conflicts};
      this.data.protect('constancia.recovery.sync-conflicts',this.conflict);
      this.status('Há versões diferentes · Toque para revisar','conflict');return false;
     }
     if(result.conflicts.length&&preference==='remote'&&!this.meta.base&&this.meta.firstMode==='import')result=root.Persistence.merge(local,cloud.state);
     // Keep an on-device recovery copy before changing the cloud or this device.
     if(!this.meta.base)this.data.protect('constancia.recovery.before-first-sync',local);
     let saved=cloud;
     if(!cloud.state||!C.equal(result.state,cloud.state)){
      saved=await this.saveCloud(user,cloud.revision||0,result.state);
      if(gen!==this.generation||!this.owned(user))return false;
      if(!saved.saved){preference=undefined;continue;}
     }
     // Include edits made while the request was in flight, without overwriting them.
     const latest=this.data.read(),after=C.reconcile(local,latest,saved.state);
     if(after.conflicts.length){this.status('Alterações novas aguardam sincronização');return false;}
     if(!C.equal(latest,after.state)&&!this.data.apply(after.state,latest)){this.status('Os registros foram mantidos · Tente sincronizar novamente');return false;}
     this.persist({...this.meta,base:saved.state,revision:saved.revision,lastSync:new Date().toISOString(),firstMode:undefined,joinBaseline:undefined});
     this.conflict=null;preference=undefined;
     if(C.equal(this.data.read(),saved.state)){done=true;this.status('Sincronizado · Seu histórico está atualizado','ok');return true;}
    }
    this.status('Salvo neste aparelho · Nova tentativa em breve');return false;
   }catch(error){this.status(navigatorOffline()?'Salvo neste aparelho · Aguardando internet':'Salvo neste aparelho · Sincronização pendente','pending',error);return false;}
   finally{this.running=false;this.onComplete?.(done);}
  }
 }
 function navigatorOffline(){return typeof navigator!=='undefined'&&navigator.onLine===false;}
 root.ConstanciaSyncEngine=SyncEngine;if(typeof module!=='undefined')module.exports=SyncEngine;
})(typeof window!=='undefined'?window:globalThis);
