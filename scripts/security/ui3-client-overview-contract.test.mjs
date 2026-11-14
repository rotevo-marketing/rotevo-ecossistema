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

test("task and editorial list columns use aligned compact widths and preserve separate dates",()=>{
 const task=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
 const editorial=readFileSync(new URL("../../src/Components/cliente/EditorialCalendar.tsx",import.meta.url),"utf8");
 const cells=readFileSync(new URL("../../src/Components/admin/TaskGridCells.tsx",import.meta.url),"utf8");
 for(const source of [task,editorial]){
  assert.match(source,/table-fixed min-w-\[1120px\]/,"Tables should allocate remaining space to the title");
  assert.match(source,/<colgroup>/);
  for(const pair of ["project","owner","status","priority","due"]){
   assert.ok(source.includes("visibleColumns."+pair+"&&<col style={{width:"),"Missing aligned column "+pair);
  }
  assert.ok(source.includes("width:130"),"Status column is compact");
  assert.ok(source.includes("width:114"),"Priority column is compact");
  assert.equal((source.match(/width:138/g)??[]).length,2,"Both date columns must have the same width");
  assert.match(source,/key==="project"\|\|key==="owner"\?<span className="sr-only">\{name\}<\/span>/,"Photo column headings should remain accessible");
 }
 assert.match(task,/visibleColumns\.launch&&<col style=\{\{width:138\}\}\/>/);
 assert.match(editorial,/visibleColumns\.publish&&<col style=\{\{width:138\}\}\/>/);
 assert.match(cells,/day:"2-digit",month:"2-digit",year:"numeric"/,"Task delivery dates should match publication date presentation");
 assert.ok(task.includes('["Prazo","calendar-week","due"]'));
 assert.ok(editorial.includes('["Conclusão","calendar-week","due"]'));
});

test("campaign creation and editing use the approved centered modal without replacing its fields",()=>{
 const campaigns=readFileSync(new URL("../../src/Components/admin/CampaignsHub.tsx",import.meta.url),"utf8");
 const start=campaigns.indexOf('{editing&&<div className="fixed inset-0 z-[120]');
 assert.ok(start>=0,"Campaign editor must exist");
 const editor=campaigns.slice(start);
 assert.match(editor,/flex items-center justify-center p-2 sm:p-5/,"Campaign modal must be centered");
 assert.match(editor,/role="dialog" aria-modal="true"/);
 assert.match(editor,/max-w-\[960px\] flex-col overflow-hidden rounded-2xl/);
 assert.match(editor,/min-h-0 flex-1 overflow-y-auto overscroll-contain/);
 assert.match(editor,/shrink-0 justify-end gap-2 border-t/,"Save and cancel remain visible below scrollable body");
 assert.doesNotMatch(editor,/flex justify-end/,"Do not reintroduce right-side campaign drawer");
 for(const label of ["Projeto","Campanha *","Tipo de campanha","Canais e parceiros","Resultados e aprendizados","Próximo passo","Ações da campanha","Plataforma","Situação","Objetivo","Início","Fim","Orçamento planejado","Tipo de resultado principal","Link externo da campanha","Observações","Salvar campanha"]){
  assert.ok(editor.includes(label),label+" field must be preserved");
 }
 assert.match(campaigns,/if\(!editing\|\|saving\)return/,"Existing save lifecycle is unchanged");
});
