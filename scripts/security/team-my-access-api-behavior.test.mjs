// Offline behavior-level testing of the REAL /api/team/my-access handler.
// Synthetic Supabase responses only; no credentials or hosted data.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const route=readFileSync(new URL("../../src/app/api/team/my-access/route.ts",import.meta.url),"utf8");
const code=ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const allProjects=[
 {id:"project-a",title:"Tenant A project",data:{internalNotes:"CANARY_PRIVATE_A"}},
 {id:"project-b",title:"Tenant B project",data:{internalNotes:"CANARY_PRIVATE_B"}}
];
function harness({token="Bearer fixture",authenticated=true,reset=false,profileRole="staff",active=true,
 memberRole="producer",permissions=["projects.read"],assignments=["project-a"]}={}){
 const calls=[];
 const query=table=>{
  const filters=[];
  const chain={
   select(columns){calls.push({type:"select",table,columns});return chain},
   eq(key,value){filters.push([key,value]);return chain},
   in(key,value){filters.push([key,value]);return chain},
   async maybeSingle(){
    calls.push({type:"single",table,filters:[...filters]});
    if(table==="profiles")return {data:{role:profileRole},error:null};
    if(table==="team_members")return {data:{role:memberRole,active,display_name:"Synthetic Staff"},error:null};
    return {data:null,error:null};
   },
   then(resolve,reject){
    calls.push({type:"list",table,filters:[...filters]});
    if(table==="team_project_assignments")return Promise.resolve({data:assignments.map(project_id=>({project_id})),error:null}).then(resolve,reject);
    if(table==="team_member_permissions")return Promise.resolve({data:permissions.map(permission=>({permission})),error:null}).then(resolve,reject);
    if(table==="planning_projects")return Promise.resolve({
     data:allProjects.filter(row=>filters.some(([k,ids])=>k==="id"&&Array.isArray(ids)&&ids.includes(row.id))),
     error:null
    }).then(resolve,reject);
    return Promise.resolve({data:[],error:null}).then(resolve,reject);
   }
  };
  return chain;
 };
 const createClient=(_url,key)=>key==="anon"?{
  auth:{getUser:async()=>({data:{user:authenticated?{id:"staff-a",app_metadata:{rotevo_password_reset_required:reset}}:null},error:null})}
 }:{from:query};
 const response={json:(body,{status=200,headers={}}={})=>({status,body,headers})};
 const module={exports:{}};
 const modules={
  "next/server":{NextResponse:response},
  "@supabase/supabase-js":{createClient}
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{
  if(!Object.hasOwn(modules,id))throw Error("Unexpected module: "+id);
  return modules[id];
 },process:{env:{NEXT_PUBLIC_SUPABASE_URL:"https://synthetic.invalid",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"}}});
 const request={headers:{get:key=>key==="authorization"?token:null}};
 return {GET:module.exports.GET,request,calls};
}

test("staff endpoint requires a verified session and completed initial password change",async()=>{
 for(const options of [{token:null},{authenticated:false},{reset:true}]){
  const h=harness(options);
  const response=await h.GET(h.request);
  assert.equal(response.status,options.reset?403:401);
  assert.equal(h.calls.length,0,"unauthorized identity must not query the service database");
 }
});
test("client, strategist and inactive team members cannot query staff assignments",async()=>{
 for(const options of [{profileRole:"client"},{profileRole:"strategist"},{active:false}]){
  const h=harness(options);
  const response=await h.GET(h.request);
  assert.equal(response.status,403);
  assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);
 }
});
test("staff without project read permission sees no project titles or content",async()=>{
 const h=harness({permissions:["tasks.read"],assignments:["project-a","project-b"]});
 const response=await h.GET(h.request);
 assert.equal(response.status,200);
 assert.equal(response.body.assignedProjectCount,2);
 assert.equal(Array.from(response.body.projects).length,0);
 assert.equal(JSON.stringify(response.body).includes("CANARY_PRIVATE"),false);
 assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);
});
test("staff with project read permission sees only assigned metadata, never JSON",async()=>{
 const h=harness({permissions:["projects.read"],assignments:["project-a"]});
 const response=await h.GET(h.request);
 assert.equal(response.status,200);
 assert.deepEqual(Array.from(response.body.projects,p=>p.id),["project-a"]);
 assert.equal(JSON.stringify(response.body).includes("project-b"),false);
 assert.equal(JSON.stringify(response.body).includes("CANARY_PRIVATE"),false);
 assert.equal(h.calls.some(c=>c.table==="planning_projects"&&c.columns==="id,title"),true);
});
test("staff with zero assignments never scans all projects",async()=>{
 const h=harness({assignments:[]});
 const response=await h.GET(h.request);
 assert.equal(response.status,200);
 assert.equal(response.body.assignedProjectCount,0);
 assert.equal(Array.from(response.body.projects).length,0);
 assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);
});
