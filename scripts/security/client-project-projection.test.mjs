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
 assert.match(source,/item\.visibleToClient!==true/);
 assert.doesNotMatch(source,/item\.visibleToClient===false/);
 assert.match(source,/projectKey:project\.id/);
 assert.match(source,/key=\{\`\$\{item\.projectKey\}:\$\{item\.id\}\`\}/);
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
