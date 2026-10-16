import test from "node:test";
import assert from "node:assert/strict";
import {validExecutionDependencies as valid,validOperationalDate,validOperationalTime} from "../../src/lib/security/executionDependencyValidation.ts";

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

test("operational agenda accepts valid optional times and rejects invalid clocks",()=>{
 const event={id:"meeting-1",title:"Alinhamento",kind:"meeting",date:"2026-11-15",status:"planned"};
 assert.equal(valid({operationalAgenda:[{...event,time:"09:30"}]}),true);
 assert.equal(valid({operationalAgenda:[{...event,time:""}]}),true);
 for(const time of ["24:00","09:65","noon","9:30"])assert.equal(valid({operationalAgenda:[{...event,time}]}),false);
});

test("shared agenda time validator accepts standard HH:MM and rejects malformed values",()=>{
 for(const time of ["00:00","09:30","12:45","23:59"])assert.equal(validOperationalTime(time),true);
 for(const time of ["24:00","09:65","9:30","noon","23:60",""])assert.equal(validOperationalTime(time),false);
});

test("calendar date validation rejects impossible dates and accepts leap days",()=>{
 for(const date of ["2026-10-16","2024-02-29","2000-02-29"])assert.equal(validOperationalDate(date),true);
 for(const date of ["2026-02-29","2026-02-30","2026-04-31","2026-13-01","0000-01-01","2026-00-10"])assert.equal(validOperationalDate(date),false);
});

test("execution tasks reject impossible dates and an inverted delivery window",()=>{
 assert.equal(valid(project({...task("a"),startDate:"2026-10-16",dueDate:"2026-10-20"})),true);
 assert.equal(valid(project({...task("a"),startDate:"2026-02-30"})),false);
 assert.equal(valid(project({...task("a"),dueDate:"2026-13-01"})),false);
 assert.equal(valid(project({...task("a"),startDate:"2026-10-20",dueDate:"2026-10-16"})),false);
});

test("execution tasks reject unsupported statuses and kinds",()=>{
 assert.equal(valid(project({...task("a"),status:"completed",kind:"task"})),true);
 assert.equal(valid(project({...task("a"),status:"invented"})),false);
 assert.equal(valid(project({...task("a"),kind:"unknown"})),false);
});
