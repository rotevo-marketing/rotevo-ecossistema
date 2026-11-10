import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/lib/operations/taskGrouping.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};vm.runInNewContext(compiled,{module,exports:module.exports});
const group=module.exports.groupTaskRows;
const items=[{project:{id:"b"},id:1},{project:{id:"a"},id:2},{project:{id:"b"},id:3}];
test("headers and task order remain stable within project",()=>{
 const rows=group(items,{},"project");
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="header"),x=>[x.project.id,x.count]),[["b",2],["a",1]]);
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="item"),x=>x.item.id),[1,3,2]);
});
test("collapsing one project does not delete or modify tasks",()=>{
 const rows=group(items,{b:true},"project");
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="item"),x=>x.item.id),[2]);
 assert.equal(items.length,3);
});
test("flat mode preserves incoming order and ignores collapsed state",()=>{
 const rows=group(items,{b:true},"flat");
 assert.deepEqual(Array.from(rows,x=>x.item.id),[1,2,3]);
});
test("empty view produces no headers",()=>assert.equal(group([],{},"project").length,0));
