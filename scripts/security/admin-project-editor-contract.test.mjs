import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const root=new URL("../../src/",import.meta.url);
const files=[
 "Components/admin/ExecutionTimelineEditor.tsx",
 "Components/admin/ProjectOnboarding.tsx",
 "Components/admin/EditorialManager.tsx",
 "Components/admin/CentralTarefas.tsx",
 "app/admin/planejamentos/[clientSlug]/page.tsx",
 "Components/admin/EcosystemDocumentEditor.tsx"
];

test("all migrated editors write project JSON via authorized API",()=>{
 for(const path of files){
  const code=readFileSync(new URL(path,root),"utf8");
  assert.match(code,/\/api\/admin\/project\/update/,path);
  assert.doesNotMatch(code,/\.from\("planning_projects"\)\s*\.update\(\{\s*data\s*:/,path);
 }
});

test("administrative write API checks identity, role and expected version",()=>{
 const code=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(code,/auth\.getUser\(/);
 assert.match(code,/profile\?\.role\s*!==\s*"strategist"/);
 assert.match(code,/\.eq\("updated_at",b\.expectedUpdatedAt\)/);
 assert.match(code,/if\(!updated\)return fail\(409\)/);
 assert.match(code,/"Cache-Control":"no-store"/);
});

test("administrative read API authenticates and authorizes before fetching document",()=>{
 const code=readFileSync(new URL("app/api/admin/project/route.ts",root),"utf8");
 const auth=code.indexOf("auth.getUser("),role=code.indexOf('profile?.role!=="strategist"'),project=code.indexOf('.from("planning_projects")');
 assert.ok(auth>=0&&role>auth&&project>role);
});

test("administrative project list checks role before querying private JSON",()=>{
 const code=readFileSync(new URL("app/api/admin/projects/route.ts",root),"utf8");
 const auth=code.indexOf("auth.getUser("),role=code.indexOf('profile?.role!=="strategist"'),projects=code.indexOf('.from("planning_projects")');
 assert.ok(auth>=0&&role>auth&&projects>role);
 assert.match(code,/"Cache-Control":"no-store"/);
});

test("project create and status routes authenticate before privileged writes",()=>{
 for(const [path,operation] of [
  ["app/api/admin/project/create/route.ts",'.from("planning_projects").insert('],
  ["app/api/admin/project/status/route.ts",'.from("planning_projects")']
 ]){
  const source=readFileSync(new URL(path,root),"utf8");
  const token=source.indexOf("auth.getUser(");
  const role=source.indexOf('profile?.role!=="strategist"');
  const write=source.indexOf(operation);
  assert.ok(token>=0&&role>token&&write>role,path);
  assert.match(source,/"Cache-Control":"no-store"/);
 }
 const status=readFileSync(new URL("app/api/admin/project/status/route.ts",root),"utf8");
 assert.match(status,/\.eq\("updated_at",b\.expectedUpdatedAt\)/);
 assert.match(status,/if\(!updated\)return fail\(409\)/);
 const create=readFileSync(new URL("app/api/admin/project/create/route.ts",root),"utf8");
 assert.match(create,/if\(!client\)return fail\(404\)/);
 assert.match(create,/createError\.code==="23505"\?409:503/);
});

test("project deletion checks strategist permission, version and confirmation",()=>{
 const source=readFileSync(new URL("app/api/admin/project/delete/route.ts",root),"utf8");
 const auth=source.indexOf("auth.getUser("),role=source.indexOf('profile?.role!=="strategist"'),write=source.indexOf('.from("planning_projects").delete()');
 assert.ok(auth>=0&&role>auth&&write>role);
 assert.match(source,/b\.confirmed!==true/);
 assert.match(source,/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/);
 assert.match(source,/\.eq\("updated_at",b\.expectedUpdatedAt\)/);
 assert.match(source,/if\(!deleted\)return fail\(409\)/);
});

test("presentation never fetches raw project JSON directly from browser",()=>{
 const view=readFileSync(new URL("app/apresentacao/[slug]/page.tsx",root),"utf8");
 assert.match(view,/\/api\/presentation\/project/);
 assert.doesNotMatch(view,/\.from\("planning_projects"\)/);
 const endpoint=readFileSync(new URL("app/api/presentation/project/route.ts",root),"utf8");
 const token=endpoint.indexOf("auth.getUser("),role=endpoint.indexOf('.from("profiles")'),project=endpoint.indexOf('.from("planning_projects")');
 assert.ok(token>=0&&role>token&&project>role);
 assert.match(endpoint,/profile\.client_id!==project\.client_id/);
 assert.match(endpoint,/projectForPresentation/);
 const projection=readFileSync(new URL("lib/security/projectForPresentation.ts",root),"utf8");
 assert.match(projection,/if\(!ecosystem\)return null/);
 assert.match(projection,/presentedDocumentCodes:visible/);
 assert.doesNotMatch(projection,/scrubLegacy|moduleContent/);
});

test("strategist project writes enforce acyclic dependency validation on server",()=>{
 const endpoint=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(endpoint,/validExecutionDependencies\(b\.data\)/);
 const auth=endpoint.indexOf("auth.auth.getUser(");
 const validation=endpoint.indexOf("validExecutionDependencies(b.data)");
 const update=endpoint.indexOf('.update({data:b.data,updated_at:nextAt})');
 assert.ok(validation>auth&&update>validation,"dependency validation must run before privileged write");
});

test("new operational owner assignments require an active team member on server",()=>{
 const route=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(route,/const changedOwners=/);
 assert.match(route,/admin\.from\("team_members"\)\.select\("user_id"\)\.eq\("active",true\)\.in\("user_id",changedOwners\)/);
 assert.match(route,/if\(new Set\(\(members\?\?\[\]\)\.map/);
 assert.ok(route.indexOf('if(profile?.role!=="strategist")')<route.indexOf("const changedOwners="));
 assert.ok(route.indexOf("const changedOwners=")<route.indexOf('.update({data:b.data,updated_at:nextAt})'));
});

test("creating a planning project never overwrites an existing client profile",()=>{
 const code=readFileSync(new URL("app/admin/novo-planejamento/modulos/page.tsx",root),"utf8");
 assert.match(code,/const existing = await supabase\.from\("clients"\)/);
 assert.match(code,/\.eq\("slug",draft\.clientSlug\)\.maybeSingle\(\)/);
 assert.doesNotMatch(code,/\.from\("clients"\)\s*\.upsert\(/);
 assert.match(code,/if \(!client && !clientError\)/);
 assert.match(code,/clientError\?\.code==="23505"/);
});

test("project management links identify the exact project under its client",()=>{
 const page=readFileSync(new URL("app/admin/planejamentos/[clientSlug]/page.tsx",root),"utf8");
 const clients=readFileSync(new URL("Components/admin/ClientsDirectory.tsx",root),"utf8");
 const dashboard=readFileSync(new URL("app/admin/page.tsx",root),"utf8");
 assert.match(page,/requestedProjectId = searchParams\.get\("projectId"\)/);
 assert.match(page,/\[clientSlug, requestedProjectId, router\]/);
 assert.match(page,/\<Suspense fallback=/);
 assert.match(page,/setProject\(null\)/);
 assert.match(page,/projectIdPattern\.test\(requestedProjectId\)/);
 assert.match(page,/\.eq\("clients\.slug", clientSlug\)/);
 assert.match(page,/query = query\.eq\("id", requestedProjectId\)/);
 assert.match(clients,/projectId=\$\{encodeURIComponent\(p\.id\)\}/);
 assert.match(dashboard,/encodeURIComponent\(project\.id\)/);
});
