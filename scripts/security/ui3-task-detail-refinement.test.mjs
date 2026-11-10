import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const task=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
const grid=readFileSync(new URL("../../src/Components/admin/TaskGridCells.tsx",import.meta.url),"utf8");
test("task detail title and description are editable without permanent input frames",()=>{
 assert.match(task,/aria-label="Título da tarefa"/);
 assert.match(task,/border border-transparent bg-transparent px-1 py-2 text-xl/);
 assert.match(task,/hover:border-\[#DCE2ED\] focus:border-\[#A897ED\]/);
});
test("detail properties reuse full-label inline dropdowns without affecting table cells",()=>{
 assert.match(grid,/presentation\?:"cell"\|"detail"/);
 assert.match(grid,/const isDetail=presentation==="detail"/);
 assert.match(grid,/isDetail&&<span className="truncate font-medium">/);
 assert.match(task,/TaskDropdown presentation="detail" label=\{\`Situação de/);
 assert.match(task,/TaskDropdown presentation="detail" label=\{\`Responsável por/);
 assert.match(task,/TaskDropdown presentation="detail" label=\{\`Prioridade de/);
 assert.match(task,/onChange=\{value=>void updateTask\(selected\.project,selected\.task,\{status:value\}\)\}/);
});
test("checklist progress and operational sections remain editable",()=>{
 assert.match(task,/detailDraft\.checklist\.filter\(item=>item\.done\)\.length/);
 assert.match(task,/onClick=\{\(\)=>void saveDetails\(\)\}/);
 assert.match(task,/O envio de mensagens ainda não está habilitado/);
});
