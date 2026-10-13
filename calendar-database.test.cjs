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
