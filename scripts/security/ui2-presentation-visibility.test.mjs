import test from "node:test";
import assert from "node:assert/strict";
import {projectForPresentation} from "../../src/lib/security/projectForPresentation.ts";
import {planningAreas} from "../../src/lib/planning/areaSchedule.ts";

const area02=planningAreas.find(name=>name.startsWith("02 "));
assert.ok(area02,"The 2027 catalog must include area 02");

const row=(status,enabled=false)=>({
 id:"p-visibility",client_id:"tenant-visibility",slug:"sample-project",
 title:"Sample project",description:null,status,clients:{name:"Sample client"},
 data:{
  planningClientAccessEnabled:enabled,
  internalNotes:"NEVER_EXPOSE_INTERNAL_NOTES",
  planningAreaSchedule:[{area:area02,dueDate:"2026-12-15",status:"in_progress",visibleToClient:false}],
  ecosystem2027:{
   version:1,
   selectedDocumentCodes:["01.02","02.01","01.03"],
   presentedDocumentCodes:["01.02","02.01","01.03"],
   documents:{
    "01.02":{content:"UNPUBLISHED_DRAFT_0102",publishedContent:"APPROVED_0102",publishedAt:"2026-11-09T12:00:00Z"},
    "02.01":{content:"HIDDEN_AREA_DRAFT",publishedContent:"HIDDEN_AREA_RELEASE",publishedAt:"2026-11-09T12:00:00Z"},
    "01.03":{content:"NOT_YET_RELEASED",publishedContent:"MISSING_TIMESTAMP"}
   },
   privateNotes:"NEVER_EXPOSE_ECOSYSTEM_NOTES",
  }
 }
});

test("client presentation includes only released snapshots in client-visible areas",()=>{
 const result=projectForPresentation(row("published"),false);
 assert.ok(result);
 const data=result.data.ecosystem2027;
 assert.deepEqual(data.selectedDocumentCodes,["01.02","01.03"]);
 assert.deepEqual(data.presentedDocumentCodes,["01.02","01.03"]);
 assert.equal(data.documents["01.02"]?.content,"APPROVED_0102");
 assert.equal(data.documents["01.03"],undefined,"no publishedAt means no release");
 assert.equal(data.documents["02.01"],undefined,"hidden area is not released");
 assert.equal(result.data.planningAreaSchedule.length,0,"hidden area schedule is not shared");
 for(const secret of ["UNPUBLISHED_DRAFT_0102","HIDDEN_AREA_DRAFT","HIDDEN_AREA_RELEASE","NOT_YET_RELEASED","MISSING_TIMESTAMP","NEVER_EXPOSE_INTERNAL_NOTES","NEVER_EXPOSE_ECOSYSTEM_NOTES"]){
  assert.equal(JSON.stringify(result).includes(secret),false,secret);
 }
});

test("draft client presentation is denied without explicit progressive sharing",()=>{
 const result=projectForPresentation(row("draft"),false);
 assert.ok(result);
 assert.deepEqual(result.data.ecosystem2027.selectedDocumentCodes,[]);
 assert.deepEqual(result.data.ecosystem2027.presentedDocumentCodes,[]);
 assert.deepEqual(result.data.ecosystem2027.documents,{});
});

test("explicit draft progressive sharing still requires individually published versions",()=>{
 const result=projectForPresentation(row("draft",true),false);
 assert.ok(result);
 assert.equal(result.data.ecosystem2027.documents["01.02"]?.content,"APPROVED_0102");
 assert.equal(result.data.ecosystem2027.documents["01.03"],undefined);
 assert.equal(result.data.ecosystem2027.documents["02.01"],undefined);
});

test("client projection never returns raw strategist project data",()=>{
 const original=row("published");
 assert.strictEqual(projectForPresentation(original,true),original,"strategist receives authorized project");
 const client=projectForPresentation(original,false);
 assert.notStrictEqual(client,original);
 assert.equal("internalNotes" in client.data,false);
});
