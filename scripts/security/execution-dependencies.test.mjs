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

test("rejects completion while a prerequisite is pending, and reopening a completed prerequisite",()=>{
 assert.equal(valid(project({...task("a"),status:"planned"},{...task("b",["a"]),status:"completed"})),false);
 assert.equal(valid(project({...task("a"),status:"completed"},{...task("b",["a"]),status:"completed"})),true);
 assert.equal(valid(project({...task("a"),status:"in_progress"},{...task("b",["a"]),status:"in_progress"})),true);
 assert.equal(valid(project({...task("a"),status:"completed"},{...task("b",["a"]),status:"planned"})),true);
});

test("task priority accepts supported values and rejects invalid values",()=>{
 for(const priority of ["low","normal","high","urgent"])assert.equal(valid(project({...task("a"),priority})),true);
 assert.equal(valid(project({...task("a"),priority:"extreme"})),false);
});

test("operational meetings and followups require valid dates and linked tasks",()=>{
 const event={id:"agenda-1",title:"Reunião estratégica",kind:"meeting",status:"planned",date:"2026-11-02",relatedTaskId:"a"};
 assert.equal(valid({...project(task("a")),operationalAgenda:[event]}),true);
 assert.equal(valid({...project(task("a")),operationalAgenda:[{...event,relatedTaskId:"other"}]}),false);
 assert.equal(valid({...project(task("a")),operationalAgenda:[{...event,kind:"random"}]}),false);
 assert.equal(valid({...project(task("a")),operationalAgenda:[event,{...event}]}),false);
 assert.equal(valid({...project(task("a")),operationalAgenda:[{...event,date:"invalid"}]}),false);
});
