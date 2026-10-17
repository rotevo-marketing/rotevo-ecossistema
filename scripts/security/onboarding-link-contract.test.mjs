import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/app/api/admin/project/update/route.ts",import.meta.url),"utf8");
const editor=readFileSync(new URL("../../src/Components/admin/ProjectOnboarding.tsx",import.meta.url),"utf8");
const hub=readFileSync(new URL("../../src/Components/admin/OperationalHubs.tsx",import.meta.url),"utf8");

test("legacy onboarding links and title lengths remain protected by server validation",()=>{
 assert.match(source,/parsed\.protocol!=="https:"/);
 assert.match(source,/entry\.title\.trim\(\)\.length<3/);
 assert.match(source,/entry\.title\.trim\(\)\.length>140/);
});
test("onboarding stays a project-scoped, ten-step checklist with no task creation",()=>{
 assert.match(editor,/ONBOARDING_STANDARD_STEPS/);
 assert.match(editor,/Liberar o projeto para execução/);
 assert.match(editor,/Enviar o Formulário de Diagnóstico Inicial/);
 assert.match(editor,/onboardingChecklist:next/);
 assert.match(editor,/expectedUpdatedAt:updatedAt/);
 assert.match(editor,/\/api\/admin\/project\/update/);
 assert.doesNotMatch(editor,/executionTimeline:/);
 assert.match(editor,/Etapa \$\{index\+1\}/);
 assert.match(editor,/Progresso do onboarding/);
});
test("existing checklist stages are preserved when applying the current template",()=>{
 assert.match(editor,/\.\.\.items,\.\.\.missing\.map/);
 assert.match(editor,/Preservar atuais e adicionar/);
 assert.match(editor,/Usar checklist padrão de 10 etapas/);
 assert.match(editor,/Confirmar substituição/);
 assert.match(editor,/visibleToClient:false/);
});
test("onboarding management stays project-based with start button and Tabler icons",()=>{
 assert.match(hub,/Iniciar onboarding/);
 assert.match(hub,/setStarterOpen\(true\)/);
 assert.match(hub,/Gerenciar onboarding/);
 for(const name of ["lifebuoy","alert-circle","clock","circle-check"])assert.ok(hub.includes('name="'+name+'"')||hub.includes('icon:"'+name+'"'),name);
 assert.doesNotMatch(hub,/\["Progresso","chart-pie"\]/);
});

test("start onboarding stays actionable even when all projects have legacy checklists",()=>{
 assert.match(hub,/disabled=\{projects\.length===0\}/);
 assert.match(hub,/overview\.map\(p=><option/);
 assert.match(hub,/checklist existente/);
});
