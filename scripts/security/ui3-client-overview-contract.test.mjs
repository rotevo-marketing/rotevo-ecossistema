import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../../src/Components/cliente/ClientOverview.tsx",import.meta.url),"utf8");

test("client overview has one focused section per category with approved limits",()=>{
 for (const title of ["Para hoje","Atrasadas","Aprovações","Agenda"]) {
   assert.ok(source.includes(title),`Missing dashboard section: ${title}`);
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
 assert.match(source,/marketingCampaigns\?\?\[\]\)\.filter\(i=>i\.visibleToClient===true\)/);
});
test("client dashboard retains module gates and date-based overdue semantics",()=>{
 assert.match(source,/const tasks=allowed\("execution"\)\?projects\.flatMap/);
 assert.match(source,/allowed\("execution"\)\?dueToday\.length:"—"/);
 assert.match(source,/allowed\("execution"\)\?overdue\.length:"—"/);
 assert.match(source,/Tarefas não compartilhadas com esta conta/);
 assert.doesNotMatch(source,/allowed\("execution"\)&&<section/);
 assert.doesNotMatch(source,/allowed\("content"\)&&<section/);
 assert.doesNotMatch(source,/allowed\("meetings"\)&&<section/);
 assert.match(source,/!allowed\("content"\)\?<p/);
 assert.match(source,/!allowed\("meetings"\)\?<p/);
 assert.match(source,/t\.dueDate<today/);
 assert.match(source,/t\.dueDate===today/);
 assert.match(source,/onNavigate\("content",item\.projectId,item\.contentId\)/);
});

test("both overviews have exactly four colored sections with counters inside, no duplicate top KPI row",()=>{
 const admin=readFileSync(new URL("../../src/Components/admin/AdminOperationsOverview.tsx",import.meta.url),"utf8");
 for(const text of [source,admin]){
  assert.equal((text.match(/className="rv-ui3-section-count"/g)??[]).length,4,"Four inline counters required");
  assert.equal((text.match(/className=\{(?:card|dashboardCard)\+" border-\[#/g)??[]).length,4,"Four lightly tinted sections required");
  assert.doesNotMatch(text,/rv-ui3-overview-summary/,"Do not reintroduce duplicate top KPI summary");
 }
 assert.match(admin,/aria-labelledby="daily-finance"/);
 assert.match(admin,/aria-labelledby="daily-projects"/);
});

test("client and strategist navigation share a straight active accent rail",()=>{
 const css=readFileSync(new URL("../../src/app/rotevo-ui3.css",import.meta.url),"utf8");
 const clientStart=css.indexOf("/* UI3 | Client menu mirrors the approved strategist selection rail.");
 const clientEnd=css.indexOf("/* UI3 appearance pilot",clientStart);
 assert.ok(clientStart>=0&&clientEnd>clientStart);
 const client=css.slice(clientStart,clientEnd);
 assert.match(client,/\.client-portal-v2\.rv-ui2\.rv-ui3 \.rv-ui2-sidebar \.rv-ui2-nav-item\[aria-current="page"\]::before/);
 assert.match(client,/width:2px/);
 assert.match(client,/border-radius:0/);
 assert.match(client,/background-image:none/);
 assert.doesNotMatch(client,/content:none!important/);
 assert.match(css,/\.admin-v2\.rv-ui2\.rv-ui3 \.rv-ui2-sidebar \.rv-ui2-nav-item\[aria-current="page"\]::before/);
});
