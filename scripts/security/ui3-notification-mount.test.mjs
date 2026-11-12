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
  assert.ok(source.includes('process.env.NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED==="true"&&'+actor+'&&!sessionBlocked&&<WorkflowNotificationBell userId={'+actor+'}/>'));
  assert.ok(source.includes("useSessionBoundary("));
 }
});
test("notification endpoint rejects disabled server flag",()=>{
 const source=read("src/app/api/workflow/notifications/route.ts");
 assert.ok(source.includes('process.env.ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true"'));
});
