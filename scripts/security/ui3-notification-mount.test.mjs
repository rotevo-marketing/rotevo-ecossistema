import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
test("notification bell is gated by public feature flag and current authenticated identity",()=>{
 for(const [page,actor] of [
  ["src/app/admin/page.tsx","userId"],
  ["src/app/cliente/page.tsx","authenticatedUserId"]
 ]){
  const source=read(page);
  assert.match(source,/import WorkflowNotificationBell from "@\/Components\/shared\/WorkflowNotificationBell"/);
  assert.ok(source.includes('process.env.NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED==="true"&&'+actor+'&&!sessionBlocked&&<WorkflowNotificationBell userId={'+actor+'} onOpenContent='));
  assert.ok(source.includes("useSessionBoundary("));
 }
});
test("notification endpoint rejects disabled server flag",()=>{
 const source=read("src/app/api/workflow/notifications/route.ts");
 assert.ok(source.includes('process.env.ROTEVO_NOTIFICATIONS_ENABLED!=="true"'));
});

test("notification navigation checks project scope before opening content",()=>{
 const admin=read("src/app/admin/page.tsx");
 const client=read("src/app/cliente/page.tsx");
 const bell=read("src/Components/shared/WorkflowNotificationBell.tsx");
 const manager=read("src/Components/admin/EditorialManager.tsx");
 assert.match(admin,/projects\.some\(p=>p\.id===projectId/);
 assert.match(client,/projects\.find\(p=>p\.id===projectId\)/);
 assert.match(client,/item\.visibleToClient===true/);
 assert.match(client,/openModule\("content",projectId,contentId\)/);
 assert.match(manager,/notificationTarget\.projectId/);
 assert.match(bell,/onOpenContent\?\.\(n\.project_id,n\.resource_id\)/);
 assert.match(bell,/Marcar como lida/);
});

test("Meu Foco shows only user-bound actionable notifications behind release flag",()=>{
 const focus=read("src/Components/admin/WorkflowFocusQueue.tsx");
 const overview=read("src/Components/admin/AdminOperationsOverview.tsx");
 const admin=read("src/app/admin/page.tsx");
 assert.match(focus,/actionable=new Set\(\["adjustments_requested","message_sent"\]\)/);
 assert.match(focus,/latest\.user\?\.id!==userId/);
 assert.match(focus,/onOpenContent\(n\.project_id,n\.resource_id\)/);
 assert.match(overview,/NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED==="true"/);
 assert.match(overview,/WorkflowFocusQueue userId=\{userId\}/);
 assert.match(admin,/onOpenNotification=\{openWorkflowContent\}/);
});

test("task notifications route to the correct authorized task in both portals",()=>{
 const bell=read("src/Components/shared/WorkflowNotificationBell.tsx");
 const focus=read("src/Components/admin/WorkflowFocusQueue.tsx");
 const admin=read("src/app/admin/page.tsx");
 const client=read("src/app/cliente/page.tsx");
 const tasks=read("src/Components/admin/CentralTarefas.tsx");
 const timeline=read("src/Components/cliente/ProjectTimeline.tsx");
 assert.match(bell,/n\.event_phase==="task"/);
 assert.match(bell,/onOpenTask\?\.\(n\.project_id,n\.resource_id\)/);
 assert.match(focus,/onOpenTask\?\.\(n\.project_id,n\.resource_id\)/);
 assert.match(admin,/function openWorkflowTask\(projectId:string,taskId:string\)/);
 assert.match(admin,/item\.visibleToClient===true/);
 assert.match(client,/onOpenTask=\{\(projectId,taskId\)=>/);
 assert.match(client,/workspace\?\.modules\.includes\("execution"/);
 assert.match(tasks,/notificationTask\?\.nonce/);
 assert.match(timeline,/focusTask\?\.nonce/);
});
test("transactional content and task SQL preserve authorized recipient checks",()=>{
 const sql=read("docs/security/sql/ui3-content-message-event-PROPOSAL-ONLY.sql");
 const notice=read("docs/security/sql/ui3-notifications-read-PROPOSAL-ONLY.sql");
 const decision=read("docs/security/sql/ui3-editorial-workflow-rpc-PROPOSAL-ONLY.sql");
 assert.match(sql,/new\.resource_type not in \('content','task'\)/);
 assert.match(sql,/v_items_key:=case when new\.resource_type='task' then 'executionTimeline'/);
 assert.match(sql,/jsonb_strip_nulls\(jsonb_build_object\('origin','conversation','phase'/);
 assert.match(sql,/on conflict\(event_id,recipient_user_id\) do nothing/);
 assert.match(sql,/new\.author_user_id/);
 assert.match(notice,/e\.resource_type in \('content','task'\)/);
 assert.match(notice,/profile\.role<>'client' or c\.value->>'visibleToClient'='true'/);
 assert.match(decision,/rotevo_workflow\.skip_message_event/);
});

test("controlled production pilot denies notification access unless user is allowlisted",()=>{
 const route=read("src/app/api/workflow/notifications/route.ts");
 const bell=read("src/Components/shared/WorkflowNotificationBell.tsx");
 const queue=read("src/Components/admin/WorkflowFocusQueue.tsx");
 const decision=read("src/app/api/workflow/editorial/decision/route.ts");
 const requestRoute=read("src/app/api/workflow/editorial/request/route.ts");
 assert.match(route,/ROTEVO_NOTIFICATIONS_ENABLED!=="true"/);
 assert.match(route,/ROTEVO_NOTIFICATIONS_PILOT_USER_IDS/);
 assert.match(route,/!pilot.length\|\|!pilot.includes\(identity.user.id\)/);
 assert.match(bell,/if\(!pilotAllowed\)return null/);
 assert.match(queue,/if\(status==="unavailable"\)return null/);
 assert.match(decision,/ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true"/);
 assert.match(requestRoute,/ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true"/);
});
