// Offline, behavior-level authorization tests. Never connects to Supabase or Vercel.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../../src/lib/operations/assets.ts",import.meta.url),"utf8");
const script=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const modules={
 "./server":{administrator:v=>v.member?.role==="admin",authorizeProject:async(v,id)=>v.assignedProjects?.includes(id)===true},
 "../planning/richContent":{assetReferences:d=>Array.isArray(d)?d.flatMap(x=>x.documentId?[x.documentId]:[]):d?.publishedAssetIds??[]},
 "../security/projectForPresentation":{projectForPresentation:p=>p.data?.released?{data:{publishedAssetIds:p.data.publishedAssetIds??[]}}:null},
 "./model":{workspaceForClient:data=>data}
};
const m={exports:{}};
vm.runInNewContext(script,{module:m,exports:m.exports,require:id=>{
 if(!Object.hasOwn(modules,id))throw Error("Unexpected dependency "+id);
 return modules[id];
}});
const {mayReadAsset,resolveAssets}=m.exports;
function setup({role="client",clientId="tenant-a",modules=["planning","finance","contract"],workspacePresent=true,
  invoiceIds=["invoice-a"],publishedAssetIds=["asset-a"],released=true,assignedProjects=[]}={}){
 const calls=[];
 const db={from(table){
  calls.push(table);
  const filters=[];
  const q={select(){return q},eq(k,v){filters.push([k,v]);return q},in(k,v){filters.push([k,v]);return q},
   async maybeSingle(){
    if(table==="client_workspaces")return {data:workspacePresent?{data:{modules,contracts:[{documentId:"asset-a"}],folders:[]}}:null,error:null};
    if(table==="planning_projects")return {data:{id:"project-a",client_id:"tenant-a",data:{released,publishedAssetIds}},error:null};
    return {data:null,error:null};
   }};
  return q;
 }};
 const caller={rpc:async(name)=>{
  calls.push(name);
  return {data:{invoices:invoiceIds.map(id=>({id}))},error:null};
 }};
 return {calls,identity:{userId:"user-a",profile:{role,client_id:role==="client"?clientId:null},
  member:role==="client"?null:{active:true,role},assignedProjects,db,caller}};
}
const asset=(purpose,overrides={})=>({
 id:"asset-a",client_id:"tenant-a",project_id:"project-a",invoice_id:"invoice-a",
 owner_user_id:"owner-b",purpose,storage_path:"synthetic",original_name:"fixture.pdf",visible_to_client:true,...overrides
});

test("private invoice and planning files default-deny without a client workspace",async()=>{
 for(const purpose of ["invoice","receipt","planning","contract"]){
  const {identity,calls}=setup({workspacePresent:false});
  assert.equal(await mayReadAsset(identity,asset(purpose)),false,purpose);
  assert.equal(calls.includes("rotevo_client_finance"),false,"no finance RPC without entitlement");
 }
});
test("disabled modules and tenant mismatches cannot read private files",async()=>{
 for(const purpose of ["invoice","receipt","planning","contract"]){
  const {identity}=setup({modules:[]});
  assert.equal(await mayReadAsset(identity,asset(purpose)),false,purpose);
 }
 const {identity}=setup({clientId:"tenant-b"});
 for(const purpose of ["invoice","receipt","planning","contract"])
  assert.equal(await mayReadAsset(identity,asset(purpose)),false,purpose);
});
test("authorized finance reads require visible documents and matching invoice",async()=>{
 const a=setup({modules:["finance"]});
 assert.equal(await mayReadAsset(a.identity,asset("invoice")),true);
 assert.equal(await mayReadAsset(a.identity,asset("receipt")),true);
 assert.equal(await mayReadAsset(a.identity,asset("invoice",{visible_to_client:false})),false);
 assert.equal(await mayReadAsset(a.identity,asset("invoice",{invoice_id:"other-invoice"})),false);
 assert.equal(await mayReadAsset(a.identity,asset("invoice",{invoice_id:null})),false);
 assert.equal(await mayReadAsset(a.identity,asset("planning")),false);
 const b=setup({modules:["finance"],invoiceIds:[]});
 assert.equal(await mayReadAsset(b.identity,asset("invoice")),false);
});
test("planning assets require the selected tenant, released reference and enabled module",async()=>{
 const good=setup({modules:["planning"]});
 assert.equal(await mayReadAsset(good.identity,asset("planning")),true);
 const draft=setup({modules:["planning"],released:false});
 assert.equal(await mayReadAsset(draft.identity,asset("planning")),false);
 const other=setup({modules:["planning"],publishedAssetIds:["other-asset"]});
 assert.equal(await mayReadAsset(other.identity,asset("planning")),false);
 const blocked=setup({modules:["finance"]});
 assert.equal(await mayReadAsset(blocked.identity,asset("planning")),false);
});
test("contracts are shared only if referenced by an explicitly enabled client contract",async()=>{
 const good=setup({modules:["contract"]});
 assert.equal(await mayReadAsset(good.identity,asset("contract")),true);
 assert.equal(await mayReadAsset(good.identity,asset("contract",{id:"unreferenced"})),false);
 const bad=setup({modules:[]});
 assert.equal(await mayReadAsset(bad.identity,asset("contract")),false);
});
test("staff assets require proper finance role or project assignment; non-client roles do not inherit client access",async()=>{
 const producer=setup({role:"producer",assignedProjects:[]});
 assert.equal(await mayReadAsset(producer.identity,asset("planning")),false);
 assert.equal(await mayReadAsset(producer.identity,asset("invoice")),false);
 const assigned=setup({role:"staff",assignedProjects:["project-a"]});
 assert.equal(await mayReadAsset(assigned.identity,asset("planning")),true);
 assert.equal(await mayReadAsset(assigned.identity,asset("invoice")),false);
 const finance=setup({role:"finance"});
 assert.equal(await mayReadAsset(finance.identity,asset("invoice")),true);
 assert.equal(await mayReadAsset(finance.identity,asset("planning")),false);
});
