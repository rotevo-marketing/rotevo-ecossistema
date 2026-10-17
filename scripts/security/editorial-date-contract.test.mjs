import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../../src/",import.meta.url);
test("editorial entries use semantic calendar validation, not date-shaped regex only",()=>{
 const source=readFileSync(new URL("Components/admin/EditorialManager.tsx",root),"utf8");
 assert.match(source,/import \{validOperationalDate\} from/);
 assert.match(source,/validOperationalDate\(editing\.publishDate\)/);
});
test("calendar date validator rejects nonexistent leap and month days",()=>{
 const source=readFileSync(new URL("lib/security/executionDependencyValidation.ts",root),"utf8");
 assert.match(source,/const leap=/);
 assert.match(source,/return day<=days\[month-1\]/);
});

test("client editorial calendar uses local year/month across UTC day boundaries",()=>{
 const source=readFileSync(new URL("Components/cliente/EditorialCalendar.tsx",root),"utf8");
 assert.match(source,/d\.getFullYear\(\)/);
 assert.match(source,/d\.getMonth\(\)\+1/);
 assert.doesNotMatch(source,/toISOString\(\)\.slice\(0,7\)/);
 assert.match(source,/new Date\(y,m-2,1\)/);
 assert.match(source,/new Date\(y,m,1\)/);
});

test("editor explains that revised content needs a new version after client decision",()=>{
 const source=readFileSync(new URL("Components/admin/EditorialManager.tsx",root),"utf8");
 assert.match(source,/const decided=decisions\.some\(row=>row\.content_id===editing\.id/);
 assert.match(source,/row\.content_version===\(editing\.version\?\?""\)/);
 assert.match(source,/original\.version===editing\.version&&materialFields\.some/);
 assert.match(source,/Informe um novo número de versão antes de alterar o material/);
});

test("editorial month/list navigation filters by project and status and opens a detail drawer",()=>{
 const source=readFileSync(new URL("Components/cliente/EditorialCalendar.tsx",root),"utf8");
 assert.match(source,/aria-label="Filtrar projeto editorial"/);
 assert.match(source,/aria-label="Filtrar situação editorial"/);
 assert.match(source,/projectFilter==="all"/);
 assert.match(source,/statusFilter==="all"/);
 assert.match(source,/role="dialog" aria-modal="true" aria-label="Detalhes do conteúdo"/);
 assert.match(source,/safe\(active\.driveUrl\)/);
 assert.match(source,/clientView&&<EditorialDecision/);
});
test("editorial review remains an independent client decision bound to content version",()=>{
 const source=readFileSync(new URL("Components/cliente/EditorialDecision.tsx",root),"utf8");
 assert.match(source,/item\.status!=="awaiting_client"/);
 assert.match(source,/content_version:version/);
 assert.match(source,/changes_requested/);
 assert.match(source,/comment:decision==="changes_requested"/);
});
test("manager uses titled approval records and project-bound task association",()=>{
 const source=readFileSync(new URL("Components/admin/EditorialManager.tsx",root),"utf8");
 assert.match(source,/contentTitles=\{Object\.fromEntries\(items\.map/);
 assert.match(source,/editing\.relatedTaskId/);
 assert.match(source,/visibleToClient===true/);
});
