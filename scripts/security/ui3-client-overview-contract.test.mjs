import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../../src/Components/cliente/ClientOverview.tsx",import.meta.url),"utf8");

test("client overview has one focused section per category with approved limits",()=>{
 for (const title of ["Para hoje","Atrasadas","Aprovações","Agenda"]) {
   assert.match(source,new RegExp('>'+title+'(?:\\s|<)'));
 }
 assert.match(source,/dueToday\.slice\(0,5\)/);
 assert.match(source,/overdue\]\.sort\([\s\S]*?\.slice\(0,5\)/);
 assert.match(source,/focusApprovals\.slice\(0,5\)/);
 assert.match(source,/nextMeetings\.slice\(0,3\)/);
 assert.doesNotMatch(source,/ClientEditorialMiniCalendar/);
});
test("dashboard never invents client ownership or approver designation",()=>{
 assert.match(source,/filter\(t=>t\.visibleToClient===true&&!t\.archivedAt&&!t\.deletedAt\)/);
 assert.match(source,/filter\(i=>i\.visibleToClient===true&&!i\.archivedAt&&!i\.deletedAt\)/);
 assert.match(source,/pendingIdeas=publishedContent\.filter\(i=>i\.status==="idea_pending"/);
 assert.doesNotMatch(source,/pendingIdeas=publishedContent\.filter\(i=>i\.status==="idea"/);
 assert.match(source,/approvalsFailed/);
 assert.match(source,/approvalsLoading/);
});
test("client dashboard retains module gates and date-based overdue semantics",()=>{
 assert.match(source,/allowed\("execution"\)&&<section/);
 assert.match(source,/allowed\("content"\)&&<section/);
 assert.match(source,/allowed\("meetings"\)&&<section/);
 assert.match(source,/t\.dueDate<today/);
 assert.match(source,/t\.dueDate===today/);
 assert.match(source,/onNavigate\("content",item\.projectId,item\.contentId\)/);
});
