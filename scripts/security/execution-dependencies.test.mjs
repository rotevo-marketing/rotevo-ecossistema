import test from "node:test";
import assert from "node:assert/strict";
import {validExecutionDependencies as valid} from "../../src/lib/security/executionDependencyValidation.ts";

const task=(id,dependencies=[])=>({id,title:id,dependencies});
const project=(...items)=>({executionTimeline:items});

test("accepts projects without timelines and acyclic prerequisite chains",()=>{
 assert.equal(valid({}),true);
 assert.equal(valid(project(task("a"),task("b",["a"]),task("c",["b"]))),true);
 assert.equal(valid(project()),true);
});
test("rejects self cycles, indirect cycles and nonexistent prerequisites",()=>{
 assert.equal(valid(project(task("a",["a"]))),false);
 assert.equal(valid(project(task("a",["b"]),task("b",["a"]))),false);
 assert.equal(valid(project(task("a",["b"]),task("b",["c"]),task("c",["a"]))),false);
 assert.equal(valid(project(task("a",["missing"]))),false);
});
test("rejects duplicate ids, duplicate prerequisites, malformed timelines",()=>{
 assert.equal(valid(project(task("a"),task("a"))),false);
 assert.equal(valid(project(task("a"),task("b",["a","a"]))),false);
 assert.equal(valid({executionTimeline:{}}),false);
 assert.equal(valid(project({title:"missing identifier"})),false);
});
