import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
test("two-column responsive details dialog renders history and clearly deferred comments",()=>{
 assert.match(source,/role="dialog" aria-modal="true" aria-label="Detalhes da tarefa"/);
 assert.match(source,/lg:grid-cols-\[minmax\(0,1\.45fr\)_minmax\(320px,1fr\)\]/);
 assert.match(source,/aria-label="Atualizações e histórico da tarefa"/);
 assert.match(source,/\(selected\.task\.activityLog\?\?\[\]\)\.slice\(-30\)\.reverse\(\)/);
 assert.match(source,/ProjectConversation/);
});
test("existing protected updates are used for status, priority and people",()=>{
 assert.match(source,/onChange=\{value=>void updateTask\(selected\.project,selected\.task,\{status:value\}\)\}/);
 assert.match(source,/onChange=\{value=>void updateTask\(selected\.project,selected\.task,\{priority:value\}\)\}/);
 assert.match(source,/void updateTask\(selected\.project,selected\.task,\{ownerUserId:member\?\.user_id\?\?"",owner:member\?\.display_name\?\?""\}\)/);
 assert.match(source,/onClick=\{\(\)=>void saveDetails\(\)\}/);
});
