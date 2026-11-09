import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");

test("UI3 project directory is a compact operational list with explicit filters",()=>{
 const admin=source("app/admin/page.tsx");
 assert.match(admin,/rv-ui3-projects-surface/);
 assert.match(admin,/rv-ui3-project-list/);
 assert.match(admin,/rv-ui3-projects-filters/);
 assert.match(admin,/setStatusFilter\(f.value\)/);
 assert.match(admin,/value=\{searchTerm\}/);
 assert.match(admin,/handlePublishProject\(project,"published"\)/);
 assert.match(admin,/window\.confirm\(action\)/);
 assert.match(admin,/Esta ação não publica automaticamente documentos estratégicos individuais/);
});

test("onboarding phases preserve project-bound checklist persistence and legacy records",()=>{
 const editor=source("Components/admin/ProjectOnboarding.tsx");
 const hub=source("Components/admin/OperationalHubs.tsx");
 for(const phase of ["Formalização","Preparação","Alinhamento","Liberação"])assert.ok(editor.includes(phase),phase);
 assert.match(editor,/standardOrder\?phaseGroups/);
 assert.match(editor,/onboardingChecklist:next/);
 assert.match(editor,/\.\.\.items,\.\.\.missing\.map/);
 assert.match(editor,/visibleToClient:false/);
 assert.match(hub,/rv-ui3-onboarding-surface/);
 assert.match(hub,/Gerenciar onboarding/);
 assert.match(hub,/setStarterOpen\(true\)/);
});

test("access is intercepted into contextual drawer with direct authorized route intact",()=>{
 const drawer=source("app/admin/@modal/(.)planejamentos/[clientSlug]/acesso/page.tsx");
 const original=source("app/admin/planejamentos/[clientSlug]/acesso/page.tsx");
 assert.match(drawer,/AcessoClientePage/);
 assert.match(drawer,/role="dialog"/);
 assert.match(drawer,/DialogFocus/);
 assert.match(drawer,/router\.back\(\)/);
 assert.match(original,/supabase/);
 assert.match(original,/useParams/);
});

test("presentation returns to project list only when opened from projects",()=>{
 const admin=source("app/admin/page.tsx");
 const page=source("app/apresentacao/[slug]/page.tsx");
 const view=source("Components/apresentacao/EcosystemPresentationOverview.tsx");
 assert.match(admin,/\?from=projects/);
 assert.match(page,/query\.get\("from"\)==="projects"/);
 assert.match(view,/returnToProjects\?"\/admin\?section=projects":planningHref/);
});

test("UI3 leaves published strategic document sheets untouched",()=>{
 const css=source("app/rotevo-ui3.css");
 assert.doesNotMatch(css,/\.se-paper\s*\{/);
 assert.doesNotMatch(css,/\.bn-editor\s*\{/);
 assert.match(css,/\.rv-ui3/);
});
