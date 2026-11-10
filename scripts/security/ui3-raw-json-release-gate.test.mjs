// UI3 confidentiality release guard: no database connection or production writes.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const load=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("client portal requests server projection and never reads project JSON directly",()=>{
 const client=load("src/app/cliente/page.tsx");
 const endpoint=load("src/app/api/client/projects/route.ts");
 const projection=load("src/lib/security/projectForClient.ts");
 assert.match(client,/fetch\("\/api\/client\/projects"/);
 assert.doesNotMatch(client,/\.from\("planning_projects"\)/);
 assert.match(endpoint,/\.eq\("client_id",profile\.client_id\)/);
 assert.match(endpoint,/source\.map\(p=>projectForClient\(p,modules\)\)/);
 assert.match(projection,/Deliberately allowlisted response/);
 assert.doesNotMatch(projection,/data:\s*\{\s*\.\.\.data/);
});

test("strategist admin and editors route private JSON reads and writes through authorized server endpoints",()=>{
 const overview=load("src/app/admin/page.tsx");
 const editor=load("src/app/admin/planejamentos/[clientSlug]/page.tsx");
 const editorial=load("src/Components/admin/EditorialManager.tsx");
 const onboarding=load("src/Components/admin/ProjectOnboarding.tsx");
 const execution=load("src/Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(overview,/fetch\("\/api\/admin\/projects"/);
 assert.match(editorial,/fetch\("\/api\/admin\/project\/update"/);
 assert.match(onboarding,/fetch\("\/api\/admin\/project\/update"/);
 assert.match(execution,/fetch\("\/api\/admin\/project\/update"/);
 assert.match(editor,/fetch\(\`\/api\/admin\/project\?id=/);
 assert.match(editor,/fetch\("\/api\/admin\/project\/update"/);
 // Editor can query project metadata through RLS, but never browser-fetch raw project JSON.
 const queryIndex=editor.indexOf('.from("planning_projects")');
 assert.ok(queryIndex>=0);
 assert.doesNotMatch(editor.slice(queryIndex,queryIndex+380),/data\s*,/);
 for(const src of [overview,editor,editorial,onboarding,execution]){
  assert.doesNotMatch(src,/supabase\.from\("planning_projects"\)\.select\("[^"]*data/);
 }
});

test("database direct project JSON access remains an explicit BLOCKING release gate",()=>{
 const securityGate=load("docs/security/production-security-gate-20261015.md");
 const prior=load("docs/security/client-project-publication-architecture-20261015.md");
 const sqlTest=load("docs/security/tests/planning-data-column-grant-proposal-local.test.sql");
 assert.match(securityGate,/planning_projects\.data/);
 assert.match(prior,/REVOKE|Revogar|revogar/);
 assert.match(sqlTest,/REVOKE SELECT ON public\.planning_projects FROM anon,authenticated/i);
 assert.match(sqlTest,/has_column_privilege\('authenticated','public\.planning_projects','data','SELECT'\)/);
 assert.ok(existsSync(new URL("../../supabase/tests/database/planning_data_exposure_characterization_test.sql",import.meta.url)));
});
