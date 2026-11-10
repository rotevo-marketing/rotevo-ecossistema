// Synthetic HTTP-level role/tenant tests. No network, credentials, or customer data.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../../src/app/api/client/projects/route.ts",import.meta.url),"utf8");
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const fixtureProjects=[
 {id:"project-a",client_id:"tenant-a",title:"A",slug:"a",description:null,status:"in_progress",updated_at:"",data:{}},
 {id:"project-b",client_id:"tenant-b",title:"B",slug:"b",description:null,status:"in_progress",updated_at:"",data:{}}
];
function harness({bearer="Bearer token",profileRole="client",clientId="tenant-a",reset=false,authenticated=true,workspaceModules=["planning"]}={}){
 const calls=[];
 const query=table=>{
  const filters=[];
  const q={
   select(){return q},
   eq(k,v){filters.push([k,v]);return q},
   in(k,v){filters.push([k,v]);return q},
   maybeSingle:async()=>{
    calls.push({table,filters:[...filters]});
    if(table==="profiles")return {data:{role:profileRole,client_id:clientId},error:null};
    if(table==="client_workspaces")return {data:{data:{modules:workspaceModules,contracts:[],folders:[]}},error:null};
    if(table==="clients")return {data:{cover_image_url:""},error:null};
    return {data:null,error:null};
   },
   order:async()=>{
    calls.push({table,filters:[...filters]});
    if(table==="planning_projects")return {data:fixtureProjects.filter(p=>filters.every(([k,v])=>k!=="client_id"||p.client_id===v)),error:null};
    return {data:[],error:null};
   }
  };
  return q;
 };
 let clientCount=0;
 const createClient=(_url,key)=>{
  clientCount++;
  return key==="anon-key"?{auth:{getUser:async()=>({data:{user:authenticated?{id:"user-a",app_metadata:{rotevo_password_reset_required:reset}}:null},error:null})}}:{
   from:query,storage:{from:()=>({createSignedUrls:async()=>({data:[],error:null})})}
  };
 };
 const response={json:(body,{status=200,headers={}}={})=>({status,body,headers})};
 const module={exports:{}};
 const mocks={
  "@/lib/operations/model":{emptyWorkspace:()=>({modules:[]}),workspaceForClient:data=>data},
  "next/server":{NextResponse:response,NextRequest:class{}},
  "@supabase/supabase-js":{createClient},
  "@/lib/security/projectForClient":{projectForClient:(p,modules)=>({id:p.id,title:p.title,data:{executionTimeline:[],modules}})}
 };
 vm.runInNewContext(transpiled,{module,exports:module.exports,require:id=>{
  if(!Object.hasOwn(mocks,id))throw Error("Unmocked module: "+id);
  return mocks[id];
 },process:{env:{NEXT_PUBLIC_SUPABASE_URL:"https://synthetic.example",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon-key",SUPABASE_SERVICE_ROLE_KEY:"service-key"}}});
 const request={headers:{get:key=>key==="authorization"?bearer:null},url:"https://synthetic.example/api/client/projects?client_id=tenant-b"};
 return {request,GET:module.exports.GET,calls,getClientCount:()=>clientCount};
}
test("client project API requires valid bearer, authenticated identity and finished password setup",async()=>{
 let h=harness({bearer:null});
 assert.equal((await h.GET(h.request)).status,401);
 assert.equal(h.getClientCount(),0);
 h=harness({authenticated:false});
 assert.equal((await h.GET(h.request)).status,401);
 h=harness({reset:true});
 assert.equal((await h.GET(h.request)).status,403);
 assert.equal(h.calls.length,0,"reset-required identity must not read tenant profile");
});
test("strategists and staff cannot use the client project endpoint",async()=>{
 for(const profileRole of ["staff","strategist"]){
  const h=harness({profileRole});
  const result=await h.GET(h.request);
  assert.equal(result.status,403,profileRole);
  assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);
 }
});
test("client A cannot select client B projects via request query or arbitrary data",async()=>{
 const h=harness();
 const response=await h.GET(h.request);
 assert.equal(response.status,200);
 assert.deepEqual(Array.from(response.body.projects,x=>x.id),["project-a"]);
 assert.equal(JSON.stringify(response.body).includes("project-b"),false);
 const projectCall=h.calls.find(c=>c.table==="planning_projects");
 assert.equal(projectCall.filters.some(([key,value])=>key==="client_id"&&value==="tenant-a"),true);
 assert.equal(response.headers["Cache-Control"],"no-store");
});
test("client B sees only assigned tenant B, with modules provided by workspace",async()=>{
 const h=harness({clientId:"tenant-b",workspaceModules:["content"]});
 const response=await h.GET(h.request);
 assert.equal(response.status,200);
 assert.deepEqual(Array.from(response.body.projects,x=>x.id),["project-b"]);
 assert.deepEqual(Array.from(response.body.projects[0].data.modules),["content"]);
});
test("missing client association is refused before querying projects",async()=>{
 const h=harness({clientId:null});
 assert.equal((await h.GET(h.request)).status,403);
 assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);
});
