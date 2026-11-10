import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
const focus=readFileSync(new URL("../../src/Components/ui/DialogFocus.tsx",import.meta.url),"utf8");
test("responsive two-pane detail keeps scroll containment and focus support",()=>{
 assert.match(source,/grid-cols-1 overflow-y-auto overscroll-contain lg:grid-cols-/);
 assert.match(source,/lg:overflow-y-auto lg:overscroll-contain/);
 assert.match(source,/DialogFocus onClose=/);
 assert.match(focus,/event.key==="Escape"/);
 assert.match(focus,/event.key!=="Tab"/);
 assert.match(focus,/previous\.focus\(\)/);
});
test("checklist has descriptive focusable actions, live progress and keyboard form",()=>{
 assert.match(source,/aria-labelledby="ui3-task-checklist-title"/);
 assert.match(source,/aria-live="polite"/);
 assert.match(source,/aria-label=\{\`Remover etapa/);
 assert.match(source,/onSubmit=\{e=>\{e\.preventDefault\(\)/);
 assert.match(source,/detailDraft\.checklist\.length<50/);
 assert.match(source,/type="submit" disabled=\{!detailChecklistText\.trim\(\)/);
});
test("dependencies are project scoped, wrapping and bounded; history is chronological and semantic",()=>{
 assert.match(source,/aria-labelledby="ui3-task-dependencies-title"/);
 assert.match(source,/max-h-56 space-y-1 overflow-y-auto overscroll-contain/);
 assert.match(source,/t\.id!==selected\.task\.id&&t\.status!=="cancelled"/);
 assert.match(source,/<ol className="mt-3 space-y-3">/);
 assert.match(source,/<time dateTime=\{event\.at\}/);
});
test("no message submission was added",()=>{
 assert.match(source,/O envio de mensagens ainda não está habilitado/);
 assert.doesNotMatch(source,/\/api\/task\/comments/);
});
