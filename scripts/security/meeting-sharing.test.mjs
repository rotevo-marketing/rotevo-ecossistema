import test from "node:test";
import assert from "node:assert/strict";
import {projectForClient} from "../../src/lib/security/projectForClient.ts";
const project={id:"synthetic",client_id:"synthetic-client",title:"Synthetic",slug:"synthetic",description:null,status:"draft",updated_at:"2027-01-20",data:{}};
test("shared meeting independently protects agenda and minutes while sharing one event description",()=>{
 const meeting={id:"synthetic-meeting",title:"Synthetic meeting",visibleToClient:true,agendaVisibleToClient:false,minutesVisibleToClient:false,notes:"PRIVATE_AGENDA",minutes:"PRIVATE_MINUTES",internalNotes:"PRIVATE_TEAM_NOTES",minutesHistory:[{text:"PRIVATE_HISTORY"}],actionItems:[{id:"a",title:"PRIVATE_ACTION"}],googleOptions:{description:"Shared description",guests:["PRIVATE_GUEST@example.test"]}};
 const result=projectForClient({...project,data:{operationalAgenda:[meeting]}}).data.operationalAgenda[0];
 assert.equal(result.description,"Shared description");
 assert.equal(result.notes,undefined);assert.equal(result.minutes,undefined);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_/);
 const withAgenda=projectForClient({...project,data:{operationalAgenda:[{...meeting,agendaVisibleToClient:true}]}}).data.operationalAgenda[0];
 assert.equal(withAgenda.notes,"PRIVATE_AGENDA");assert.equal(withAgenda.minutes,undefined);
 const withMinutes=projectForClient({...project,data:{operationalAgenda:[{...meeting,minutesVisibleToClient:true}]}}).data.operationalAgenda[0];
 assert.equal(withMinutes.notes,undefined);assert.equal(withMinutes.minutes,"PRIVATE_MINUTES");
 assert.equal(withMinutes.actionItems.length,1);
});
test("legacy shared agenda remains available and private appointments expose neither field",()=>{
 const meeting={id:"legacy",title:"Legacy",visibleToClient:true,notes:"Historical agenda",minutes:"Historical minutes"};
 const result=projectForClient({...project,data:{operationalAgenda:[meeting]}}).data.operationalAgenda[0];
 assert.equal(result.notes,"Historical agenda");assert.equal(result.minutes,"Historical minutes");
 assert.equal(result.description,undefined);
 assert.deepEqual(projectForClient({...project,data:{operationalAgenda:[{...meeting,visibleToClient:false}]}}).data.operationalAgenda,[]);
});
