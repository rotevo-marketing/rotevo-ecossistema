import test from "node:test";
import assert from "node:assert/strict";
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
