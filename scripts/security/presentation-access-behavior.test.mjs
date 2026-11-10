// Runs the original presentation handler with synthetic Auth/database boundaries only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../../src/app/api/presentation/project/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({reset=false,workspace={modules:['planning']},clientId='a',role='client'}={}){
 const calls=[];
 const db={from(table){const q={select(){return q},eq(){return q},async maybeSingle(){calls.push(table);return {error:null,data:table==='profiles'?{role,client_id:clientId}:table==='planning_projects'?{id:'project-a',client_id:'a',slug:'synthetic-a',data:{}}:table==='client_workspaces'?(workspace?{data:workspace}:null):null}}};return q;}};
 const mocks={'next/server':{NextResponse:{json:(body,{status=200}={})=>({status,body})}},'@supabase/supabase-js':{createClient:(_url,key)=>key==='anon'?{auth:{getUser:async()=>({data:{user:{id:'synthetic',app_metadata:{rotevo_password_reset_required:reset}}},error:null})}}:db},'@/lib/operations/model':{emptyWorkspace:()=>({modules:['planning']}),workspaceForClient:data=>data??{modules:[]}},'@/lib/security/projectForPresentation':{projectForPresentation:p=>({id:p.id,data:{published:true}})}};
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'http://synthetic.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server'}},require:id=>{assert.ok(Object.hasOwn(mocks,id),id);return mocks[id]}});
 const request={headers:{get:()=> 'Bearer synthetic'},nextUrl:new URL('https://synthetic.invalid/api/presentation/project?slug=synthetic-a')};
 return {run:()=>module.exports.GET(request),calls};
}
test('presentation rejects required first-password setup before privileged profile/project lookup',async()=>{const h=harness({reset:true});assert.equal((await h.run()).status,403);assert.deepEqual(h.calls,[]);});
test('presentation denies a missing workspace instead of enabling planning by default',async()=>{assert.equal((await harness({workspace:null}).run()).status,404);});
test('presentation denies a workspace without the planning module',async()=>{assert.equal((await harness({workspace:{modules:[]}}).run()).status,404);});
test('presentation allows the authorized tenant with explicit planning and denies another tenant',async()=>{assert.equal((await harness().run()).status,200);assert.equal((await harness({clientId:'b'}).run()).status,404);});
