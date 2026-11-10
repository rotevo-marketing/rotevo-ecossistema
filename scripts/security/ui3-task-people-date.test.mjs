import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const grid=readFileSync(new URL("../../src/Components/admin/TaskGridCells.tsx",import.meta.url),"utf8");
const tasks=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
test("people column uses compact avatar-only trigger with accessible full name",()=>{
 assert.match(grid,/kind==="people"\?<TaskAvatar/);
 assert.match(grid,/aria-label=\{label\}/);
 assert.match(grid,/kind==="people"\?"min-h-9 justify-center/);
});
test("due date uses edit popover with apply and clear, without an implicit write on opening",()=>{
 assert.match(grid,/export function TaskDueDateCell/);
 assert.match(grid,/aria-haspopup="dialog"/);
 assert.match(grid,/type="date" value=\{draft\}/);
 assert.match(grid,/onClick=\{\(\)=>save\(draft\)\}/);
 assert.match(grid,/onClick=\{\(\)=>save\(""\)\}/);
 assert.match(grid,/if\(next!==value\)onChange\(next\)/);
});
test("due date persists through existing authorized updateTask, not direct database calls",()=>{
 assert.match(tasks,/TaskDueDateCell label=\{\`Prazo de/);
 assert.match(tasks,/onChange=\{dueDate=>void updateTask\(project,task,\{dueDate\}\)\}/);
});
