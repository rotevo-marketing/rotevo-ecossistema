const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../..");
function load(file,mocks={},cache=new Map()){
 const full=path.resolve(root,file);if(cache.has(full))return cache.get(full).exports;const mod={exports:{}};cache.set(full,mod);
 const code=ts.transpileModule(fs.readFileSync(full,"utf8"),{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const req=name=>{if(Object.hasOwn(mocks,name))return mocks[name];if(name.endsWith(".css"))return new Proxy({},{get:(_,key)=>key});if(name.startsWith("@/"))return resolve("src/"+name.slice(2));if(name.startsWith("."))return resolve(path.relative(root,path.resolve(path.dirname(full),name)));return require(name);};
 function resolve(rel){if(!fs.existsSync(path.join(root,rel))){if(fs.existsSync(path.join(root,rel+".ts")))rel+=".ts";else rel+=".tsx";}return load(rel,mocks,cache);}
 new Function("require","module","exports",code)(req,mod,mod.exports);return mod.exports;
}
const policy=load("src/lib/security/clientTaskPolicy.ts"),projection=load("src/lib/security/projectForClient.ts").projectForClient,guards=load("src/lib/collaboration/guards.ts");
const uid=i=>"00000000-0000-4000-8000-"+String(i).padStart(12,"0");
const fixtures=["Rubim","Piffer","Flavia","Jackson","Ana"].map((name,i)=>({id:uid(i+1),client_id:uid(i+11),user:uid(i+21),title:"Projeto sintético "+name,slug:"synthetic-"+i,description:null,status:"draft",updated_at:"2026-11-18T12:00:00Z",data:{planningStructureVersion:5,portalModules:["execution","content"],executionTimeline:[],editorialCalendar:[]}}));
const task=()=>({id:uid(100),kind:"task",title:"Atividade sintética",description:"PRIVATE_DESCRIPTION",internalNotes:"PRIVATE_NOTES",driveUrl:"https://example.test/PRIVATE_FILE",owner:"Estrategista sintético",ownerUserId:"PRIVATE_OWNER_ID",status:"planned",dueDate:"2026-11-20",visibleToClient:false,checklist:[{id:"c",text:"PRIVATE_CHECKLIST",done:true}]});
test("five synthetic clients: existing and future project tasks mirror from one record, with safe text and read-only fields",()=>{
 for(const row of fixtures){const value=structuredClone(row);value.data.executionTimeline=[task()];const original=structuredClone(value),p=projection(value,["execution","content"]);
 assert.equal(p.data.executionTimeline.length,1,row.title);assert.equal(p.data.executionTimeline[0].title,"Atividade sintética");assert.equal(p.data.executionTimeline[0].visibleToClient,true);
 assert.deepEqual(p.data.executionTimeline[0].progress,{completed:1,total:1});assert.doesNotMatch(JSON.stringify(p),/PRIVATE_/);assert.deepEqual(value,original);
 value.data.executionTimeline[0].status="completed";value.data.executionTimeline[0].dueDate="2026-11-25";value.data.executionTimeline[0].completedAt="2026-11-18T12:00:00Z";
 const updated=projection(value,["execution"]).data.executionTimeline[0];assert.equal(updated.status,"completed");assert.equal(updated.dueDate,"2026-11-25");assert.equal(updated.completedAt,"2026-11-18T12:00:00Z");
 assert.equal(projection(value,["content"]).data.executionTimeline.length,0);
 }
});
test("confidential, deleted and archived tasks are never projected or eligible for client conversation",()=>{
 for(const patch of [{clientVisibility:"confidential",clientConfidentialReason:"Restrito"},{deletedAt:"2026-11-18T12:00:00Z"},{archivedAt:"2026-11-18T12:00:00Z"}]){
 const t={...task(),...patch};assert.equal(policy.projectClientTask(t),null);assert.equal(guards.resourceIsVisible({executionTimeline:[t]},"task",t.id),false);}
 const t={...task(),clientSummary:"Contexto aprovado"};assert.equal(policy.projectClientTask(t).description,"Contexto aprovado");
 assert.equal(guards.resourceIsVisible({executionTimeline:[t]},"task",t.id),true);
 assert.equal(guards.canAccessConversation({role:"client",userClientId:"a",projectClientId:"b",workspaceModules:["execution"],projectData:{executionTimeline:[t]},resourceType:"task",resourceId:t.id}),false);
 assert.equal(guards.resourceIsVisible({editorialCalendar:[{id:"x",visibleToClient:false}]},"content","x"),false);
});
test("privacy exception records author, reason and time on the server and preserves rollback privacy",()=>{
 const before={executionTimeline:[task()]},after=structuredClone(before);Object.assign(after.executionTimeline[0],{clientVisibility:"confidential",clientConfidentialReason:"Discussão interna"});
 assert.ok(policy.recordTaskPrivacy(before,after,uid(91),"2026-11-18T12:00:00Z"));
 assert.equal(after.executionTimeline[0].clientVisibilityAudit[0].by,uid(91));assert.equal(before.executionTimeline[0].clientVisibilityAudit,undefined);
 const forged=structuredClone(before);forged.executionTimeline[0].clientVisibilityAudit=[{by:"forged"}];assert.equal(policy.recordTaskPrivacy(before,forged,uid(91)),false);
 const missing=structuredClone(before);missing.executionTimeline[0].clientVisibility="confidential";assert.equal(policy.recordTaskPrivacy(before,missing,uid(91)),false);
 const created={executionTimeline:[{...task(),visibleToClient:true}]};assert.ok(policy.recordTaskPrivacy({},created,uid(91)));assert.equal(created.executionTimeline[0].clientProjectionVersion,1);assert.equal(created.executionTimeline[0].visibleToClient,false);assert.ok(policy.clientTaskVisible(created.executionTimeline[0]));
});
function route(file,{actor,role="client",projects=fixtures,rpc,env={},profileClientId}={}){
 const mod={exports:{}},code=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const current=fixtures.find(p=>p.user===actor),calls=[];
 const q=table=>{const filters=[];const query={select(){return query},eq(k,v){filters.push([k,v]);return query},in(){return query},async maybeSingle(){
 if(table==="profiles")return {data:{id:actor,role,client_id:profileClientId??current?.client_id},error:null};
 if(table==="client_workspaces")return {data:{data:{modules:["execution","content"],contracts:[],folders:[]}},error:null};
 if(table==="clients")return {data:{status:"active",cover_image_url:""},error:null};
 if(table==="team_members")return {data:{active:true,role:"producer"},error:null};
 if(table==="planning_projects")return {data:projects.find(p=>filters.every(([k,v])=>p[k]===v)),error:null};
 return {data:null,error:null};},async order(){calls.push({table,filters});return {data:projects.filter(p=>filters.every(([k,v])=>p[k]===v)),error:null};}};return query;};
 const client={auth:{getUser:async()=>({data:{user:actor?{id:actor,app_metadata:{}}:null},error:null})},from:q,rpc:async(name,args)=>{calls.push({rpc:name,args});return rpc?rpc(name,args):{data:null,error:null};}};
 const mocks={"next/server":{NextResponse:{json:(body,{status=200,headers={}}={})=>({status,body,headers})}},"@supabase/supabase-js":{createClient:()=>client},"@/lib/security/projectForClient":{projectForClient:projection},"@/lib/security/clientTaskPolicy":policy,"@/lib/operations/model":load("src/lib/operations/model.ts"),"@/lib/collaboration/guards":guards,"@/lib/workflow/clientActionsContract":load("src/lib/workflow/clientActionsContract.ts"),
 "@/lib/planning/stages":{validPlanningStages:()=>true},"@/lib/planning/areaSchedule":{validPlanningAreaSchedule:()=>true},"@/lib/planning/companyAnalysis":load("src/lib/planning/companyAnalysis.ts"),"@/lib/security/ecosystemDocumentTransitions":{validEcosystemDocumentTransition:()=>true},"@/lib/security/executionDependencyValidation":{validExecutionDependencies:()=>true},"@/lib/security/meetingAgendaValidation":{validMeetingAgenda:()=>true,recordMeetingMinutes:()=>{}},"@/lib/security/campaignMetricsValidation":{validCampaignRecords:()=>true,validCampaignLinks:()=>true},"@/data/ecosystem2027":{ecosystemDocuments:[]}};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{if(!mocks[name])throw Error("Unexpected import "+name);return mocks[name];},process:{env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_SUPABASE_ANON_KEY:"synthetic",SUPABASE_SERVICE_ROLE_KEY:"synthetic",ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED:"true",ROTEVO_CLIENT_ACTIONS_ENABLED:"true",ROTEVO_NOTIFICATIONS_ENABLED:"true",...env}},URL,Date,JSON,Map,Set});
 const req=body=>({headers:{get:()=>"Bearer synthetic"},json:async()=>body,nextUrl:{searchParams:new URLSearchParams({projectId:current?.id??fixtures[0].id,expectedAuthorUserId:actor??""})}});
 return {handlers:mod.exports,req,calls};
}
test("five authenticated API fixtures see only their own project, including draft V5, and cannot mutate tasks",async()=>{
 const projects=structuredClone(fixtures);for(const p of projects)p.data.executionTimeline=[task()];
 for(const p of projects){const h=route("src/app/api/client/projects/route.ts",{actor:p.user,projects}),r=await h.handlers.GET(h.req());
 assert.equal(r.status,200);assert.deepEqual(Array.from(r.body.projects,x=>x.id),[p.id]);assert.equal(r.body.projects[0].data.executionTimeline.length,1);assert.equal(r.headers["Cache-Control"],"no-store");
 const write=route("src/app/api/admin/project/update/route.ts",{actor:p.user,projects});assert.equal((await write.handlers.PATCH(write.req({projectId:p.id,expectedUpdatedAt:p.updated_at,data:{...p.data,executionTimeline:[]}}))).status,403);
 }
});
test("notification audience gates, exact unread count and own-identity acknowledgment",async()=>{
 for(const p of fixtures){
 const rpc=(name)=>({data:name==="rotevo_workflow_notification_access"?"client":name==="rotevo_workflow_unread_notification_count"?73:name==="rotevo_workflow_mark_notification_read_v2"?true:[],error:null});
 const h=route("src/app/api/workflow/notifications/route.ts",{actor:p.user,rpc,env:{ROTEVO_NOTIFICATIONS_AUDIENCE:"enabled_clients"}});
 const r=await h.handlers.GET(h.req());assert.equal(r.status,200);assert.equal(r.body.unreadCount,73);
 assert.equal((await h.handlers.PATCH(h.req({notificationId:uid(99),expectedAuthorUserId:uid(999)}))).status,409);
 assert.equal((await h.handlers.PATCH(h.req({notificationId:uid(99),expectedAuthorUserId:p.user}))).status,200);
 const off=route("src/app/api/workflow/notifications/route.ts",{actor:p.user,rpc});assert.equal((await off.handlers.GET(off.req())).status,403);
 }
 const pilot=route("src/app/api/workflow/notifications/route.ts",{actor:fixtures[0].user,env:{ROTEVO_NOTIFICATIONS_PILOT_USER_IDS:fixtures[0].user},rpc:name=>({data:name==="rotevo_workflow_notification_access"?"client":[],error:null})});assert.equal((await pilot.handlers.GET(pilot.req())).status,200);
 const revoked=route("src/app/api/workflow/notifications/route.ts",{actor:fixtures[0].user,env:{ROTEVO_NOTIFICATIONS_AUDIENCE:"enabled_clients"},rpc:()=>({data:null,error:null})});assert.equal((await revoked.handlers.GET(revoked.req())).status,403);
});
test("SQL proposals preserve existing RPC authorization and never migrate operational content",()=>{
 const sql=fs.readFileSync(path.join(root,"docs/security/sql/ui3-portal-standardization-structures-PROPOSAL-ONLY.sql"),"utf8"),links=fs.readFileSync(path.join(root,"docs/security/sql/ui3-portal-standardization-associations-PROPOSAL-ONLY.sql"),"utf8");
 assert.match(sql,/Service only/);assert.match(sql,/revoke all on function public.rotevo_provision_client_profile[^;]+from public,anon,authenticated/);
 assert.match(sql,/on conflict\(client_id,user_id\) do nothing/);assert.match(sql,/Identity already belongs to another scope/);assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/recipient_user_id=auth.uid\(\)/);assert.match(sql,/on conflict\(event_id,recipient_user_id\) do nothing/);
 assert.doesNotMatch(links,/update public\.planning_projects|delete from|insert into rotevo_workflow\.client_action_assignments/i);
 assert.match(sql,/G2 write denied/);assert.match(sql,/Client tenant access denied/);
});

test("five assignment HTTP flows preserve explicit release, Drive delivery, review and stable record IDs (RPC boundary simulated)",async()=>{
 const team=uid(91),assignmentId=uid(501),submissionId=uid(502);
 for(const p of fixtures){let record=null,submission=null;const events=[];
 const rpc=(name,args)=>{
  if(name==="rotevo_client_action_create"){record??={id:assignmentId,status:"pending",project_id:args.p_project_id,client_user_id:args.p_client_user_id,instructions:args.p_instructions};events.push("released");return {data:record,error:null};}
  if(name==="rotevo_client_action_list")return {data:record?[record]:[],error:null};
  if(name==="rotevo_client_action_submit"){submission={id:submissionId,assignment_id:args.p_assignment_id,drive_url:args.p_drive_url,note:args.p_note};record.status="submitted";events.push("submitted");return {data:submission,error:null};}
  if(name==="rotevo_client_action_review"){record.status=args.p_decision;events.push(args.p_decision);return {data:{id:assignmentId,status:record.status},error:null};}
  throw Error("Unexpected RPC "+name);
 };
 const list=route("src/app/api/workflow/client-actions/route.ts",{actor:p.user,rpc});
 assert.equal((await list.handlers.GET(list.req())).body.assignments.length,0);
 const create=route("src/app/api/workflow/client-actions/route.ts",{actor:team,role:"strategist",rpc});
 const body={projectId:p.id,resourceType:"task",resourceId:task().id,resourceVersion:null,clientUserId:p.user,actionType:"send_material",instructions:"Enviar material sintético pelo Drive",dueDate:"2026-11-25",requestKey:"release-test-"+p.id,expectedAuthorUserId:team};
 assert.equal((await create.handlers.POST(create.req(body))).status,200);
 assert.equal((await create.handlers.POST(create.req(body))).body.assignment.id,assignmentId);
 assert.equal((await list.handlers.GET(list.req())).body.assignments[0].client_user_id,p.user);
 const submit=route("src/app/api/workflow/client-actions/submit/route.ts",{actor:p.user,rpc});
 const delivery={assignmentId,driveUrl:"https://drive.google.com/file/d/synthetic/view",note:"Entrega sintética",requestKey:"delivery-test-"+p.id,expectedAuthorUserId:p.user};
 assert.equal((await submit.handlers.POST(submit.req({...delivery,expectedAuthorUserId:team}))).status,409);
 assert.equal((await submit.handlers.POST(submit.req(delivery))).status,200);assert.equal(submission.assignment_id,assignmentId);
 const review=route("src/app/api/workflow/client-actions/review/route.ts",{actor:team,role:"strategist",rpc});
 assert.equal((await review.handlers.POST(review.req({assignmentId,submissionId,decision:"validated",feedback:"Validado em teste",expectedAuthorUserId:team}))).status,200);
 assert.equal(record.status,"validated");assert.deepEqual(events,["released","released","submitted","validated"]);
 assert.equal(create.calls.filter(x=>x.rpc).every(x=>x.rpc==="rotevo_client_action_create"),true);
 }
});

module.exports={load,route,fixtures,task};
