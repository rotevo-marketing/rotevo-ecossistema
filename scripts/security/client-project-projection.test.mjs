import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { projectForClient } from "../../src/lib/security/projectForClient.ts";

test("public projection strips every unknown internal root and item field", () => {
 const row={
   id:"p1",client_id:"tenant-a",title:"Project",slug:"project",
   description:null,status:"in_progress",updated_at:"2026-10-15T10:00:00Z",
   data:{
     internalNotes:"PRIVATE_CANARY_ROOT",
     unpublishedStrategy:{password:"PRIVATE_CANARY_NESTED"},
     executionTimeline:[
       {id:"x",title:"Public work",status:"planned",visibleToClient:true,owner:"RESPONSAVEL_COMPARTILHADO",ownerUserId:"PRIVATE_OWNER_ID",internalNotes:"PRIVATE_ITEM"},
       {id:"y",title:"Private work",visibleToClient:false}
     ],
     editorialCalendar:[
       {id:"c",title:"Public content",status:"awaiting_client",visibleToClient:true,caption:"Approved caption",reviewNotes:"PRIVATE_REVIEW"},
       {id:"h",title:"Hidden content",status:"review",visibleToClient:false}
     ],
     onboardingChecklist:[{id:"o",title:"Shared item",done:true,visibleToClient:true,privateLink:"PRIVATE_LINK"}],
   }
 };
 const p=projectForClient(row);
 const payload=JSON.stringify(p);
 for(const secret of ["PRIVATE_CANARY_ROOT","PRIVATE_CANARY_NESTED","PRIVATE_OWNER_ID","PRIVATE_ITEM","PRIVATE_REVIEW","PRIVATE_LINK","Private work","Hidden content"])
   assert.equal(payload.includes(secret),false,secret);
 assert.equal(p.data.executionTimeline.length,1);
 assert.equal(p.data.executionTimeline[0].owner,"RESPONSAVEL_COMPARTILHADO");
 assert.equal("ownerUserId" in p.data.executionTimeline[0],false);
 assert.equal(p.data.editorialCalendar.length,1);
 assert.equal(p.data.onboardingChecklist[0].done,true);
 assert.equal("client_id" in p,false);
});
test("default-deny: items without explicit visibleToClient true never appear", () => {
 const p=projectForClient({
   id:"p2",client_id:"a",title:"T",slug:"s",description:null,status:"draft",updated_at:"",
   data:{editorialCalendar:[{id:"a",title:"not flagged"}],executionTimeline:[{id:"b",title:"not flagged"}],
   onboardingChecklist:[{id:"c",title:"not flagged"}],unknownKey:"DO_NOT_SEND"}
 });
 assert.equal(p.data.editorialCalendar.length,0);
 assert.equal(p.data.executionTimeline.length,0);
 assert.equal(p.data.onboardingChecklist.length,0);
 assert.equal(JSON.stringify(p).includes("DO_NOT_SEND"),false);
});

test("client portal must use the authorized projection endpoint, not raw project data", () => {
 const source=readFileSync(new URL("../../src/app/cliente/page.tsx",import.meta.url),"utf8");
 assert.match(source,/fetch\("\/api\/client\/projects"/);
 assert.doesNotMatch(source,/from\("planning_projects"\)/);
});

test("client editorial calendar independently requires explicit sharing",()=>{
 const source=readFileSync(new URL("../../src/Components/cliente/EditorialCalendar.tsx",import.meta.url),"utf8");
 assert.match(source,/!clientView\|\|i\.visibleToClient===true/);
 assert.doesNotMatch(source,/!clientView\|\|i\.visibleToClient!==false/);
});

test("client execution timeline independently hides unshared tasks and separates project keys",()=>{
 const source=readFileSync(new URL("../../src/Components/cliente/ProjectTimeline.tsx",import.meta.url),"utf8");
 assert.match(source,/\.filter\(i=>isRow\(i\)&&i\.visibleToClient===true/);
 assert.doesNotMatch(source,/item\.visibleToClient===false/);
 assert.match(source,/projectKey:p\.id/);
 assert.match(source,/key=\{item\.projectKey\+":"\+item\.id\}/);
 assert.doesNotMatch(source,/new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
});

test("shared editorial brief reaches client without private fields or unsafe links",()=>{
 const p=projectForClient({
  id:"p3",client_id:"tenant-a",title:"Project",slug:"p3",description:null,status:"in_progress",updated_at:"",
  data:{editorialCalendar:[
   {id:"shared",title:"Content",status:"idea_pending",visibleToClient:true,ideaSummary:"Ideia aprovada para consulta",objective:"Educar",audience:"Público informado",funnelStage:"Atração",keyMessage:"Mensagem",cta:"Saiba mais",briefUrl:"https://drive.google.com/file",references:[{url:"https://example.com/reference",note:"Aprovada"},{url:"javascript:alert(1)",note:"INTERNAL_BAD_LINK"}],reviewNotes:"PRIVATE_REVIEW_NOTES",internalStrategy:"PRIVATE_STRATEGY"},
   {id:"hidden",title:"Private",visibleToClient:false,objective:"PRIVATE_OBJECTIVE"}
  ]}
 });
 const row=p.data.editorialCalendar[0];
 assert.equal(p.data.editorialCalendar.length,1);
 assert.equal(row.objective,"Educar");
 assert.equal(row.ideaSummary,"Ideia aprovada para consulta");
 assert.equal(row.briefUrl,"https://drive.google.com/file");
 assert.deepEqual(row.references,[{url:"https://example.com/reference",note:"Aprovada"}]);
 const payload=JSON.stringify(p);
 for(const value of ["PRIVATE_REVIEW_NOTES","PRIVATE_STRATEGY","PRIVATE_OBJECTIVE","INTERNAL_BAD_LINK","javascript:"])
  assert.equal(payload.includes(value),false,value);
});

test("meeting projection hides private notes and explicitly restricted minutes",()=>{
 const row={
  id:"project-meetings",client_id:"tenant-a",title:"Project",slug:"project-meetings",description:null,status:"in_progress",updated_at:"",
  data:{operationalAgenda:[
   {id:"shared",title:"Reunião compartilhada",kind:"meeting",date:"2026-11-09",status:"completed",visibleToClient:true,notes:"Pauta compartilhada",minutes:"ATA_RESTRITA",minutesVisibleToClient:false,internalNotes:"SEGREDO_INTERNO",actionItems:[{id:"restricted-action",title:"Encaminhamento interno",owner:"Equipe",dueDate:"",privateNote:"PRIVATE_ACTION"}],meetingUrl:"https://meet.google.com/example"},
   {id:"shared-allowed",title:"Reunião aprovada",kind:"meeting",date:"2026-11-08",status:"completed",visibleToClient:true,notes:"Pauta",minutes:"ATA_APROVADA",minutesVisibleToClient:true,internalNotes:"SEGREDO_INTERNO_2",actionItems:[{id:"action-1",title:"Entregar resumo",owner:"Equipe",dueDate:"2026-11-20",privateNote:"NAO_PUBLICAR_ACAO"}]},
   {id:"legacy",title:"Ata antiga",kind:"meeting",date:"2026-11-07",status:"completed",visibleToClient:true,minutes:"ATA_LEGADA"},
   {id:"private",title:"Reunião interna",visibleToClient:false,minutes:"ATA_PRIVADA"}
  ]}
 };
 const projection=projectForClient(row);
 assert.equal(projection.data.operationalAgenda.length,3);
 assert.equal(projection.data.operationalAgenda[0].minutes,undefined);
 assert.equal(projection.data.operationalAgenda[0].notes,"Pauta compartilhada");
 assert.equal(projection.data.operationalAgenda[1].minutes,"ATA_APROVADA");
 assert.equal(projection.data.operationalAgenda[2].minutes,"ATA_LEGADA");
 assert.equal(projection.data.operationalAgenda[1].actionItems[0].title,"Entregar resumo");
 assert.equal(projection.data.operationalAgenda[0].actionItems,undefined);
 const exposed=JSON.stringify(projection);
 for(const needle of ["SEGREDO_INTERNO","SEGREDO_INTERNO_2","ATA_RESTRITA","ATA_PRIVADA","PRIVATE_ACTION","NAO_PUBLICAR_ACAO","restricted-action","Reunião interna"])assert.equal(exposed.includes(needle),false,needle);
});


test("client project endpoint rejects sessions requiring password reset before privileged reads",()=>{
 const route=readFileSync(new URL("../../src/app/api/client/projects/route.ts",import.meta.url),"utf8");
 const guard=route.indexOf("rotevo_password_reset_required");
 const projectRead=route.indexOf('.from("planning_projects")');
 assert.ok(guard>=0&&guard<projectRead,"password-reset guard precedes tenant project query");
 assert.match(route,/identity\.user\.app_metadata\?\.rotevo_password_reset_required===true/);
 assert.match(route,/if \(!profile \|\| profile\.role!=="client" \|\| !profile\.client_id\) return fail\(403\)/);
 assert.match(route,/\.eq\("client_id",profile\.client_id\)/);
 assert.match(route,/projectForClient\(p,modules\)/);
});


test("privileged project and team directory reads reject password-reset-required sessions",()=>{
 for(const path of ["app/api/admin/projects/route.ts","app/api/team/directory/route.ts"]){
  const src=readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");
  const reset=src.indexOf("rotevo_password_reset_required");
  const profile=src.indexOf('.from("profiles")');
  assert.ok(reset>0&&profile>reset,path+" must deny before profile and data queries");
  assert.match(src,/return fail\(403\)/);
 }
});


test("privileged team mutations deny reset-required sessions before access or change",()=>{
 const routes=[
  "app/api/team/assignments/route.ts",
  "app/api/team/permissions/route.ts",
  "app/api/team/members/status/route.ts",
  "app/api/team/admin/transfer/route.ts"
 ];
 for(const path of routes){
  const src=readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");
  const authenticate=src.indexOf("auth.getUser(");
  const guard=src.indexOf("identity.user.app_metadata?.rotevo_password_reset_required===true");
  const readProfile=src.indexOf('.from("profiles")');
  const mutation=src.indexOf('admin.rpc(');
  assert.ok(authenticate>=0&&guard>authenticate&&readProfile>guard,path+" must reject after authentication and before querying privileged resources");
  if(mutation>=0)assert.ok(mutation>guard,path+" must reject before RPC mutation");
  assert.match(src.slice(guard,readProfile),/return fail\(403/);
 }
});


test("client shared modules do not expose resources excluded from the authorized workspace",()=>{
 const project={
  id:"isolated-p",client_id:"client-a",title:"Project",slug:"isolated",description:null,status:"in_progress",updated_at:"",
  data:{portalModules:["planning","execution","content","meetings","campaigns"],
   deliverySchedule:{research:"2026-11-19"},
   executionTimeline:[{id:"task",title:"Shared task",visibleToClient:true}],
   editorialCalendar:[{id:"article",title:"Shared draft",visibleToClient:true}],
   operationalAgenda:[{id:"meeting",title:"Shared meeting",visibleToClient:true,minutes:"SHARED_MINUTES"}],
   marketingCampaigns:[{id:"campaign",title:"Shared campaign",visibleToClient:true}],
   onboardingChecklist:[{id:"onboarding",title:"Shared onboarding",visibleToClient:true}]
  }
 };
 const visible=projectForClient(project,["content"]);
 assert.deepEqual(visible.data.portalModules,["content"]);
 assert.equal(visible.data.editorialCalendar.length,1);
 assert.equal(visible.data.executionTimeline.length,0);
 assert.equal(visible.data.operationalAgenda.length,0);
 assert.equal(visible.data.marketingCampaigns.length,0);
 assert.deepEqual(visible.data.deliverySchedule,{});
 assert.equal(JSON.stringify(visible).includes("SHARED_MINUTES"),false);
 const none=projectForClient(project,[]);
 assert.deepEqual(none.data.portalModules,[]);
 assert.equal(none.data.editorialCalendar.length,0);
 assert.equal(none.data.executionTimeline.length,0);
 assert.equal(none.data.operationalAgenda.length,0);
 assert.equal(none.data.marketingCampaigns.length,0);
});

test("client private asset resolver fails closed when workspace or module authorization is absent",()=>{
 const src=readFileSync(new URL("../../src/lib/operations/assets.ts",import.meta.url),"utf8");
 assert.match(src,/if\(asset\.purpose==="contract"\)return !!allowed\?\.modules\.includes\("contract"\)/);
 assert.match(src,/if\(!allowed\?\.modules\.includes\("finance"\)\|\|!asset\.visible_to_client\|\|!asset\.invoice_id\)return false/);
 assert.match(src,/if\(!asset\.project_id\|\|!allowed\?\.modules\.includes\("planning"\)\)return false/);
 assert.match(src,/value\.profile\.client_id!==asset\.client_id/);
 assert.match(src,/value\.caller\.rpc\("rotevo_client_finance"\)/);
 assert.match(src,/assetReferences\(published\.data\)\.includes\(asset\.id\)/);
});


test("missing workspace denies project, finance and workspace portal modules instead of enabling every service",()=>{
 for(const path of ["app/api/client/projects/route.ts","app/api/client/workspace/route.ts","app/api/client/finance/route.ts"]){
  const src=readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");
  assert.doesNotMatch(src,/workspaceForClient\([^)]*emptyWorkspace\(\)/,path);
  assert.doesNotMatch(src,/emptyWorkspace\(\)/,path);
  assert.match(src,/workspaceForClient\((?:workspace|r)\.data\?\.data\)/,path);
 }
 const model=readFileSync(new URL("../../src/lib/operations/model.ts",import.meta.url),"utf8");
 assert.match(model,/if\(!validWorkspace\(value\)\)return \{contracts:\[\],folders:\[\],modules:\[\]\}/);
});


test("strategist project endpoints enforce first-password change before privileged access",()=>{
 const routes=[
  "app/api/admin/project/route.ts",
  "app/api/admin/project/update/route.ts",
  "app/api/admin/project/status/route.ts",
  "app/api/admin/project/delete/route.ts",
  "app/api/admin/projects/route.ts"
 ];
 for(const path of routes){
  const src=readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");
  const jwt=src.indexOf("auth.getUser(");
  const reset=src.indexOf("identity.user.app_metadata?.rotevo_password_reset_required===true");
  const service=src.indexOf("createClient(url,secret");
  const profile=src.indexOf('.from("profiles")');
  assert.ok(jwt>=0&&reset>jwt&&service>reset&&profile>service,path+" must deny reset-required sessions before service access");
  assert.match(src.slice(reset,service),/return fail\(403\)/);
 }
});
