// Real synthetic, disposable GoTrue + PostgREST + Next.js collaboration end-to-end checks.
// NEVER runs on production or a non-loopback Supabase / Next.js URL.
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";

const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
function loopback(value){const u=new URL(value);assert.equal(u.protocol,"http:");assert.ok(["127.0.0.1","localhost"].includes(u.hostname),"Refusing a non-loopback target");return u;}
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
assert.equal(process.env.ROTEVO_COLLABORATION_ENABLED,"true");
loopback(api);loopback(app);
assert.ok(process.env.ANON_KEY&&process.env.SERVICE_ROLE_KEY);
const realFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{loopback(typeof input==="string"||input instanceof URL?String(input):input.url);return realFetch(input,init);};
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(api,process.env.SERVICE_ROLE_KEY,options);
const uuid=(x)=>x;
const cA=uuid("c3100000-0000-4000-8000-000000000001"),cB=uuid("c3200000-0000-4000-8000-000000000002");
const pA=uuid("d3100000-0000-4000-8000-000000000001"),pB=uuid("d3200000-0000-4000-8000-000000000002");
async function must(p,what){const r=await p;assert.equal(r.error,null,what+": "+(r.error?.message??""));return r.data;}
async function makeUser(label,role,clientId=null,reset=false){
 const email="collab-"+label+"@synthetic.invalid",password="Synthetic-Test-Only-2026!"+label;
 const result=await must(service.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{rotevo_password_reset_required:reset}}),"create user "+label);
 const id=result.user.id;
 await must(service.from("profiles").upsert({id,role,client_id:clientId,full_name:"Synthetic "+label,email}),"profile "+label);
 const client=createClient(api,process.env.ANON_KEY,options);
 const login=await must(client.auth.signInWithPassword({email,password}),"GoTrue login "+label);
 return {id,token:login.session.access_token,client};
}
async function request(path,actor,method="GET",body,expected=200){
 const response=await fetch(new URL(path,app),{method,headers:{...(actor?{Authorization:"Bearer "+actor.token}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
 const json=await response.json();
 assert.equal(response.status,expected,path+" expected "+expected+" got "+response.status+": "+JSON.stringify(json).slice(0,170));
 assert.equal(response.headers.get("cache-control"),"no-store");
 return json;
}
function path(projectId,resourceType,resourceId){return "/api/collaboration/messages?"+new URLSearchParams({projectId,resourceType,resourceId});}
function msg(projectId,resourceType,resourceId,body){return {projectId,resourceType,resourceId,body};}
await must(service.from("clients").insert([{id:cA,name:"Collab synthetic A",slug:"collab-a"},{id:cB,name:"Collab synthetic B",slug:"collab-b"}]),"clients");
const admin=await makeUser("admin","strategist"),a=await makeUser("a","client",cA),b=await makeUser("b","client",cB),
 reader=await makeUser("reader","staff"),denied=await makeUser("denied","staff"),reset=await makeUser("reset","client",cA,true);
const emptyWorkspace={modules:["content","execution"],contracts:[],folders:[]};
await must(service.from("client_workspaces").insert([{client_id:cA,data:emptyWorkspace},{client_id:cB,data:emptyWorkspace}]),"workspaces");
const base={executionTimeline:[{id:"task-shared",title:"Shared",visibleToClient:true},{id:"task-internal",title:"Private",visibleToClient:false}],
 editorialCalendar:[{id:"content-shared",title:"Shared content",visibleToClient:true,version:"01"},{id:"content-private",title:"Private content",visibleToClient:false}]};
await must(service.from("planning_projects").insert([{id:pA,client_id:cA,title:"Collab A",slug:"collab-a",status:"draft",data:base},
 {id:pB,client_id:cB,title:"Collab B",slug:"collab-b",status:"draft",data:base}]),"projects");
await must(service.from("team_members").insert([{user_id:admin.id,display_name:"Admin synthetic",role:"admin",active:true},
 {user_id:reader.id,display_name:"Reader synthetic",role:"producer",active:true},
 {user_id:denied.id,display_name:"Denied synthetic",role:"producer",active:true}]),"team");
await must(service.from("team_member_permissions").insert([{user_id:reader.id,permission:"projects.read"}]),"reader permission");
await must(service.from("team_project_assignments").insert([{user_id:reader.id,project_id:pA},{user_id:denied.id,project_id:pA}]),"assignments");
// Browser roles cannot bypass the server API even if they know the exact row/table name.
for(const actor of [a,b,reader,admin]){
 const direct=await actor.client.from("rotevo_collaboration_messages").select("id");
 assert.ok(direct.error,"browser SELECT must be denied for "+actor.id);
 const directInsert=await actor.client.from("rotevo_collaboration_messages").insert({project_id:pA,resource_type:"task",resource_id:"task-shared",author_user_id:actor.id,author_role:"client",body:"FORBIDDEN"});
 assert.ok(directInsert.error,"browser INSERT must be denied for "+actor.id);
}
await request(path(pA,"task","task-shared"),null,"GET",undefined,401);
await request(path(pA,"task","task-shared"),reset,"GET",undefined,403);
await request(path(pA,"task","task-internal"),a,"GET",undefined,403);
await request(path(pA,"content","content-private"),a,"GET",undefined,403);
await request(path(pA,"task","missing"),a,"GET",undefined,403);
await request(path(pA,"task","task-shared"),b,"GET",undefined,403);
await request(path(pB,"content","content-shared"),a,"GET",undefined,403);
await request(path(pA,"task","task-shared"),denied,"GET",undefined,403);
await request(path(pA,"task","task-shared"),reader,"GET");
await request("/api/collaboration/messages",b,"POST",msg(pA,"task","task-shared","Other tenant"),403);
await request("/api/collaboration/messages",a,"POST",msg(pA,"task","task-internal","Private"),403);
await request("/api/collaboration/messages",reset,"POST",msg(pA,"task","task-shared","Reset pending"),403);
await request("/api/collaboration/messages",reader,"POST",msg(pA,"task","task-shared","No write permission"),403);
const created=await request("/api/collaboration/messages",a,"POST",msg(pA,"task","task-shared","  Olá equipe  "),201);
assert.equal(created.message.body,"Olá equipe");
assert.equal(created.message.author_user_id,a.id);
assert.equal(created.message.author_role,"client");
const reply=await request("/api/collaboration/messages",admin,"POST",msg(pA,"task","task-shared","Retorno da equipe"),201);
assert.equal(reply.message.author_role,"strategist");
const own=await request(path(pA,"task","task-shared"),a);
assert.equal(own.messages.length,2);
assert.deepEqual(own.messages.map(m=>m.body),["Olá equipe","Retorno da equipe"]);
const other=await request(path(pB,"task","task-shared"),b);
assert.equal(other.messages.length,0);
const contentMessage=await request("/api/collaboration/messages",a,"POST",msg(pA,"content","content-shared","Revisar este conteúdo"),201);
assert.equal(contentMessage.message.resource_type,"content");
assert.equal((await request(path(pA,"task","task-shared"),a)).messages.length,2);
assert.equal((await request(path(pA,"content","content-shared"),a)).messages.length,1);
// Older items deliberately share a timestamp to verify keyset pagination has no gaps.
const historical=Array.from({length:65},(_,i)=>({
 project_id:pA,resource_type:"task",resource_id:"task-shared",
 author_user_id:admin.id,author_role:"strategist",body:"Histórico sintético "+String(i).padStart(2,"0"),
 created_at:"2020-01-01T00:00:00+00:00"
}));
await must(service.from("rotevo_collaboration_messages").insert(historical),"seed historical messages");
let page=await request(path(pA,"task","task-shared"),a);
assert.equal(page.messages.length,30);assert.ok(page.nextCursor);
const all=[...page.messages];
for(let n=0;n<1;n++){
 page=await request(path(pA,"task","task-shared")+"&cursor="+encodeURIComponent(page.nextCursor),a);
 assert.equal(page.messages.length,30);all.push(...page.messages);
 assert.ok(page.nextCursor);
}
page=await request(path(pA,"task","task-shared")+"&cursor="+encodeURIComponent(page.nextCursor),a);
assert.equal(page.messages.length,7);assert.equal(page.nextCursor,null);
all.push(...page.messages);
assert.equal(all.length,67);assert.equal(new Set(all.map(x=>x.id)).size,67,"pagination must not overlap");
assert.ok(all.some(x=>x.body==="Olá equipe")&&all.some(x=>x.body==="Histórico sintético 00"));
await request(path(pA,"task","task-shared")+"&cursor=not-a-valid-cursor",a,"GET",undefined,400);
await request(path(pA,"task","task-shared")+"&cursor="+encodeURIComponent(Buffer.from(JSON.stringify({created_at:"2020-01-01T00:00:00Z",id:"bad"})).toString("base64url")),a,"GET",undefined,400);
// Exactly 10 messages per author are accepted in any rolling 60-second window.
for(let i=0;i<8;i++)await request("/api/collaboration/messages",a,"POST",msg(pA,"content","content-shared","Rate test "+i),201);
await request("/api/collaboration/messages",a,"POST",msg(pA,"content","content-shared","Rate test overflow"),429);
await must(service.from("client_workspaces").update({data:{modules:["content"],contracts:[],folders:[]}}).eq("client_id",cA),"disable execution");
await request(path(pA,"task","task-shared"),a,"GET",undefined,403);
assert.equal((await request(path(pA,"content","content-shared"),a)).messages.length,9);
await must(service.from("planning_projects").update({data:{executionTimeline:base.executionTimeline,editorialCalendar:base.editorialCalendar.map(x=>({...x,visibleToClient:false}))}}).eq("id",pA),"unshare content");
await request(path(pA,"content","content-shared"),a,"GET",undefined,403);
await request("/api/collaboration/messages",a,"POST",msg(pA,"content","content-shared","Hidden now"),403);
console.log("PASS integrated collaboration: real Auth, tenant isolation, reset/role/module/visibility gates, server-only grants, writes, reload, thread separation, and de-sharing");
