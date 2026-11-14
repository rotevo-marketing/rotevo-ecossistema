import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 canTransitionEditorial, canTransitionClientAction, isFormalDecisionDue,
 resultOfFormalDecision, validateEditorialDates, validateTaskDates,
 assignedToClient, isLegacyIdeaPending, validLocalDate
} from "../../src/lib/workflow/ui3OperationalContracts.ts";

test("idea approval does not automatically start production",()=>{
 assert.equal(resultOfFormalDecision("idea","approved"),"idea_approved");
 assert.equal(canTransitionEditorial("idea","production"),false);
 assert.equal(canTransitionEditorial("idea_approved","production"),true);
});
test("idea correction is distinct from final correction",()=>{
 assert.equal(resultOfFormalDecision("idea","changes_requested"),"idea_changes");
 assert.equal(resultOfFormalDecision("final","changes_requested"),"changes_requested");
 assert.equal(canTransitionEditorial("idea_changes","idea"),true);
 assert.equal(canTransitionEditorial("awaiting_client","idea_approved"),false);
});
test("legacy pending state is read-compatible, never a new transition",()=>{
 assert.equal(isLegacyIdeaPending("idea_pending"),true);
 assert.equal(canTransitionEditorial("idea","idea_pending"),false);
 assert.equal(isFormalDecisionDue("idea","idea",true),true);
 assert.equal(isFormalDecisionDue("idea_pending","idea",true),true);
 assert.equal(isFormalDecisionDue("idea","idea",false),false);
 assert.equal(isFormalDecisionDue("idea","final",true),false);
});
test("assignments require account identity, not visibility",()=>{
 assert.equal(assignedToClient("client-user-1","client-user-1"),true);
 assert.equal(assignedToClient("client-user-1","client-user-2"),false);
 assert.equal(assignedToClient(null,"client-user-1"),false);
});
test("client submission cannot approve or publish global content",()=>{
 assert.equal(canTransitionClientAction("pending","submitted"),true);
 assert.equal(canTransitionClientAction("submitted","validated"),true);
 assert.equal(canTransitionClientAction("submitted","correction_requested"),true);
 assert.equal(canTransitionClientAction("validated","submitted"),false);
 assert.equal(canTransitionEditorial("production","published"),false);
});
test("dates are independent and launch is optional",()=>{
 assert.deepEqual(validateEditorialDates({deadlineDate:"2026-11-18",publishDate:"2026-11-20"}),[]);
 assert.deepEqual(validateTaskDates({dueDate:"2026-11-16",launchDate:null}),[]);
 assert.deepEqual(validateTaskDates({dueDate:"2026-11-18",launchDate:"2026-11-20"}),[]);
 assert.equal(validateEditorialDates({deadlineDate:"2026-11-21",publishDate:"2026-11-20"}).length,1);
 assert.equal(validateTaskDates({dueDate:"2026-11-21",launchDate:"2026-11-20"}).length,1);
 assert.equal(validLocalDate("2026-02-29"),false);
 assert.equal(validLocalDate("2028-02-29"),true);
});

test("task launch is optional, stored independently and never drives overdue alerts",()=>{
 const tasks=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
 const timeline=readFileSync(new URL("../../src/Components/cliente/ProjectTimeline.tsx",import.meta.url),"utf8");
 const api=readFileSync(new URL("../../src/app/api/admin/project/update/route.ts",import.meta.url),"utf8");
 assert.match(timeline,/launchDate\?:string/);
 assert.match(tasks,/launchDate:draft\.launchDate\|\|undefined/);
 assert.match(tasks,/launchDate:detailDraft\.launchDate\|\|undefined/);
 assert.match(tasks,/validateTaskDates\(\{dueDate:draft\.dueDate,launchDate:draft\.launchDate\}\)/);
 assert.match(tasks,/task\.dueDate<today\(\)/);
 assert.match(tasks,/visibleColumns\.launch/);
 assert.match(tasks,/Lançamento de \$\{task\.title\}/);
 assert.match(api,/task\.dueDate>task\.launchDate/);
 assert.match(api,/task\.launchDate===prior\?\.launchDate&&task\.dueDate===prior\?\.dueDate/);
});
