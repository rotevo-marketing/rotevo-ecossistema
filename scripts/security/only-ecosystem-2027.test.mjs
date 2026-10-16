import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const source=(relative)=>readFileSync(fileURLToPath(new URL("../../src/"+relative,import.meta.url)),"utf8");
test("obsolete demo routes do not ship",()=>{
 assert.equal(existsSync(fileURLToPath(new URL("../../src/app/admin/planejamentos/demo",import.meta.url))),false);
});
test("presentation renders only Ecosystem 2027",()=>{
 const page=source("app/apresentacao/[slug]/page.tsx");
 assert.match(page,/EcosystemPresentationOverview/);
 assert.doesNotMatch(page,/LegacyPresentationV2|LegacyPresentation|moduleContent/);
});
test("client project presentation rejects JSON without ecosystem2027",()=>{
 const projection=source("lib/security/projectForPresentation.ts");
 assert.match(projection,/if\(!ecosystem\)return null/);
 assert.doesNotMatch(projection,/moduleContent|scrubLegacy/);
});

test("new planning creation does not reference the old module registry",()=>{
 const wizard=source("app/admin/novo-planejamento/modulos/page.tsx");
 assert.doesNotMatch(wizard,/planningModules|selectedModules|moduleContent|selectedModuleRecords/);
 assert.match(wizard,/ecosystem2027/);
 const endpoint=source("app/api/admin/project/create/route.ts");
 assert.match(endpoint,/payload\.selectedModules!==undefined/);
 assert.match(endpoint,/payload\.moduleContent!==undefined/);
 assert.match(endpoint,/selectedDocumentCodes/);
});

test("current ecosystem document editor uses authorized version-checked endpoint",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 const adminPage=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.match(editor,/ecosystem2027/);
 assert.match(editor,/\/api\/admin\/project\/update/);
 assert.match(editor,/expectedUpdatedAt:updatedAt/);
 assert.doesNotMatch(editor,/\.from\("planning_projects"\)/);
 assert.match(adminPage,/EcosystemDocumentEditor/);
});
