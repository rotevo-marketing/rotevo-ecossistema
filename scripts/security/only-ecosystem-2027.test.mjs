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

test("only released snapshots flow to the customer and review steps stay explicit",()=>{
 const projection=source("lib/security/projectForPresentation.ts");
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(projection,/doc\.publishedContent/);
 assert.match(projection,/doc\.publishedAt/);
 assert.doesNotMatch(projection,/\{content:doc\.content\}/);
 assert.match(editor,/action:"save"\|"review"\|"approve"\|"publish"/);
 assert.match(editor,/action==="publish"/);
 assert.match(editor,/record\?\.reviewStatus!=="approved"/);
 assert.match(editor,/publishedContent:savedContent/);
 assert.match(editor,/reviewStatus:"draft"/);
});

test("server validates all document transitions before changing project JSON",()=>{
 const handler=source("app/api/admin/project/update/route.ts");
 const guard=source("lib/security/ecosystemDocumentTransitions.ts");
 assert.match(handler,/validEcosystemDocumentTransition\(existing\.data,b\.data\)/);
 assert.match(guard,/status\(oldDoc\)==="draft"&&status\(nextDoc\)==="review"/);
 assert.match(guard,/status\(oldDoc\)==="review"&&status\(nextDoc\)==="approved"/);
 assert.match(guard,/nextDoc\.publishedContent!==oldDoc\.content/);
});

test("current project admin contains no legacy module selection state",()=>{
 const page=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.doesNotMatch(page,/planningModules|moduleCategories|selectedModuleSlugs|saveModuleSelection|toggleModule/);
 assert.match(page,/EcosystemDocumentEditor/);
 assert.match(page,/selectedDocumentCodes/);
});

test("document workspace provides search and lifecycle progress visibility",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/visibleDocuments/);
 assert.match(editor,/reviewedCount/);
 assert.match(editor,/approvedCount/);
 assert.match(editor,/publishedCount/);
});
