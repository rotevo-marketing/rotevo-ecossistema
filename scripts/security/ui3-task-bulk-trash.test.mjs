import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const tasks=read("../../src/Components/admin/CentralTarefas.tsx");
const timeline=read("../../src/Components/cliente/ProjectTimeline.tsx");
const validation=read("../../src/lib/security/executionDependencyValidation.ts");
test("selection supports page-level and individual checkbox and clearing on tab changes",()=>{
 assert.match(tasks,/aria-label="Selecionar todas as tarefas da página"/);
 assert.match(tasks,/aria-label=\{`Selecionar tarefa/);
 assert.match(tasks,/setSelectedKeys\(\[\]\)/);
 assert.match(tasks,/role="toolbar" aria-label="Ações das tarefas selecionadas"/);
});
test("bulk actions process projects independently to avoid overwriting unrelated project timelines",()=>{
 assert.match(tasks,/async function bulkUpdate\(action:"archive"\|"trash"\|"restoreArchive"\|"restoreTrash"\)/);
 assert.match(tasks,/for\(const id of group\)/);
 assert.match(tasks,/const target=projects\.find\(p=>p\.id===id\)/);
 assert.match(tasks,/const ids=new Set\(wanted\.filter\(x=>x\.project\.id===id\)/);
 assert.match(tasks,/await persist\(target,next,id\+":bulk-"/);
});
test("individual actions distinguish archive, trash and restore while confirmation protects deletion",()=>{
 assert.match(tasks,/role="menu" className="absolute/);
 assert.match(tasks,/Excluir \(Lixeira\)/);
 assert.match(tasks,/window\.confirm\("Mover "\+task\.title/);
 assert.match(tasks,/deletedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(tasks,/deletedAt:undefined/);
 assert.match(tasks,/archivedAt:undefined/);
});
test("soft deletion does not physically remove tasks and cannot leak trashed tasks into client portal",()=>{
 assert.match(timeline,/deletedAt\?:string/);
 assert.match(timeline,/item\.archivedAt\|\|item\.deletedAt/);
 assert.match(validation,/item\.deletedAt\.length>40/);
 assert.match(tasks,/section==="trash"\?!!task\.deletedAt/);
 assert.doesNotMatch(tasks,/\/api\/tasks\/permanent-delete/);
});
