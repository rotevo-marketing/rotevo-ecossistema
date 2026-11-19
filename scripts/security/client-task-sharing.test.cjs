const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function load(file,mocks={},cache=new Map()){
 const full=path.resolve(root,file);if(cache.has(full))return cache.get(full).exports;const mod={exports:{}};cache.set(full,mod);
 const code=ts.transpileModule(fs.readFileSync(full,"utf8"),{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const req=name=>{if(Object.hasOwn(mocks,name))return mocks[name];if(name.endsWith(".css"))return new Proxy({},{get:(_,key)=>key});if(name.startsWith("@/"))return resolve("src/"+name.slice(2));if(name.startsWith("."))return resolve(path.relative(root,path.resolve(path.dirname(full),name)));return require(name);};
 function resolve(rel){if(!fs.existsSync(path.join(root,rel))){if(fs.existsSync(path.join(root,rel+".ts")))rel+=".ts";else rel+=".tsx";}return load(rel,mocks,cache);}
 new Function("require","module","exports",code)(req,mod,mod.exports);return mod.exports;
}

const policy=load('src/lib/security/clientTaskPolicy.ts'),projection=load('src/lib/security/projectForClient.ts').projectForClient,guards=load('src/lib/collaboration/guards.ts');
const valid=load('src/lib/security/executionDependencyValidation.ts').validExecutionDependencies;
const uid=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const task=()=>({id:uid(100),title:'Preparar roteiro',kind:'task',status:'in_progress',clientProjectionVersion:1,visibleToClient:false,description:'PRIVATE_DESCRIPTION',clientSummary:'Resumo aprovado',checklist:[{id:'a',text:'Briefing recebido',done:true,visibleToClient:true,internalNote:'PRIVATE_NOTE'},{id:'b',text:'PRIVATE_STEP',done:true},{id:'c',text:'Validar roteiro',done:false,visibleToClient:true}]});
const fixtures=[0,1].map(i=>({id:uid(i+1),client_id:uid(i+11),user:uid(i+21),title:'Projeto sintético '+i,slug:'sharing-'+i,description:null,status:'draft',updated_at:'2026-11-19T12:00:00Z',data:{portalModules:['execution','content'],executionTimeline:[task()],editorialCalendar:[]}}));
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
test('explicit description sharing overrides an empty summary; revocation returns to safe summary and never mutates history',()=>{
 const t=task(),snapshot=structuredClone(t);assert.equal(policy.projectClientTask(t).description,'Resumo aprovado');
 t.clientDescriptionApproved=true;t.clientSummary='';assert.equal(policy.projectClientTask(t).description,'PRIVATE_DESCRIPTION');
 t.clientDescriptionApproved=false;assert.equal(policy.projectClientTask(t).description,undefined);
 t.clientSummary='Resumo aprovado';assert.deepEqual(t,{...snapshot,clientDescriptionApproved:false});
 const legacy={...task(),clientSummary:undefined,clientProjectionVersion:undefined,visibleToClient:true};assert.equal(policy.projectClientTask(legacy).description,'PRIVATE_DESCRIPTION');
 const hidden={...task(),clientVisibility:'confidential',clientDescriptionApproved:true};assert.equal(policy.projectClientTask(hidden),null);
});
test('only explicitly shared original checklist steps leave the server; aggregate progress remains real',()=>{
 const t=task(),before=structuredClone(t),p=policy.projectClientTask(t);
 assert.deepEqual(p.checklist,[{id:'a',text:'Briefing recebido',done:true},{id:'c',text:'Validar roteiro',done:false}]);assert.deepEqual(p.progress,{completed:2,total:3});assert.doesNotMatch(JSON.stringify(p),/PRIVATE_/);assert.deepEqual(t,before);
 t.checklist[0].done=false;t.checklist[2].done=true;const next=policy.projectClientTask(t);assert.equal(next.checklist[0].done,false);assert.equal(next.checklist[1].done,true);assert.deepEqual(next.progress,{completed:2,total:3});
 for(const c of t.checklist)delete c.visibleToClient;assert.equal(policy.projectClientTask(t).checklist,undefined);
});
test('sharing metadata is bounded and typed at the server write boundary; unrelated saves preserve historic private steps',()=>{
 const before={executionTimeline:[task()]},after=structuredClone(before);assert.equal(valid(after),true);assert.equal(policy.recordTaskPrivacy(before,after,uid(91)),true);assert.equal(after.executionTimeline[0].checklist[1].visibleToClient,undefined);
 for(const flag of ['true',1,{},null]){const forged=structuredClone(before);forged.executionTimeline[0].checklist[1].visibleToClient=flag;assert.equal(valid(forged),false);assert.equal(policy.recordTaskPrivacy(before,forged,uid(91)),false);}
});
test('new sharing payloads still cross the authenticated allowlist and cannot be written by a client or read across tenants',async()=>{
 const projects=structuredClone(fixtures);for(const p of projects){p.data.executionTimeline[0].clientDescriptionApproved=true;}
 for(const p of projects){const h=route('src/app/api/client/projects/route.ts',{actor:p.user,projects});const r=await h.handlers.GET(h.req());assert.equal(r.status,200);assert.deepEqual(Array.from(r.body.projects,x=>x.id),[p.id]);assert.equal(r.body.projects[0].data.executionTimeline[0].checklist.length,2);assert.doesNotMatch(JSON.stringify(r.body),/PRIVATE_STEP|PRIVATE_NOTE/);
 const write=route('src/app/api/admin/project/update/route.ts',{actor:p.user,projects});const payload={projectId:p.id,expectedUpdatedAt:p.updated_at,data:{...p.data,executionTimeline:[{...task(),description:'Tentativa do cliente',checklist:[]}]}};assert.equal((await write.handlers.PATCH(write.req(payload))).status,403);}
});
test('existing priority flag categories and exact strategist colors have no missing-priority fallback',()=>{
 const {taskPriorityFlag}=load('src/lib/operations/taskPriority.ts');assert.deepEqual(['urgent','high','normal','low'].map(x=>taskPriorityFlag(x).color),['#DA3553','#E39429','#497BD5','#8591A3']);for(const x of [undefined,null,'approved','pending','invalid'])assert.equal(taskPriorityFlag(x),null);
});

test('isolated validation cannot deploy or consume production Secrets',()=>{const workflow=fs.readFileSync(path.join(root,'.github/workflows/client-task-sharing-validation.yml'),'utf8');assert.match(workflow,/contents: read/);assert.match(workflow,/branches: \[fix\/client-portal-shared-details-20261119\]/);assert.doesNotMatch(workflow,/secrets\.|id-token:\s*write|vercel\s+(deploy|build)|supabase\s+link/i);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).git.deploymentEnabled,false);});
