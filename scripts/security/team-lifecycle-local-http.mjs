import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const app=process.env.ROTEVO_LOCAL_APP_URL;
if(process.env.ROTEVO_LOCAL_API_TESTS!=='YES_LOCAL_ONLY'||url!=='http://127.0.0.1:54321'||app!=='http://127.0.0.1:3000/')
 throw Error('TEST BLOCKED: exact isolated local targets required');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const browser=()=>createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const tag=randomUUID();
const users=[],clients=[],projects=[];
const temporaryPassword=`Temporary-${randomUUID()}!`;
const newPassword=`Permanent-${randomUUID()}!`;
let checks=0;
async function call(path,jwt,body,method=body===undefined?'GET':'POST'){
 const res=await fetch(app.slice(0,-1)+path,{method,redirect:'error',
  headers:{'Content-Type':'application/json',...(jwt?{Authorization:`Bearer ${jwt}`}:{})},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
 const data=await res.json();return {status:res.status,data};
}
function status(result,expected,label){assert.equal(result.status,expected,label);checks++;}
async function insert(table,row){const {error}=await admin.from(table).insert(row);assert.ifError(error);}
async function login(email,password){const client=browser();const {data,error}=await client.auth.signInWithPassword({email,password});assert.ifError(error);return {jwt:data.session.access_token,client};}
async function mutate(path,jwt,body){const r=await call(path,jwt,body,'PATCH');status(r,200,path);}
try{
 const ownerEmail=`lifecycle-owner-${tag}@rotevo.invalid`;
 const {data:owner,error}=await admin.auth.admin.createUser({email:ownerEmail,password:newPassword,email_confirm:true});assert.ifError(error);
 users.push(owner.user.id);
 await insert('profiles',{id:owner.user.id,email:ownerEmail,full_name:'Synthetic lifecycle admin',role:'strategist'});
 await insert('team_members',{user_id:owner.user.id,display_name:'Synthetic lifecycle admin',role:'admin',active:true});
 for(const label of ['a','b']){
  const cid=randomUUID(),pid=randomUUID();clients.push(cid);projects.push(pid);
  await insert('clients',{id:cid,name:`Synthetic ${label}`,slug:`lifecycle-${tag}-${label}`});
  await insert('planning_projects',{id:pid,client_id:cid,title:`Synthetic project ${label}`,slug:`lifecycle-${tag}-${label}`});
 }
 const ownerSession=await login(ownerEmail,newPassword);
 const clientEmail=`lifecycle-client-${tag}@rotevo.invalid`;
 const {data:customer,error:customerError}=await admin.auth.admin.createUser({email:clientEmail,password:newPassword,email_confirm:true});assert.ifError(customerError);users.push(customer.user.id);
 await insert('profiles',{id:customer.user.id,email:clientEmail,full_name:'Synthetic lifecycle customer',role:'client',client_id:clients[1]});
 const customerSession=await login(clientEmail,newPassword);
 const {data:customerProjects,error:customerProjectsError}=await customerSession.client.from('planning_projects').select('id');assert.ifError(customerProjectsError);assert.deepEqual(customerProjects.map(p=>p.id),[projects[1]]);checks++;
 status(await call('/api/team/directory',customerSession.jwt),403,'customer cannot read team directory');
 status(await call('/api/team/my-access',customerSession.jwt),403,'customer cannot enter staff area');
 const {error:customerEscalationError}=await customerSession.client.from('profiles').update({role:'strategist'}).eq('id',customer.user.id);assert.ok(customerEscalationError);checks++;
 const {error:customerTenantError}=await customerSession.client.from('profiles').update({client_id:clients[0]}).eq('id',customer.user.id);assert.ok(customerTenantError);checks++;
 const invite={email:`lifecycle-staff-${tag}@rotevo.invalid`,displayName:'Synthetic lifecycle staff',role:'producer',temporaryPassword};
 status(await call('/api/team/invite',null,invite),401,'anonymous invite');
 status(await call('/api/team/invite',ownerSession.jwt,invite),201,'staff registration');
 const {data:staff,error:staffError}=await admin.from('profiles').select('id,role').eq('email',invite.email).single();assert.ifError(staffError);users.push(staff.id);
 assert.equal(staff.role,'staff');checks++;
 const duplicate=await call('/api/team/invite',ownerSession.jwt,invite);status(duplicate,409,'duplicate registration');
 const {data:stillThere,error:existingError}=await admin.auth.admin.getUserById(staff.id);assert.ifError(existingError);assert.equal(stillThere.user.email,invite.email);checks++;
 const initial=await login(invite.email,temporaryPassword);
 status(await call('/api/team/my-access',initial.jwt),403,'inactive initial account');
 await mutate('/api/team/members/status',ownerSession.jwt,{userId:staff.id,active:true});
 status(await call('/api/team/my-access',initial.jwt),403,'activation cannot bypass mandatory reset');
 status(await call('/api/team/first-password',initial.jwt,{newPassword,userId:owner.user.id}),400,'cannot target another user');
 status(await call('/api/team/first-password',initial.jwt,{newPassword}),200,'first password update');
 const {error:oldPasswordError}=await browser().auth.signInWithPassword({email:invite.email,password:temporaryPassword});assert.ok(oldPasswordError);checks++;
 const session=await login(invite.email,newPassword);
 let summary=await call('/api/team/my-access',session.jwt);status(summary,200,'active staff summary');assert.deepEqual(summary.data.projects,[]);checks++;
 status(await call('/api/team/first-password',session.jwt,{newPassword}),403,'reset cannot be replayed');
 status(await call('/api/team/directory',session.jwt),403,'staff cannot read directory');
 status(await call('/api/team/invite',session.jwt,{...invite,email:`forbidden-${tag}@rotevo.invalid`}),403,'staff cannot create accounts');
 await mutate('/api/team/permissions',ownerSession.jwt,{userId:staff.id,permission:'projects.read',enabled:true});
 await mutate('/api/team/assignments',ownerSession.jwt,{userId:staff.id,projectId:projects[0],assigned:true});
 summary=await call('/api/team/my-access',session.jwt);status(summary,200,'assigned summary');assert.deepEqual(summary.data.projects.map(p=>p.id),[projects[0]]);checks++;
 for(const table of ['planning_projects','clients','team_members']){
  const {data,error}=await session.client.from(table).select('*');assert.ifError(error);assert.deepEqual(data,[],`no raw ${table} access`);checks++;
 }
 const {error:escalationError}=await session.client.from('profiles').update({role:'strategist'}).eq('id',staff.id);assert.ok(escalationError);checks++;
 status(await call('/api/team/assignments',session.jwt,{userId:staff.id,projectId:projects[1],assigned:true},'PATCH'),403,'staff cannot assign another project');
 await mutate('/api/team/assignments',ownerSession.jwt,{userId:staff.id,projectId:projects[0],assigned:false});
 summary=await call('/api/team/my-access',session.jwt);assert.deepEqual(summary.data.projects,[]);checks++;
 await mutate('/api/team/assignments',ownerSession.jwt,{userId:staff.id,projectId:projects[0],assigned:true});
 await mutate('/api/team/permissions',ownerSession.jwt,{userId:staff.id,permission:'projects.read',enabled:false});
 summary=await call('/api/team/my-access',session.jwt);assert.deepEqual(summary.data.projects,[]);checks++;
 await mutate('/api/team/members/status',ownerSession.jwt,{userId:staff.id,active:false});
 status(await call('/api/team/my-access',session.jwt),403,'issued JWT denied immediately after deactivation');
 const {data:events,error:auditError}=await admin.from('team_audit_events').select('action').eq('actor_user_id',owner.user.id).eq('target_user_id',staff.id);assert.ifError(auditError);
 assert.deepEqual(events.map(e=>e.action).sort(),['member_activated','member_deactivated','permission_granted','permission_revoked','project_assigned','project_assigned','project_unassigned'].sort(),'all seven team mutations audited');checks++;
}finally{
 // Delete only IDs generated by this run. Audit FKs must be removed first.
 if(users.length){const {error}=await admin.from('team_audit_events').delete().in('actor_user_id',users);assert.ifError(error);}
 if(projects.length){const {error}=await admin.from('planning_projects').delete().in('id',projects);assert.ifError(error);}
 for(const id of users){const {error}=await admin.auth.admin.deleteUser(id);assert.ifError(error);}
 if(clients.length){const {error}=await admin.from('clients').delete().in('id',clients);assert.ifError(error);}
 console.log('Synthetic lifecycle fixture cleaned up');
}
console.log(`PASS: ${checks} authenticated lifecycle checks; local synthetic identities only`);
