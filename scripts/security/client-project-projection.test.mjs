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
       {id:"x",title:"Public work",status:"planned",visibleToClient:true,owner:"PRIVATE_OWNER",internalNotes:"PRIVATE_ITEM"},
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
 for(const secret of ["PRIVATE_CANARY_ROOT","PRIVATE_CANARY_NESTED","PRIVATE_OWNER","PRIVATE_ITEM","PRIVATE_REVIEW","PRIVATE_LINK","Private work","Hidden content"])
   assert.equal(payload.includes(secret),false,secret);
 assert.equal(p.data.executionTimeline.length,1);
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
