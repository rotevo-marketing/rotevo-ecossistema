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

test("rapid project navigation ignores obsolete asynchronous responses",()=>{
 const page=readFileSync(new URL("app/admin/planejamentos/[clientSlug]/page.tsx",root),"utf8");
 assert.match(page,/let cancelled = false/);
 assert.match(page,/return \(\) => \{ cancelled = true; \}/);
 assert.match(page,/const loaded=await response\.json\(\);\s*if \(cancelled\) return;/);
 assert.match(page,/const \{ data, error \} = await query[\s\S]*?if \(cancelled\) return;/);
});

test("executive dashboard shortcuts retain the exact project identity",async()=>{
 const {overviewProjectHref}=await import('../../src/lib/overview/model.ts');
 for(const id of ['project-a','project-b'])assert.equal(overviewProjectHref({id,clients:{slug:'same-client'}}),'/admin/planejamentos/same-client?projectId='+encodeURIComponent(id));
});

test("task board navigates to the correct owning project",()=>{
 const board=readFileSync(new URL("Components/admin/CentralTarefas.tsx",root),"utf8");
 assert.match(board,/projectId=\$\{encodeURIComponent\(project\.id\)\}/);
});

test("module selection rejects malformed locally persisted planning drafts",()=>{
 const source=readFileSync(new URL("app/admin/novo-planejamento/modulos/page.tsx",root),"utf8");
 assert.match(source,/const value: unknown = JSON\.parse\(storedDraft\)/);
 assert.match(source,/typeof fields\.clientSlug !== "string" \|\| !slugPattern\.test\(fields\.clientSlug\)/);
 assert.match(source,/typeof fields\.projectSlug !== "string" \|\| !slugPattern\.test\(fields\.projectSlug\)/);
 assert.match(source,/typeof fields\.projectTitle !== "string" \|\| !fields\.projectTitle\.trim\(\)/);
 assert.match(source,/if \(!storedDraft\) \{/);
});

test("project creation accepts only real selectable 2027 document codes",()=>{
 const source=readFileSync(new URL("app/api/admin/project/create/route.ts",root),"utf8");
 assert.match(source,/import \{ecosystemDocuments\} from "@\/data\/ecosystem2027"/);
 assert.match(source,/ecosystemDocuments\.filter\(doc=>!doc\.area\.startsWith\("00 "\)\)/);
 assert.match(source,/selected\.every\(code=>typeof code==="string"&&allowedCodes\.has\(code\)\)/);
 assert.match(source,/presented\.every\(code=>typeof code==="string"&&selected\.includes\(code\)\)/);
});

test("project scope changes reject unknown and dashboard-only document codes",()=>{
 const source=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(source,/const scopeChanged=JSON\.stringify\(before\.selectedDocumentCodes\)/);
 assert.match(source,/if\(scopeChanged\)\{/);
 assert.match(source,/ecosystemDocuments\.filter\(doc=>!doc\.area\.startsWith\("00 "\)\)/);
 assert.match(source,/selected\.every\(code=>typeof code==="string"&&allowedCodes\.has\(code\)\)/);
 assert.match(source,/presented\.every\(code=>typeof code==="string"&&selected\.includes\(code\)\)/);
});

test("planning slugs do not confuse common name prefixes with whole client slugs",()=>{
 const source=readFileSync(new URL("app/admin/novo-planejamento/modulos/page.tsx",root),"utf8");
 assert.match(source,/draft\.projectSlug === draft\.clientSlug \|\| draft\.projectSlug\.startsWith\(`\$\{draft\.clientSlug\}-`\)/);
 assert.doesNotMatch(source,/if \(draft\.projectSlug\.startsWith\(draft\.clientSlug\)\)/);
});

test("planning wizard checks slug length before selecting strategic documents",()=>{
 const start=readFileSync(new URL("app/admin/novo-planejamento/page.tsx",root),"utf8");
 const finish=readFileSync(new URL("app/admin/novo-planejamento/modulos/page.tsx",root),"utf8");
 assert.match(start,/clientSlug\.length > 65/);
 assert.match(start,/finalSlug\.length > 180/);
 assert.match(start,/projectTitle\.trim\(\)\.length > 180/);
 assert.match(start,/projectSlug\.startsWith\(`\$\{clientSlug\}-`\)/);
 assert.match(finish,/draft\.projectSlug\.startsWith\(`\$\{draft\.clientSlug\}-`\)/);
});

test("project creation rejects invalid execution and agenda graphs before inserting data",()=>{
 const source=readFileSync(new URL("app/api/admin/project/create/route.ts",root),"utf8");
 assert.match(source,/validExecutionDependencies\(payload\)/);
 assert.ok(source.indexOf("validExecutionDependencies(payload)")<source.indexOf('.from("planning_projects").insert('));
 assert.match(source,/validEcosystemDocumentTransition\(\{ecosystem2027:\{version:1\}\},payload\)/);
});

test("editorial decisions cannot silently approve modified material under the same version",()=>{
 const source=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(source,/const changedEditorialVersions=new Map<string,string>\(\)/);
 assert.match(source,/const materialFields=\["title","channel","format","publishDate","caption","driveUrl"\]/);
 assert.match(source,/admin\.from\("editorial_approvals"\)/);
 assert.match(source,/\.eq\("project_id",b\.projectId\)/);
 assert.match(source,/\.in\("content_id",\[\.\.\.changedEditorialVersions\.keys\(\)\]\)/);
 assert.match(source,/changedEditorialVersions\.get\(approval\.content_id\)===approval\.content_version/);
 assert.ok(source.indexOf("changedEditorialVersions.size")<source.indexOf('.update({data:b.data,updated_at:nextAt})'));
});

test("switching between client projects isolates editor state and late save callbacks",()=>{
 const page=readFileSync(new URL("app/admin/planejamentos/[clientSlug]/page.tsx",root),"utf8");
 for(const name of ["EcosystemDocumentEditor","ProjectOnboarding","OperationalAgenda","ExecutionTimelineEditor"]){
  assert.match(page,new RegExp("<"+name+" key=\\{project\\.id\\} projectId=\\{project\\.id\\}"));
 }
 const guards=page.match(/onSaved=\{\(data,updated_at\)=>setProject\(p=>p\?\.id===project\.id\?/g)??[];
 assert.equal(guards.length,4,"all four editor save callbacks must verify project identity");
});

test("execution editor never shares unmarked tasks with the client",()=>{
 const editor=readFileSync(new URL("Components/admin/ExecutionTimelineEditor.tsx",root),"utf8");
 assert.match(editor,/visibleToClient:editing\.visibleToClient===true/);
 assert.match(editor,/item\.visibleToClient===true\?"Visível ao cliente":"Interno"/);
 assert.doesNotMatch(editor,/visibleToClient:editing\.visibleToClient!==false/);
});

test("admin onboarding and meetings tabs use real project-bound editors",()=>{
 const page=readFileSync(new URL("app/admin/page.tsx",root),"utf8");
 const hubs=readFileSync(new URL("Components/admin/OperationalHubs.tsx",root),"utf8");
 assert.match(page,/workspaceTab==="onboarding" && !isLoading && <AdminOnboardingHub/);
 assert.match(page,/workspaceTab==="meetings" && !isLoading && <AdminMeetingsHub/);
 assert.match(hubs,/<ProjectOnboarding key=\{project.id\} projectId=\{project.id\}/);
 assert.match(hubs,/<OperationalAgenda key=\{selectedProject.id/);
 assert.match(hubs,/projectId=\{selectedProject.id\}/);
 assert.match(hubs,/startNew=\{newOpen\}/);
 assert.match(hubs,/onChanged\(project.id,data,updatedAt\)/);
 assert.match(hubs,/aria-label="Selecionar projeto operacional"/);
 assert.match(hubs,/Agenda de \{labelDate\(activeDay\)\}/);
 assert.match(hubs,/dateKey\(new Date\(month.getFullYear\(\),month.getMonth\(\),i\+1\)\)/);
});

test("campaign overview scopes monthly spend and performance to one project",()=>{
 const hub=readFileSync(new URL("Components/admin/CampaignsHub.tsx",root),"utf8");
 assert.match(hub,/selectedProjectId=projectFilter\|\|projects\[0\]/);
 assert.match(hub,/project\.id===selectedProjectId/);
 assert.match(hub,/monthFilter/);
 assert.match(hub,/const dataFor=/);
 assert.match(hub,/Custo por lead \(CPL\)/);
 assert.match(hub,/ROAS/);
 assert.match(hub,/Alcance único não é somado/);
 assert.doesNotMatch(hub,/Campanhas com resultados/);
});
test("campaign monthly history uses authorized project API and avoids accidental double-counting",()=>{
 const hub=readFileSync(new URL("Components/admin/CampaignsHub.tsx",root),"utf8");
 const api=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 const validator=readFileSync(new URL("lib/security/campaignMetricsValidation.ts",root),"utf8");
 assert.match(hub,/async function saveSnapshot\(/);
 assert.match(hub,/marketingCampaigns:updated/);
 assert.match(hub,/expectedUpdatedAt:project.updated_at/);
 assert.match(hub,/before\.filter\(x=>x\.month!==record\.month\)/);
 assert.match(hub,/Histórico mensal/);
 assert.match(api,/validCampaignRecords\(nextRoot\.marketingCampaigns\)/);
 assert.match(validator,/months\.has\(r\.month\)/);
 assert.match(validator,/Number\.isFinite/);
});
