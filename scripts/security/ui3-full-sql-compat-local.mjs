// Disposable in-memory PostgreSQL compatibility lab. No URL, hosted client or credentials.
// Install @electric-sql/pglite@0.5.16 in a temporary prefix; pass its absolute dist/index.js path.
import assert from 'node:assert/strict';
import {baselineFiles as migrations} from './ui3-sql-baseline.mjs';
import {readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.ROTEVO_SQL_LAB_MODULE;
assert.ok(modulePath&&isAbsolute(modulePath)&&!modulePath.includes('://'),'local PGlite module path required');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const pg=new PGlite();
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS:',label);};
try{
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);
 alter table storage.objects enable row level security;`);

 for(const path of migrations){try{await pg.exec(read(path));}catch(e){throw new Error('Baseline failed at '+path+': '+e.message);}}
 check(true,'fourteen selected baseline SQL files load together in isolated PostgreSQL');
 // Read-only hosted catalog fingerprint (10 Nov 2026), no customer rows or secrets.
 // Differences are recorded but this selected baseline is not automatically a full hosted mirror.
 const expectedTableColumns={
  'public.client_users':4,'public.client_workspaces':3,'public.clients':10,
  'public.editorial_approvals':8,'public.editorial_idea_approvals':8,
  'public.finance_invoice_links':3,'public.planning_projects':10,
  'public.profiles':7,'public.project_assets':12,'public.team_audit_events':6,
  'public.team_member_permissions':3,'public.team_members':8,
  'public.team_project_assignments':3,'public.user_preferences':4,
  'rotevo_finance.accounts':4,'rotevo_finance.audit':6,
  'rotevo_finance.contract_projects':2,'rotevo_finance.contracts':9,
  'rotevo_finance.invoices':17,'rotevo_finance.settings':2,
  'rotevo_finance.settlements':10,'rotevo_finance.subscriptions':10,
  'rotevo_finance.suppliers':8,'rotevo_finance.transfers':5
 };
 const tables=(await pg.query("select table_schema||'.'||table_name as name,count(*)::integer as count from information_schema.columns where table_schema in ('public','rotevo_finance') group by table_schema,table_name order by 1")).rows;
 const found=Object.fromEntries(tables.map(t=>[t.name,t.count]));
 const missing=Object.keys(expectedTableColumns).filter(t=>!(t in found));
 const mismatched=Object.entries(expectedTableColumns).filter(([name,count])=>name in found&&found[name]!==count).map(([name,count])=>({name,hosted:count,lab:found[name]}));
 const extra=Object.keys(found).filter(t=>!(t in expectedTableColumns));
 console.log('HOSTED_SCHEMA_RECONCILIATION',JSON.stringify({hostedTables:Object.keys(expectedTableColumns).length,labTables:tables.length,missing,mismatched,extra}));
 // A selected historical baseline can be used for integration tests even if incomplete;
 // it MUST NOT be certified as a production schema mirror when there is any drift.
 const schemaMirrorReady=missing.length===0&&mismatched.length===0&&extra.length===0;
 console.log(schemaMirrorReady?'PASS full table/column-count parity':'NO-GO full hosted schema mirror: synthetic lab remains selective');

 await pg.exec(`grant select,update on public.planning_projects to public;grant select(data),update(data) on public.planning_projects to authenticated;`);
 await pg.exec(read('docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql'));
 await pg.exec(read('docs/security/sql/ui3-editorial-rpc-hardening-PROPOSAL-ONLY.sql'));
 const acl=(await pg.query(`select has_column_privilege('authenticated','public.planning_projects','data','SELECT') exposed,has_column_privilege('authenticated','public.planning_projects','title','SELECT') metadata,has_column_privilege('service_role','public.planning_projects','data','SELECT') server`)).rows[0];
 check(!acl.exposed&&acl.metadata&&acl.server,'grant proposal denies private JSON and preserves metadata/server');
 // Executes the actual financial SQL functions with only synthetic fixtures; script rolls back.
 await pg.exec(read('scripts/finance/database-isolated.sql').replace(/^\\set[^\n]*\n/gm,''));
 check(true,'financial SQL lifecycle assertions execute after the JSON grant restriction');

 // Real SQL compatibility under the service role used by the strategic editor endpoint.
 await pg.exec(`begin;
 insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','admin@synthetic.invalid'),
 ('10000000-0000-4000-8000-000000000002','client-a@synthetic.invalid'),
 ('10000000-0000-4000-8000-000000000003','client-b@synthetic.invalid');
 insert into public.clients(id,name,slug) values
 ('20000000-0000-4000-8000-000000000001','Synthetic A','sql-lab-a'),
 ('20000000-0000-4000-8000-000000000002','Synthetic B','sql-lab-b');
 insert into public.profiles(id,role,client_id) values
 ('10000000-0000-4000-8000-000000000001','strategist',null),
 ('10000000-0000-4000-8000-000000000002','client','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000003','client','20000000-0000-4000-8000-000000000002');
 insert into public.team_members(user_id,display_name,role,active) values
 ('10000000-0000-4000-8000-000000000001','Synthetic admin','admin',true);
 insert into public.client_workspaces(client_id,data) values
 ('20000000-0000-4000-8000-000000000001','{"modules":["content","finance","campaigns","planning"]}');
 insert into public.planning_projects(id,client_id,title,slug,data,updated_at) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic editor','sql-editor','{}','2026-11-09T00:00:00Z');
 set local role service_role;`);
 const original={internalNotes:'SYNTHETIC ONLY',ecosystem2027:{selectedDocumentCodes:['01.06'],documents:{'01.06':{publishedContent:'Published synthetic release',publishedAt:'2026-11-01T00:00:00Z'}}},editorialCalendar:[{id:'final',version:'v1',status:'awaiting_client',visibleToClient:true},{id:'idea',version:'v1',status:'idea_pending',visibleToClient:true},{id:'other',version:'v1',status:'awaiting_client',visibleToClient:false}]};
 for(const n of [2,1600]){
  const html='<section>'+('<p>Ação 🧠 &amp; revisão</p>'.repeat(n))+'</section>',css='.card{color:#687487}\n'.repeat(200);
  const document={...original.ecosystem2027.documents['01.06'],richContent:{format:'blocknote-v1',blocks:[{id:'synthetic',type:'visualHtml',props:{markup:html,stylesheet:css},children:[]}]}};
  const value={...original,ecosystem2027:{...original.ecosystem2027,documents:{'01.06':document}}};
  const before=(await pg.query('select updated_at::text as stamp from public.planning_projects where id=$1',['30000000-0000-4000-8000-000000000001'])).rows[0].stamp;
  const saved=await pg.query('update public.planning_projects set data=$1::jsonb,updated_at=clock_timestamp() where id=$2 and updated_at=$3::timestamptz returning data',[JSON.stringify(value),'30000000-0000-4000-8000-000000000001',before]);
  assert.deepEqual(saved.rows[0].data,value);
  const stale=await pg.query('update public.planning_projects set data=$1::jsonb where id=$2 and updated_at=$3::timestamptz returning data',['{}','30000000-0000-4000-8000-000000000001',before]);
  assert.equal(stale.rows.length,0);
  const reopened=(await pg.query('select data from public.planning_projects where id=$1',['30000000-0000-4000-8000-000000000001'])).rows[0].data;
  assert.deepEqual(reopened,value);
 }
 check(true,'small/extensive HTML and CSS survive real JSONB and optimistic service-role update/returning after grant restriction');
 // Direct RPC hardening: absent workspace and mandatory initial-password change must both fail closed.
 await pg.exec(`delete from public.client_workspaces where client_id='20000000-0000-4000-8000-000000000001';reset role;set local role authenticated;
 select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 savepoint missing_workspace;`);
 try {
  await pg.query('select public.rotevo_editorial_decide($1,$2,$3,$4,null)', ['30000000-0000-4000-8000-000000000001','final','v1','approved']);
  throw Error('RPC accepted client without workspace');
 } catch(e) { assert.equal(e.code,'42501'); }
 finally {await pg.exec('rollback to savepoint missing_workspace');}
 check(true,'direct editorial RPC rejects missing client workspace');
 await pg.exec(`reset role;set local role service_role;
 insert into public.client_workspaces(client_id,data) values ('20000000-0000-4000-8000-000000000001','{"modules":["content","finance","planning"]}');
 reset role;set local role authenticated;
 select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"rotevo_password_reset_required":true}}',true);
 savepoint initial_password;`);
 try {
  await pg.query('select public.rotevo_editorial_idea_decide($1,$2,$3,$4,null)', ['30000000-0000-4000-8000-000000000001','idea','v1','approved']);
  throw Error('RPC accepted identity requiring first-password change');
 } catch(e) {assert.equal(e.code,'42501');}
 finally {await pg.exec('rollback to savepoint initial_password');}
 check(true,'direct editorial idea RPC rejects pending initial-password change');
 await pg.exec(`reset role;set local role authenticated;
 select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 select public.rotevo_editorial_decide('30000000-0000-4000-8000-000000000001','final','v1','approved',null);
 select public.rotevo_editorial_idea_decide('30000000-0000-4000-8000-000000000001','idea','v1','approved',null);`);
 check(true,'actual SECURITY DEFINER idea/final approvals remain callable under restricted JSON grants');
 for(const [id,version,expected] of [['other','v1','40001'],['final','obsolete','40001']]){
  await pg.exec('savepoint denied_case');
  try{await pg.query('select public.rotevo_editorial_decide($1,$2,$3,$4,null)',['30000000-0000-4000-8000-000000000001',id,version,'approved']);throw Error('Forbidden approval unexpectedly accepted');}
  catch(e){assert.equal(e.code,expected);}finally{await pg.exec('rollback to savepoint denied_case');}
 }
 check(true,'editorial RPC rejects hidden content and stale versions after grant restriction');
 await pg.exec(`select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);savepoint tenant_denial;`);
 try{await pg.query('select public.rotevo_editorial_decide($1,$2,$3,$4,null)',['30000000-0000-4000-8000-000000000001','final','v1','approved']);throw Error('Other tenant accepted');}
 catch(e){assert.equal(e.code,'42501');}finally{await pg.exec('rollback to savepoint tenant_denial');}
 check(true,'editorial RPC rejects another tenant using the original function');
 await pg.exec('rollback');
 console.log('PASS:',checks,'SQL compatibility groups; in-memory database destroyed on close');
}catch(e){console.error('SQL LAB FAILED:',e.message,'code:',e.code??'none');process.exitCode=1;}finally{await pg.close();}
