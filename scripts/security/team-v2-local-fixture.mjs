import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';

// Browser fixtures contain synthetic identities only. Never allow a remote target.
if(process.env.ROTEVO_LOCAL_API_TESTS!=='YES_LOCAL_ONLY'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321')throw Error('Local isolated Supabase required');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const browser=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const file='.env.v2-browser-fixture.json';
const password='Synthetic-local-only-2026!a1';
const temporary='Temporary-local-only-2026!a1';
const command=process.argv[2];
let fixture=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):null;
async function insert(table,row){const {error}=await admin.from(table).insert(row);assert.ifError(error);}
async function login(email,pass=password){const {data,error}=await browser().auth.signInWithPassword({email,password:pass});assert.ifError(error);return data.session.access_token;}
async function call(path,token,body,method='GET'){
 const r=await fetch('http://127.0.0.1:3000'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 return {status:r.status,data:await r.json()};
}
function save(){writeFileSync(file,JSON.stringify(fixture,null,2));}
if(command==='setup'){
 assert.equal(fixture,null,'Clean up the previous local fixture first');
 const tag=randomUUID();fixture={tag,users:[],clients:[],projects:[],owner:`v2-owner-${tag}@rotevo.invalid`,customer:`v2-client-${tag}@rotevo.invalid`,staff:`v2-staff-${tag}@rotevo.invalid`};save();
 for(const [key,role,name] of [['owner','strategist','Administrador de homologação V2'],['customer','client','Cliente de homologação V2']]){
  const {data,error}=await admin.auth.admin.createUser({email:fixture[key],password,email_confirm:true});assert.ifError(error);fixture.users.push(data.user.id);fixture[key+'Id']=data.user.id;save();
  await insert('profiles',{id:data.user.id,email:fixture[key],full_name:name,role});
 }
 await insert('team_members',{user_id:fixture.ownerId,display_name:'Administrador de homologação V2',role:'admin',active:true});
 for(const [index,label] of ['Projeto autorizado V2','Projeto de outro cliente V2'].entries()){
  const cid=randomUUID(),pid=randomUUID();fixture.clients.push(cid);fixture.projects.push(pid);save();
  await insert('clients',{id:cid,name:index?'Outra empresa de homologação':'Cliente de homologação V2',slug:`v2-${tag}-${index}`});
  await insert('planning_projects',{id:pid,client_id:cid,title:label,slug:`v2-${tag}-${index}`,status:'draft',data:{selectedModules:[],modules:[]}});
 }
 const {error}=await admin.from('profiles').update({client_id:fixture.clients[0]}).eq('id',fixture.customerId);assert.ifError(error);
 console.log(JSON.stringify({owner:fixture.owner,customer:fixture.customer,staff:fixture.staff,password,temporary,scope:'SYNTHETIC LOCAL ONLY'}));
}else{
 assert.ok(fixture,'Fixture not initialized');
 assert.match(fixture.tag,/^[a-f0-9-]{36}$/);
 const {data:staff,error}=await admin.from('profiles').select('id').eq('email',fixture.staff).maybeSingle();assert.ifError(error);
 if(command==='invite'){
  assert.equal(staff,null,'Synthetic staff already exists');
  const token=await login(fixture.owner);
  const r=await call('/api/team/invite',token,{email:fixture.staff,displayName:'Colaborador de homologação V2',role:'producer',temporaryPassword:temporary},'POST');assert.equal(r.status,201);
  console.log('PASS: synthetic local staff ready for first-password form');
 }else if(command==='verify-password'){
  assert.ok(staff);const {data,error}=await admin.auth.admin.getUserById(staff.id);assert.ifError(error);assert.equal(data.user.app_metadata.rotevo_password_reset_required,false);
  const {error:oldError}=await browser().auth.signInWithPassword({email:fixture.staff,password:temporary});assert.ok(oldError);
  console.log('PASS: browser password change confirmed; temporary password rejected; new password not read');
 }else if(command==='password'){
  assert.ok(staff);const token=await login(fixture.staff,temporary);
  const r=await call('/api/team/first-password',token,{newPassword:password},'POST');assert.equal(r.status,200);
  const {error:oldError}=await browser().auth.signInWithPassword({email:fixture.staff,password:temporary});assert.ok(oldError);
  console.log('PASS: synthetic first password replaced through authenticated API; temporary password rejected');
 }else if(command==='inspect'){
  const token=await login(fixture.owner);const r=await call('/api/team/directory',token);assert.equal(r.status,200);
  console.log(JSON.stringify({member:r.data.members.find(m=>m.user_id===staff?.id),assignments:r.data.assignments.filter(a=>a.user_id===staff?.id),permissions:r.data.permissions.filter(p=>p.user_id===staff?.id)}));
  const customerToken=await login(fixture.customer);const c=await call('/api/client/projects',customerToken);assert.equal(c.status,200);assert.deepEqual(c.data.projects.map(p=>p.id),[fixture.projects[0]]);
  assert.equal((await call('/api/team/directory',customerToken)).status,403);
  console.log('PASS: customer projects isolated; customer cannot manage staff');
 }else if(command==='cleanup'){
  const users=[...fixture.users,...(staff?[staff.id]:[])];
  const {error:auditError}=await admin.from('team_audit_events').delete().in('actor_user_id',users);assert.ifError(auditError);
  const {error:projectError}=await admin.from('planning_projects').delete().in('id',fixture.projects);assert.ifError(projectError);
  for(const id of users){const {data,error}=await admin.auth.admin.getUserById(id);assert.ifError(error);assert.ok(data.user.email.endsWith(`${fixture.tag}@rotevo.invalid`));const {error:deleteError}=await admin.auth.admin.deleteUser(id);assert.ifError(deleteError);}
  const {error:clientError}=await admin.from('clients').delete().in('id',fixture.clients);assert.ifError(clientError);
  unlinkSync(file);console.log('PASS: only recorded synthetic fixture identities, projects, clients and audit events removed');
 }else throw Error('Expected setup, invite, password, verify-password, inspect or cleanup');
}
