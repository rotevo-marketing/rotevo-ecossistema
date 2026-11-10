// Real strategist project handler with injected synthetic Supabase boundaries; no network.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../../src/app/api/admin/project/route.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const id="a1111111-1111-4111-8111-111111111111";
const project={id,client_id:"tenant-a",title:"Synthetic project",slug:"synthetic",data:{internalNotes:"PRIVATE_FIXTURE"}};

function fixture({authorization="Bearer fixture",requestedId=id,authenticated=true,passwordReset=false,
 profileRole="strategist",enforce=true,memberActive=true,memberRole="producer",assigned=true,
 permitted=true,exists=true}={}){
 const accesses=[];
 const client=(key)=>key==="anon" ? {
  auth:{getUser:async()=>({data:{user:authenticated?{id:"user-a",app_metadata:{rotevo_password_reset_required:passwordReset}}:null},error:null})}
 }:{
  from:table=>{
   const filters=[];
   const q={select(fields){accesses.push({table,fields});return q},
    eq(field,value){filters.push([field,value]);return q},
    async maybeSingle(){
     accesses.push({table,filters:[...filters]});
     if(table==="profiles")return {data:{role:profileRole},error:null};
     if(table==="team_members")return {data:{role:memberRole,active:memberActive},error:null};
     if(table==="team_project_assignments")return {data:assigned?{project_id:id}:null,error:null};
     if(table==="team_member_permissions")return {data:permitted?{permission:"projects.read"}:null,error:null};
     if(table==="planning_projects")return {data:exists&&filters.some(([k,v])=>k==="id"&&v===id)?project:null,error:null};
     return {data:null,error:null};
    }
   };return q;
  }
 };
 const createClient=(_url,key)=>client(key);
 const NextResponse={json:(body,{status=200,headers={}}={})=>({status,body,headers})};
 const module={exports:{}};
 const imports={"next/server":{NextResponse},"@supabase/supabase-js":{createClient}};
 vm.runInNewContext(code,{module,exports:module.exports,require:key=>{
  if(!Object.hasOwn(imports,key))throw Error("Unknown dependency: "+key);
  return imports[key];
 },process:{env:{NEXT_PUBLIC_SUPABASE_URL:"https://fixture.invalid",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service",ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED:enforce?"true":"false"}}});
 return {
  GET:module.exports.GET,
  request:{headers:{get:key=>key==="authorization"?authorization:null},nextUrl:{searchParams:{get:key=>key==="id"?requestedId:null}}},
  accesses
 };
}
async function invoke(options){const x=fixture(options);return {response:await x.GET(x.request),accesses:x.accesses};}

test("strategist project handler denies missing identity, invalid IDs and forced password reset before data access",async()=>{
 for(const [options,status] of [[{authorization:null},401],[{requestedId:"bad"},400],[{authenticated:false},401],[{passwordReset:true},403]]){
  const r=await invoke(options);
  assert.equal(r.response.status,status);
  assert.equal(r.accesses.length,0,"No privileged lookup before authorization");
 }
});
test("client/staff profile does not receive strategist private project JSON",async()=>{
 for(const profileRole of ["client","staff"]){
  const x=await invoke({profileRole});
  assert.equal(x.response.status,403);
  assert.equal(x.accesses.some(c=>c.table==="planning_projects"),false);
 }
});
test("inactive strategist and unauthorized staff project assignments are rejected when enforcement is enabled",async()=>{
 for(const options of [{memberActive:false},{assigned:false},{permitted:false}]){
  const x=await invoke(options);
  assert.equal(x.response.status,403);
  assert.equal(x.accesses.some(c=>c.table==="planning_projects"),false);
 }
});
test("administrator can read authorized project and project metadata stays no-store",async()=>{
 const x=await invoke({memberRole:"admin",assigned:false,permitted:false});
 assert.equal(x.response.status,200);
 assert.equal(x.response.body.project.id,id);
 assert.equal(x.response.headers["Cache-Control"],"no-store");
 assert.equal(x.accesses.some(c=>c.table==="team_project_assignments"),false);
});
test("staff granted assignment and read permission accesses only specified project",async()=>{
 const allow=await invoke({assigned:true,permitted:true});
 assert.equal(allow.response.status,200);
 assert.equal(allow.response.body.project.id,id);
 const deny=await invoke({requestedId:"b2222222-2222-4222-8222-222222222222"});
 assert.equal(deny.response.status,404);
 assert.equal(deny.accesses.some(c=>c.table==="planning_projects"),true);
});
