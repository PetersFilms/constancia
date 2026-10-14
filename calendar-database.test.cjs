const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('credential migration isolates secrets; authenticated users cannot read or mutate boxes',async()=>{
 const db=new PGlite();try{
  await db.exec("create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;");
  const file=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_todo_calendar_credentials.sql'));
  await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  await db.exec("insert into auth.users values ('00000000-0000-0000-0000-000000000001');set role service_role;");
  await db.query("insert into constancia_calendar_connections(user_id,account_id,token_box)values($1,$2,$3)",['00000000-0000-0000-0000-000000000001','test-account',{v:1,iv:'opaque',data:'ciphertext'}]);
  await db.exec('reset role;set role authenticated;');
  await assert.rejects(()=>db.query('select * from constancia_calendar_connections'),/permission denied/);
  await assert.rejects(()=>db.query('select * from constancia_calendar_oauth'),/permission denied/);
  await assert.rejects(()=>db.exec("update constancia_calendar_connections set reconnect=true"),/permission denied/);
  await db.exec('reset role;set role anon;');await assert.rejects(()=>db.query('select token_box from constancia_calendar_connections'),/permission denied/);
  await db.exec('reset role;set role service_role;');
  const a=await db.query("update constancia_calendar_connections set lease_id=$1,lease_until=now()+interval '2 minutes' where lease_until<now() returning user_id",['10000000-0000-0000-0000-000000000001']);
  const b=await db.query("update constancia_calendar_connections set lease_id=$1,lease_until=now()+interval '2 minutes' where lease_until<now() returning user_id",['10000000-0000-0000-0000-000000000002']);assert.equal(a.rows.length,1);assert.equal(b.rows.length,0);
  const policies=await db.query("select relname,relrowsecurity from pg_class where relname in ('constancia_calendar_connections','constancia_calendar_oauth')");assert(policies.rows.every(r=>r.relrowsecurity));
 }finally{await db.close();}
});

test('daily recovery checks the existing snapshot before serializing state and preserves RLS and revisions',async()=>{
 const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';try{
  await db.exec("create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;grant usage on schema auth to authenticated;create function auth.uid() returns uuid language sql stable as $$ select current_setting('request.jwt.claim.sub',true)::uuid $$;");
  await db.exec(fs.readFileSync('database.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/'+fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_optimize_constancia_daily_recovery.sql')),'utf8'));
  await db.query('insert into auth.users values ($1),($2)',[uid,other]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');
  const original={habits:[{id:'h',future:true}],checks:{keep:true},body:{weight:70.5},training:{sessions:[{id:'s'}]},todo:{history:[{custom:'preserved'}]},future:{extra:'keep'}};
  let result=await db.query('select public.constancia_save($1,$2,$3) as result',[uid,0,original]);assert(result.rows[0].result.saved);assert.equal(result.rows[0].result.revision,1);
  const second={...original,preferences:{calendarIds:['selected']}};await db.query('select public.constancia_save($1,$2,$3)',[uid,1,second]);const third={...second,future:{extra:'updated'}};await db.query('select public.constancia_save($1,$2,$3)',[uid,2,third]);
  const snapshots=await db.query('select state,revision from public.constancia_snapshots');assert.equal(snapshots.rows.length,1);assert.deepEqual(snapshots.rows[0].state,original);assert.equal(snapshots.rows[0].revision,1);
  result=await db.query('select public.constancia_save($1,$2,$3) as result',[uid,1,original]);assert.equal(result.rows[0].result.saved,false);assert.deepEqual(result.rows[0].result.state,third);assert.equal(result.rows[0].result.revision,3);
  await assert.rejects(()=>db.query('select public.constancia_save($1,$2,$3)',[other,0,original]),/Authentication required/);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select * from public.constancia_snapshots')).rows.length,0);assert.equal((await db.query('select * from public.constancia_states')).rows.length,0);
  const functionType=await db.query("select prosecdef from pg_proc where oid='public.constancia_protect_revision()'::regprocedure");assert.equal(functionType.rows[0].prosecdef,false);
 }finally{await db.close();}
});
