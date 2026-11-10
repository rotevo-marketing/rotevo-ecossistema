import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const task=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
const cells=readFileSync(new URL("../../src/Components/admin/TaskGridCells.tsx",import.meta.url),"utf8");
const icons=readFileSync(new URL("../../src/Components/RotevoTablerIcon.tsx",import.meta.url),"utf8");
test("successful task creation locates item across clients and pages",()=>{
 assert.match(task,/setQuery\(task\.title\);setShowSearch\(true\);setPage\(1\)/);
 assert.match(task,/setQuery\(title\);setShowSearch\(true\);setPage\(1\)/);
 assert.match(task,/onChanged\(project\.id,result\.project\.data/);
});
test("archive is reversible and its controls are accessible",()=>{
 assert.match(task,/aria-label=\{\`Ações da tarefa/);
 assert.match(task,/window\.confirm\("Arquivar a tarefa/);
 assert.match(task,/void updateTask\(project,task,\{archivedAt:undefined\}\)/);
 assert.match(task,/void updateTask\(project,task,\{archivedAt:new Date\(\)\.toISOString\(\)\}\)/);
 assert.match(icons,/"archive":/);
 assert.match(icons,/"restore":/);
});
test("table separators, compact project avatar and orange overdue state",()=>{
 assert.match(task,/scope="col" key=\{name\} className="border-b border-r/);
 assert.match(task,/aria-label=\{`Abrir projeto/);
 assert.match(task,/const columnSpan=3\+columnKeys/);
 assert.match(task,/bg-\[#FFF2DC\]/);
});
test("Kanban offers smaller editable badges instead of duplicate priority labels",()=>{
 assert.match(task,/presentation=\{compact\?"board":"cell"\}/);
 assert.match(cells,/presentation\?:"cell"\|"detail"\|"board"/);
 assert.match(cells,/isBoard\?"min-h-8 justify-between/);
});
