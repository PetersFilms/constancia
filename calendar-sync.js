(function(root){
 'use strict';
 class CalendarSync{
  constructor({invoke,flush,available,notify=()=>{},clock=()=>Date.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){Object.assign(this,{invoke,flush,available,notify,clock,schedule,cancel});this.reset();}
  reset(){this.epoch=(this.epoch||0)+1;this.cancel?.(this.timer);this.connection=null;this.checking=null;this.watchAttempt=0;this.watchedVersion=-1;this.coverage=null;this.dirty=false;this.synced=0;this.version=0;this.lastResume=0;this.requests=[];}
  notice(row){this.version=Math.max(this.version,Number(row.calendar_version||0));this.synced=Math.max(this.synced,Number(row.calendar_synced_version||0));this.dirty=this.version>this.synced;if(!this.dirty)this.cancel(this.timer);if(this.dirty){this.cancel(this.timer);this.timer=this.schedule(()=>this.request({reason:'change'}).catch(()=>{}),900);}}
  async status(force=false){if(this.connection&&!force)return this.connection;if(this.checking)return this.checking;const epoch=this.epoch;this.checking=(async()=>{const r=await this.invoke('status');if(epoch!==this.epoch)throw Error('A conta mudou.');this.connection={...this.connection,...r};this.notice(r);this.notify(this.connection);return this.connection;})();try{return await this.checking;}finally{this.checking=null;}}
  request({date,force=false,reason='view'}={}){
   this.requests.push({date,force,reason});if(this.running)return this.running;
   const epoch=this.epoch;this.running=this.drain(epoch).finally(()=>{this.running=null;});return this.running;
  }
  async drain(epoch){let result;while(this.requests.length&&epoch===this.epoch){const batch=this.requests.splice(0),last=batch.at(-1),date=last.date||new Date(this.clock()).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),force=batch.some(r=>r.force);if(!this.available())return null;
    const connection=await this.status(force||batch.some(r=>r.reason==='resume'));if(!connection?.connected||connection.reconnect)return connection;
    if(this.dirty&&this.watchedVersion!==this.version||(!connection.watchExpires||Date.parse(connection.watchExpires)<this.clock()+86400000)&&this.clock()-this.watchAttempt>15*60000){this.watchAttempt=this.clock();const watch=await this.invoke('watch');if(epoch!==this.epoch)return;this.connection={...connection,...watch};if(!watch.busy)this.watchedVersion=this.version;}
    const safeResume=batch.some(r=>r.reason==='resume')&&this.clock()-this.lastResume>15*60000;
    if(!force&&!this.dirty&&!safeResume&&this.coverage&&date>=this.coverage.min&&date<=this.coverage.max&&this.coverage.day===new Date(this.clock()).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})){continue;}
    this.lastResume=this.clock();if(!await this.flush())throw Error('Revise as diferenças do histórico em Minha conta antes de atualizar a agenda.');
    let chunks=0;do{result=await this.invoke('sync',{date});if(epoch!==this.epoch)return;this.connection={...this.connection,...result};this.notify(this.connection);if(result.busy)throw Error('A agenda está sendo atualizada em outro aparelho. Tente novamente ao terminar.');if(result.partial&&++chunks>=60)throw Error('A importação foi pausada. Toque em sincronizar para continuar de onde parou.');}while(result.partial);
    // Fetch the resulting cloud revision once; no idle timer starts a new sync.
    if(!await this.flush())throw Error('A agenda foi atualizada. A cópia deste aparelho ainda precisa ser sincronizada.');
    this.synced=Math.max(this.synced,Number(result.calendarSyncedVersion||0));this.dirty=this.version>this.synced;
    const center=new Date(date+'T12:00:00Z'),shift=n=>{const d=new Date(center);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};this.coverage={min:shift(-366),max:shift(366),day:new Date(this.clock()).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})};
   }return this.connection;}
 }
 root.ConstanciaCalendarSync=CalendarSync;if(typeof module!=='undefined')module.exports=CalendarSync;
})(typeof window!=='undefined'?window:globalThis);
