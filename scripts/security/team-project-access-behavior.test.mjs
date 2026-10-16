import test from "node:test";
import assert from "node:assert/strict";
import {mayMutateProject} from "../../src/lib/security/teamProjectAuthorization.ts";

const userId="11111111-1111-4111-8111-111111111111";
const projectId="22222222-2222-4222-8222-222222222222";
function database(rows={},failures=[]){
 const calls=[];
 const from=(table)=>{
  const filters=[];
  const query={
   select(){return query},
   eq(key,value){filters.push([key,value]);return query},
   async maybeSingle(){
    calls.push({table,filters});
    return failures.includes(table)?{data:null,error:{message:"database unavailable"}}:{data:rows[table]??null,error:null};
   }
  };
  return query;
 };
 return {client:{from},calls};
}
async function check(rows,failures=[]){
 const db=database(rows,failures);
 return {result:await mayMutateProject(db.client,userId,projectId),calls:db.calls};
}
const prior=process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED;
test("project writes deny missing and inactive members, grants and assignments",async()=>{
 process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED="true";
 try{
  for(const member of [null,{role:"producer",active:false}]){
   const {result,calls}=await check({team_members:member});
   assert.deepEqual(result,{allowed:false,status:403});
   assert.equal(calls.length,1);
  }
  const active={role:"producer",active:true};
  assert.deepEqual((await check({team_members:active})).result,{allowed:false,status:403});
  assert.deepEqual((await check({team_members:active,team_project_assignments:{project_id:projectId}})).result,{allowed:false,status:403});
  const allowed=await check({team_members:active,team_project_assignments:{project_id:projectId},team_member_permissions:{permission:"projects.write"}});
  assert.deepEqual(allowed.result,{allowed:true,status:200});
  assert.deepEqual(allowed.calls[1].filters,[["user_id",userId],["project_id",projectId]]);
  assert.deepEqual(allowed.calls[2].filters,[["user_id",userId],["permission","projects.write"]]);
 }finally{
  if(prior===undefined)delete process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED;
  else process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED=prior;
 }
});
test("project authorization denies database failures and allows active administrator",async()=>{
 process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED="true";
 try{
  for(const table of ["team_members","team_project_assignments","team_member_permissions"]){
   const {result}=await check({team_members:{active:true,role:"producer"},team_project_assignments:{project_id:projectId}},[table]);
   assert.deepEqual(result,{allowed:false,status:503});
  }
  const admin=await check({team_members:{active:true,role:"admin"}});
  assert.deepEqual(admin.result,{allowed:true,status:200});
  assert.equal(admin.calls.length,1);
 }finally{
  if(prior===undefined)delete process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED;
  else process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED=prior;
 }
});
