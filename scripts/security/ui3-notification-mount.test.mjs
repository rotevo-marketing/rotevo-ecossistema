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
  assert.ok(source.includes('process.env.NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED==="true"&&'+actor+'&&!sessionBlocked&&<WorkflowNotificationBell userId={'+actor+'} onOpenContent='));
  assert.ok(source.includes("useSessionBoundary("));
 }
});
test("notification endpoint rejects disabled server flag",()=>{
 const source=read("src/app/api/workflow/notifications/route.ts");
 assert.ok(source.includes('process.env.ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true"'));
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
 assert.match(bell,/onOpenContent\(n\.project_id,n\.resource_id\)/);
 assert.match(bell,/Marcar como lida/);
});

test("Meu Foco shows only user-bound actionable notifications behind release flag",()=>{
 const focus=read("src/Components/admin/WorkflowFocusQueue.tsx");
 const overview=read("src/Components/admin/AdminOperationsOverview.tsx");
 const admin=read("src/app/admin/page.tsx");
 assert.match(focus,/actionable=new Set\(\["adjustments_requested","message_sent"\]\)/);
 assert.match(focus,/latest\.user\?\.id!==userId/);
 assert.match(focus,/onOpenContent\(n\.project_id,n\.resource_id\)/);
 assert.match(overview,/NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED==="true"/);
 assert.match(overview,/WorkflowFocusQueue userId=\{userId\}/);
 assert.match(admin,/onOpenNotification=\{openWorkflowContent\}/);
});
