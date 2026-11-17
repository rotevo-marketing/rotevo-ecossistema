const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {createRequire}=require("node:module");
const root=path.resolve(__dirname,"../.."),dependencyRoot=process.env.ROTEVO_TEST_DEPENDENCY_ROOT||root,dependencyRequire=createRequire(path.join(dependencyRoot,"package.json")),ts=dependencyRequire("typescript");
const fallback=process.env.ROTEVO_TEST_SOURCE_FALLBACK,cache=new Map();
function load(name,from=root,mocks={}){
 if(Object.hasOwn(mocks,name))return mocks[name];
 if(!name.startsWith(".")&&!name.startsWith("/")&&!name.startsWith("@/")&&!/^[A-Z]:/i.test(name))return dependencyRequire(name);
 let full=name.startsWith("@/")?path.join(root,"src",name.slice(2)):path.resolve(from,name);
 if(!fs.existsSync(full)){for(const ext of [".ts",".tsx"]){if(fs.existsSync(full+ext)){full+=ext;break;}}}
 if(!fs.existsSync(full)&&fallback){const alt=full.replace(root,path.resolve(fallback));if(fs.existsSync(alt))full=alt;}
 if(cache.has(full))return cache.get(full).exports;
 const mod={exports:{}};cache.set(full,mod);
 const code=ts.transpileModule(fs.readFileSync(full,"utf8"),{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInThisContext("(function(require,module,exports){"+code+"\n})",{filename:full})(id=>load(id,path.dirname(full),mocks),mod,mod.exports);
 return mod.exports;
}
const model=load("./src/lib/planning/companyAnalysis.ts"),{EMPTY_COMPANY_ANALYSIS:legacy,EMPTY_COMPANY_ANALYSIS_V2:empty,companyAnalysisForEditing:adapt,companyAnalysisPublicationErrors:errors,parseCompanyAnalysis:parse,validCompanyAnalysis:valid,publicCompanyAnalysis:publish}=model;
const fixture=()=>({...structuredClone(empty),identity:{...empty.identity,displayName:"Empresa sintética",description:'<p>Descrição <strong>negrito</strong>, <em>itálico</em>, <u>sublinhado</u>.</p><ul><li>Item</li></ul><ol><li>Ordem</li></ol><p><a href="https://example.test/">Referência</a></p>'}});
test("partial draft is valid but publication requires a name and meaningful description",()=>{
 assert.ok(valid(empty));assert.equal(errors(empty).length,2);assert.equal(publish(empty),null);
 const v=fixture();v.identity.description="<p><br></p><p>&nbsp;</p>";assert.equal(errors(v).length,1);
 assert.deepEqual(errors(fixture()),[]);assert.equal(valid({...fixture(),formatVersion:3}),false);
});
test("JSON persistence retains rich text, arbitrary periods, list order and more than three findings",()=>{
 const v=fixture();v.history.milestones=[{id:"last",period:"2023–maio/2026",title:"Segundo",description:"<p><u>Dois</u></p>"},{id:"first",period:"2023",title:"Primeiro",description:"<p><em>Um</em></p>"}];
 v.synthesis.findings=Array.from({length:5},(_,i)=>({id:"f"+i,title:"Constatação "+i,description:"<p>Descrição</p>"}));
 assert.deepEqual(parse(JSON.parse(JSON.stringify(v))),v);
 const pub=publish(v);assert.equal(pub.synthesis.findings.length,5);assert.deepEqual(pub.history.milestones.map(n=>n.id),["last","first"]);assert.equal(pub.history.milestones[0].period,"2023–maio/2026");
 for(const tag of ["strong","em","u","ul","ol","li","a"])assert.match(pub.identity.description,new RegExp("<"+tag+"[ >]"));
 assert.match(pub.identity.description,/href="https:\/\/example.test\/"/);
 assert.equal(valid({...v,history:{milestones:[v.history.milestones[0],v.history.milestones[0]]}}),false);
});
test("published rich text removes executable markup and unsafe links",()=>{
 const {safeCompanyRichText:safe}=load("./src/lib/planning/companyAnalysisText.ts");
 const dirty='<p onclick="alert(1)">Texto <strong>válido</strong><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)" target="_blank">inseguro</a><a href="https://example.test/" target="_blank">seguro</a></p>';
 const cleaned=safe(dirty);assert.doesNotMatch(cleaned,/onclick|onerror|script|iframe|<img|javascript:|target=/i);assert.match(cleaned,/<strong>válido<\/strong>/);assert.match(cleaned,/href="https:\/\/example.test\/"/);
 const v=fixture();v.identity.description=dirty;assert.equal(publish(v).identity.description,cleaned);assert.equal(safe(cleaned),cleaned);
});
test("legacy data is preserved completely, with its internal archive excluded from a new public snapshot",()=>{
 const old=structuredClone(legacy);old.identity.displayName="Anterior";old.identity.mainActivity="Atividade";old.identity.sector="Setor preservado";old.identity.traits=[{id:"e",title:"Conhecimento",description:"Declaração",evidence:"INTERNAL_EVIDENCE"}];old.organization.entries=[{id:"d",title:"Departamento declarado",description:"Histórico",parentId:"",kind:"department"}];
 const original=structuredClone(old),v=adapt(old);assert.deepEqual(old,original);assert.deepEqual(v.legacySnapshot,original);assert.deepEqual(v.organization.workstreams,[]);assert.equal(v.synthesis.implication,"");assert.ok(valid(v));assert.deepEqual(parse(JSON.parse(JSON.stringify(v))).legacySnapshot,original);
 assert.doesNotMatch(JSON.stringify(publish(v)),/INTERNAL_EVIDENCE|Departamento declarado|Setor preservado/);assert.equal(publish(old).identity.sector,"Setor preservado");
});
const projectId="a1111111-1111-4111-8111-111111111111",stamp="2026-11-17T20:00:00.000Z";
function api({role="strategist",assigned=true,permission=true,active=true,authenticated=true,reset=false,oldData={},expected=stamp,conflict=false}={}){
 let written=null;const calls=[];
 const q=table=>{let filters=[],update;const query={select(){return query},eq(k,v){filters.push([k,v]);return query},in(){return query},update(v){update=v;return query},async maybeSingle(){calls.push({table,filters});if(table==="profiles")return {data:{role},error:null};if(table==="team_members")return {data:{role:"producer",active},error:null};if(table==="team_project_assignments")return {data:assigned?{project_id:projectId}:null,error:null};if(table==="team_member_permissions")return {data:permission?{permission:"projects.write"}:null,error:null};if(table==="planning_projects"){if(update){if(conflict)return {data:null,error:null};written=structuredClone(update.data);return {data:{id:projectId,data:written,updated_at:update.updated_at},error:null};}return {data:{data:oldData,updated_at:stamp},error:null};}return {data:null,error:null};}};return query;};
 const mod={exports:{}},source=fs.readFileSync(path.join(root,"src/app/api/admin/project/update/route.ts"),"utf8"),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mocks={"next/server":{NextResponse:{json:(body,{status=200,headers={}}={})=>({status,body,headers})}},"@supabase/supabase-js":{createClient:(_url,key)=>key==="anon"?{auth:{getUser:async()=>({data:{user:authenticated?{id:"staff-a",app_metadata:{rotevo_password_reset_required:reset}}:null},error:null})}}:{from:q}},
 "@/lib/planning/companyAnalysis":model,
 "@/lib/planning/stages":{validPlanningStages:()=>true},"@/lib/planning/areaSchedule":{validPlanningAreaSchedule:()=>true},"@/lib/security/ecosystemDocumentTransitions":{validEcosystemDocumentTransition:()=>true},"@/lib/security/executionDependencyValidation":{validExecutionDependencies:()=>true},"@/lib/security/meetingAgendaValidation":{validMeetingAgenda:()=>true,recordMeetingMinutes:()=>{}},"@/lib/security/campaignMetricsValidation":{validCampaignLinks:()=>true,validCampaignRecords:()=>true},"@/data/ecosystem2027":{ecosystemDocuments:[]}};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{if(!mocks[name])throw Error("Unexpected import "+name);return mocks[name]},process:{env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"synthetic",ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED:"true"}},Date,URL,Map,Set,JSON});
 return {async patch(data){return mod.exports.PATCH({headers:{get:()=>"Bearer synthetic"},json:async()=>({projectId,expectedUpdatedAt:expected,data})});},calls,get written(){return written}};
}
test("authorized draft save leaves the independently published snapshot unchanged",async()=>{
 const old=fixture(),snapshot=publish(old),v=fixture();v.identity.displayName="DRAFT_ONLY";const oldData={companyAnalysis0201:old,publishedCompanyAnalysis0201:snapshot};
 const h=api({oldData}),response=await h.patch({...oldData,companyAnalysis0201:v});
 assert.equal(response.status,200);assert.equal(response.headers["Cache-Control"],"no-store");assert.deepEqual(h.written.publishedCompanyAnalysis0201,snapshot);assert.equal(h.written.companyAnalysis0201.identity.displayName,"DRAFT_ONLY");
 const second=api({oldData:h.written});const next=await second.patch({...h.written,publishedCompanyAnalysis0201:publish(v)});assert.equal(next.status,200);assert.equal(second.written.publishedCompanyAnalysis0201.identity.displayName,"DRAFT_ONLY");
});
test("forged or incomplete publications are rejected before any write",async()=>{
 const v=fixture();for(const data of [{companyAnalysis0201:empty,publishedCompanyAnalysis0201:publish(v)},{companyAnalysis0201:v,publishedCompanyAnalysis0201:{...publish(v),internalNotes:"PRIVATE"}}]){const h=api();assert.equal((await h.patch(data)).status,400);assert.equal(h.written,null);}
});
test("existing G2 authorization denies client, inactive, unassigned and unprivileged identities",async()=>{
 for(const options of [{role:"client"},{active:false},{assigned:false},{permission:false},{reset:true},{authenticated:false}]){const h=api(options);const r=await h.patch({companyAnalysis0201:fixture()});assert.equal(r.status,options.authenticated===false?401:403);assert.equal(h.written,null);assert.equal(h.calls.some(c=>c.table==="planning_projects"),false);}
});
test("stale writes and a concurrent update fail without overwriting the newer server version",async()=>{
 for(const options of [{expected:"2026-11-17T19:00:00Z"},{conflict:true}]){const h=api(options);assert.equal((await h.patch({companyAnalysis0201:fixture()})).status,409);assert.equal(h.written,null);}
});
module.exports={load,fixture};

test("customer presentation returns only the approved snapshot and isolates tenants",async()=>{
 const projection=load("./src/lib/security/projectForPresentation.ts",root,{
  "../planning/richContent.ts":{validRichContent:()=>false},
  "../planning/areaSchedule.ts":{normalizedPlanningAreaSchedule:()=>[]},
  "../../data/ecosystem2027.ts":{ecosystemDocuments:[]}
 }).projectForActivePresentation;
 const saved=fixture(),pub=publish(saved);saved.identity.displayName="PRIVATE_DRAFT";
 const row={id:projectId,client_id:"tenant-a",title:"Synthetic",slug:"synthetic",description:null,status:"published",clients:null,data:{planningStructureVersion:5,portalModules:["planning"],companyAnalysis0201:saved,publishedCompanyAnalysis0201:pub,internalNotes:"PRIVATE_NOTES"}};
 async function get({clientId="tenant-a",status="published",modules=["planning"],snapshot=pub}={}){
  const mod={exports:{}},source=fs.readFileSync(path.join(root,"src/app/api/presentation/project/route.ts"),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const q=table=>{const query={select(){return query},eq(){return query},async maybeSingle(){if(table==="profiles")return {data:{role:"client",client_id:clientId},error:null};if(table==="planning_projects")return {data:{...row,status,data:{...row.data,publishedCompanyAnalysis0201:snapshot}},error:null};if(table==="client_workspaces")return {data:{data:{modules}},error:null};throw Error("Unexpected table "+table);}};return query;};
  const mocks={"next/server":{NextResponse:{json:(body,{status=200}={})=>({status,body})}},"@supabase/supabase-js":{createClient:(_url,key)=>key==="anon"?{auth:{getUser:async()=>({data:{user:{id:"client-a"}},error:null})}}:{from:q}},"@/lib/operations/model":{workspaceForClient:data=>data},"@/lib/security/projectForPresentation":{projectForActivePresentation:projection}};
  vm.runInNewContext(code,{module:mod,exports:mod.exports,require:id=>mocks[id],process:{env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"synthetic"}}});
  return mod.exports.GET({headers:{get:()=>"Bearer synthetic"},nextUrl:{searchParams:{get:()=>"synthetic"}}});
 }
 const yes=await get();assert.equal(yes.status,200);assert.equal(yes.body.project.data.companyAnalysis0201.identity.displayName,"Empresa sintética");assert.doesNotMatch(JSON.stringify(yes.body),/PRIVATE_DRAFT|PRIVATE_NOTES|legacySnapshot/);
 assert.equal((await get({clientId:"tenant-b"})).status,404);assert.equal((await get({status:"draft"})).status,404);assert.equal((await get({modules:["content"]})).status,404);
 const unavailable=await get({snapshot:undefined});assert.equal(unavailable.body.project.data.companyAnalysis0201.identity.displayName,"Empresa sintética");
 const hidden=await get({snapshot:null});assert.equal(hidden.body.project.data.companyAnalysis0201,null);
});
