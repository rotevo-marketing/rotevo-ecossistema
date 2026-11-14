// Integration E2E: REAL local GoTrue/PostgREST and Next.js, exclusively synthetic accounts.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
assert.equal(api,"http://127.0.0.1:54321");
assert.equal(app,"http://127.0.0.1:3000/");
assert.equal(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED,"true");
const local=(url)=>{const u=new URL(url);assert.equal(u.protocol,"http:");assert.ok(["127.0.0.1","localhost"].includes(u.hostname));};
const rawFetch=globalThis.fetch;
globalThis.fetch=(target,options)=>{local(typeof target==="string"||target instanceof URL?String(target):target.url);return rawFetch(target,options);};
const db=createClient(api,process.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const must=async(q,label)=>{const r=await q;assert.equal(r.error,null,label+": "+(r.error?.message??""));return r.data;};
const suffix=randomUUID();
const clientA=randomUUID(),clientB=randomUUID(),projectA=randomUUID(),projectB=randomUUID();
async function identity(label,role,tenant){
 const email="operational-"+label+"-"+suffix+"@synthetic.invalid";
 const password="Local-Synthetic-Only-"+suffix+"!";
 const auth=await must(db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{rotevo_password_reset_required:false}}),"local Auth "+label);
 const id=auth.user.id;
 await must(db.from("profiles").insert({id,email,full_name:"Synthetic "+label,role,client_id:tenant??null}),"profile "+label);
 const user=createClient(api,process.env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await must(user.auth.signInWithPassword({email,password}),"login "+label);
 return {id,token:login.session.access_token,user};
}
async function request(path,actor,{method="GET",body,status=200}={}){
 const headers=actor?{Authorization:"Bearer "+actor.token}:{};
 if(body!==undefined)headers["Content-Type"]="application/json";
 const res=await fetch(new URL(path,app),{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await res.json().catch(()=>({}));
 assert.equal(res.status,status,path+" expected "+status+" got "+res.status+": "+JSON.stringify(payload).slice(0,190));
 return payload;
}
await must(db.from("clients").insert([
 {id:clientA,name:"Synthetic Operational A",slug:"ops-a-"+suffix},
 {id:clientB,name:"Synthetic Operational B",slug:"ops-b-"+suffix}
]),"tenants");
const admin=await identity("strategist","strategist"),staff=await identity("team","staff");
const client=await identity("client-a","client",clientA),other=await identity("client-b","client",clientB);
const secondClient=await identity("client-a-approver","client",clientA);
await must(db.from("client_users").insert([
 {client_id:clientA,user_id:client.id},{client_id:clientA,user_id:secondClient.id},
 {client_id:clientB,user_id:other.id}
]),"synthetic account to tenant linkage");
await must(db.from("team_members").insert([
 {user_id:admin.id,display_name:"Synthetic Strategist",role:"admin",active:true},
 {user_id:staff.id,display_name:"Synthetic Worker",role:"producer",active:true}
]),"synthetic staff");
await must(db.from("team_project_assignments").insert({user_id:staff.id,project_id:projectA}),"staff assignment");
await must(db.from("team_member_permissions").insert({user_id:staff.id,permission:"projects.write"}),"staff scoped G2");
const shared=[{id:"ops-content-1",title:"Synthetic video task",version:"01",visibleToClient:true,status:"idea"}];
const task=[{id:"ops-task-1",title:"Synthetic task",visibleToClient:true,status:"planned"}];
await must(db.from("planning_projects").insert([
 {id:projectA,client_id:clientA,title:"Synthetic Operational Project A",slug:"ops-project-a-"+suffix,status:"draft",data:{editorialCalendar:shared,executionTimeline:task}},
 {id:projectB,client_id:clientB,title:"Synthetic Operational Project B",slug:"ops-project-b-"+suffix,status:"draft",data:{editorialCalendar:shared,executionTimeline:task}}
]),"synthetic projects");
await request("/api/workflow/client-actions",null,{method:"POST",body:{},status:401===503?401:400}); // Flagged endpoint rejects invalid params.
const assign={projectId:projectA,resourceType:"content",resourceId:"ops-content-1",resourceVersion:"01",
 clientUserId:client.id,actionType:"record_video",instructions:"Gravar vídeo e compartilhar o URL do Drive",
 dueDate:null,requestKey:"ops-create-"+randomUUID(),expectedAuthorUserId:admin.id};
const created=await request("/api/workflow/client-actions",admin,{method:"POST",body:assign});
assert.ok(created.assignment?.id,"assignment RPC must return UUID");
await request("/api/workflow/client-actions",admin,{method:"POST",body:assign});
await request("/api/workflow/client-actions",other,{method:"POST",body:{...assign,expectedAuthorUserId:other.id},status:403});
const q=(id,actor)=>"/api/workflow/client-actions?"+new URLSearchParams({projectId:id,expectedAuthorUserId:actor.id});
const mine=await request(q(projectA,client),client);assert.equal(mine.assignments.length,1);
await request(q(projectA,other),other,{status:403});
const wrong=await request("/api/workflow/client-actions/submit",client,{method:"POST",status:400,body:{
 assignmentId:created.assignment.id,driveUrl:"https://evil.example/file/d/1",requestKey:"ops-bad-"+randomUUID(),expectedAuthorUserId:client.id,note:""}});
assert.ok(wrong.error);
const submit={assignmentId:created.assignment.id,driveUrl:"https://drive.google.com/file/d/synthetic-link-e2e/view",
 note:"Gravação sintética para validação",requestKey:"ops-submit-"+randomUUID(),expectedAuthorUserId:client.id};
const submitted=await request("/api/workflow/client-actions/submit",client,{method:"POST",body:submit});
assert.ok(submitted.submission?.id);
await request("/api/workflow/client-actions/submit",client,{method:"POST",body:submit});
await request("/api/workflow/client-actions/submit",other,{method:"POST",body:{...submit,expectedAuthorUserId:other.id},status:403});
const queueQuery="/api/workflow/client-actions/review-queue?"+new URLSearchParams({projectId:projectA,expectedAuthorUserId:staff.id});
const queue=await request(queueQuery,staff);
assert.ok(queue.reviews.some(r=>r.submissionId===submitted.submission.id&&r.driveUrl===submit.driveUrl));
await request(queueQuery,client,{status:409}); // Mismatched identity, not a privileged team read.
const revision={assignmentId:created.assignment.id,submissionId:submitted.submission.id,
 decision:"correction_requested",feedback:"Regravar com iluminação adequada",expectedAuthorUserId:staff.id};
const corrected=await request("/api/workflow/client-actions/review",staff,{method:"POST",body:revision});
assert.equal(corrected.review.status,"correction_requested");
const newSubmission=await request("/api/workflow/client-actions/submit",client,{method:"POST",body:{
 ...submit,driveUrl:"https://drive.google.com/file/d/synthetic-revision-e2e/view",requestKey:"ops-resubmit-"+randomUUID()
}});
assert.ok(newSubmission.submission.id);
const approved=await request("/api/workflow/client-actions/review",admin,{method:"POST",body:{
 assignmentId:created.assignment.id,submissionId:newSubmission.submission.id,decision:"validated",feedback:"",expectedAuthorUserId:admin.id
}});
assert.equal(approved.review.status,"validated");
const project=await must(db.from("planning_projects").select("data").eq("id",projectA).single(),"project not changed by submission");
assert.equal(project.data.editorialCalendar[0].status,"idea","action validation must not approve editorial idea");
const appearanceQuery=(actor)=>"/api/account/appearance?"+new URLSearchParams({expectedAuthorUserId:actor.id});
assert.equal((await request(appearanceQuery(client),client)).appearance,"system");
assert.equal((await request("/api/account/appearance",client,{method:"PATCH",body:{appearance:"dark",expectedAuthorUserId:client.id}})).appearance,"dark");
assert.equal((await request(appearanceQuery(client),client)).appearance,"dark");
assert.equal((await request(appearanceQuery(other),other)).appearance,"system");
console.log("PASS real local Auth: strategist, staff, client and cross-tenant G2");
console.log("PASS real local PostgREST: Drive URL submission, retry, correction, validation and editorial status independence");
console.log("PASS per-account appearance stored for one synthetic user without leaking to other tenant");
console.log("NO EXTERNAL DRIVE FETCH; LINK ACCESS REQUIRES OWNER'S SHARING POLICY");
