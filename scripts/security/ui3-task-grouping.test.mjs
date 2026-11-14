import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/lib/operations/taskGrouping.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};vm.runInNewContext(compiled,{module,exports:module.exports});
const group=module.exports.groupTaskRows;
const clientA={id:"a",name:"Cliente A"},clientB={id:"b",name:"Cliente B"};
const items=[{project:{id:"p1",title:"Estratégia"},client:clientA,id:1},{project:{id:"p2",title:"Execução"},client:clientA,id:2},{project:{id:"p3",title:"Planejamento"},client:clientB,id:3}];
test("default visual grouping consolidates all projects for same client",()=>{
 const rows=group(items,{});
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="header"),x=>[x.key,x.label,x.count]),[["client:a","Cliente A",2],["client:b","Cliente B",1]]);
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="item"),x=>x.item.id),[1,2,3]);
});
test("collapsing one client does not modify records or hide other clients",()=>{
 const rows=group(items,{"client:a":true},"client");
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="item"),x=>x.item.id),[3]);
 assert.equal(items.length,3);
});
test("project grouping remains an optional view",()=>{
 const rows=group(items,{},"project");
 assert.deepEqual(Array.from(rows.filter(x=>x.kind==="header"),x=>x.key),["project:p1","project:p2","project:p3"]);
});
test("flat view preserves sorted input order without headers",()=>{
 assert.deepEqual(Array.from(group(items,{"client:a":true},"flat"),x=>x.item.id),[1,2,3]);
});
test("unlinked projects remain separate, empty lists remain empty",()=>{
 const orphan=[{project:{id:"x"},client:null},{project:{id:"y"},client:null}];
 assert.deepEqual(Array.from(group(orphan,{}),x=>x.key??"item"),["unlinked:x","item","unlinked:y","item"]);
 assert.equal(group([],{}).length,0);
});
