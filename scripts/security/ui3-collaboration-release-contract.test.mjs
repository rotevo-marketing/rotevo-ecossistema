import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=(p)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const api=src("src/app/api/collaboration/messages/route.ts");
const policy=src("src/lib/collaboration/guards.ts");
const sql=src("docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql");
test("API denies requests unless explicitly enabled; JWT and resource authorization are mandatory",()=>{
 assert.ok(api.includes('ROTEVO_COLLABORATION_ENABLED!=="true"'));
 assert.ok(api.includes("auth.auth.getUser("));
 assert.ok(api.includes("canAccessConversation("));
 assert.ok(api.includes("rotevo_collaboration_messages"));
});
test("both portals and both resource types remain behind the browser flag",()=>{
 for(const p of ["src/Components/admin/CentralTarefas.tsx","src/Components/cliente/ProjectTimeline.tsx","src/Components/cliente/EditorialCalendar.tsx"]){
  const code=src(p);
  assert.ok(code.includes('NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true"'),p);
  assert.ok(code.includes("ProjectConversation"),p);
 }
});
test("tenant/workspace/sharing and staff assignment guards remain present",()=>{
 for(const token of ["input.userClientId===input.projectClientId","workspaceModules.includes","visibleToClient===true","input.assigned===true","projects.read"])assert.ok(policy.includes(token),token);
 assert.ok(api.includes("projects.write"));
});
test("SQL proposal keeps direct browser grants closed and rate limiting enforced",()=>{
 for(const token of ["PROPOSAL ONLY","create table public.rotevo_collaboration_messages","enable row level security","revoke all on public.rotevo_collaboration_messages from PUBLIC,anon,authenticated","grant select,insert on public.rotevo_collaboration_messages to service_role","pg_advisory_xact_lock","recent_count>=10","created_at desc,id desc"])assert.ok(sql.toLowerCase().includes(token.toLowerCase()),token);
});
