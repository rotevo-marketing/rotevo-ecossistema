import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {editorialCandidates,matchesOverviewDeadline} from "../../src/lib/overview/model.ts";
import {taskPrerequisites} from "../../src/lib/operations/taskPrerequisites.ts";
const source=path=>readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");

test("both overviews render the existing task and agenda modules under their own scopes",()=>{
 const client=source("Components/cliente/ClientOverview.tsx");
 const admin=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(client,/allowed\("execution"\)&&<DailyClientTaskCenters/);
 assert.match(client,/contentAllowed&&<section/);
 assert.match(client,/allowed\("meetings"\)&&<section/);
 assert.match(client,/<ClientMeetings projects=\{projects\} day=\{today\}/);
 assert.match(admin,/<DailyTaskCenters approvals=/);
 assert.match(client,/<ApprovalTaskCenter/);
 assert.match(admin,/<AdminMeetingsHub[^\n]+day=\{today\}/);
 for(const view of [client,admin]){

  assert.doesNotMatch(view,/<table/);
 }
 for(const [file,component] of [["admin/CentralTarefas","TaskCenter"],["cliente/ProjectTimeline","TaskTimeline"]]){
  const central=source("Components/"+file+".tsx");
  assert.equal(central.match(/<table\b/g)?.length,1);
  assert.match(central,new RegExp("<"+component+"[^\\n]+deadline:\"today\""));
  assert.match(central,new RegExp("<"+component+"[^\\n]+deadline:\"overdue\""));
  assert.match(central,/matchesOverviewDeadline\(/);
 }
});

test("fixed day scopes exclude closed, archived, deleted and invalid tasks",()=>{
 const today="2026-11-23";
 const active={id:"valid",title:"Tarefa",dueDate:today};
 assert.equal(matchesOverviewDeadline(active,"today",today),true);
 assert.equal(matchesOverviewDeadline({...active,dueDate:"2026-11-22"},"overdue",today),true);
 for(const patch of [{deletedAt:today},{archivedAt:today},{status:"completed"},{status:"cancelled"},{dueDate:"2026-02-30"},{dueDate:"2026-11-24"}]){
  assert.equal(matchesOverviewDeadline({...active,...patch},"today",today),false);
  assert.equal(matchesOverviewDeadline({...active,...patch},"overdue",today),false);
 }
});

test("editorial approval candidates exclude tombstones but preserve the live request even if a title matches",()=>{
 const entry={id:"live",title:"DEMONSTRAÇÃO",visibleToClient:true,status:"idea_pending"};
 const record=(id,patch)=>({...entry,id,...patch});
 const project={id:"p1",status:"draft",data:{editorialCalendar:[
  entry,record("deleted",{deletedAt:"2026-11-23"}),record("archive",{archivedAt:"2026-11-23"}),
  record("draft",{status:"idea"}),record("private",{visibleToClient:false})
 ]}};
 assert.deepEqual(editorialCandidates([project,{...project,id:"p2",status:"archived"}]).map(x=>[x.project.id,x.item.id]),[["p1","live"]]);
});

test("prerequisites use one project's eligible records and reject direct and indirect cycles",()=>{
 const task=(id,extra={})=>({id,title:id,...extra});
 const own=[task("self"),task("valid",{status:"completed"}),task("trash",{deletedAt:"today"}),task("archive",{archivedAt:"today"}),task("cancel",{status:"cancelled"}),task("back",{dependencies:["self"]}),task("indirect",{dependencies:["back"]}),task("loop",{dependencies:["loop"]})];
 assert.deepEqual(taskPrerequisites(own,"self").map(x=>x.id),["valid"]);
 assert.equal(own.length,8);
 assert.match(source("Components/admin/CentralTarefas.tsx"),/setDraft\(\{\.\.\.blankDraft\(\),projectId:/);
 assert.match(source("Components/admin/CentralTarefas.tsx"),/checklist:\[\] as ExecutionChecklistItem\[\]/);
});
