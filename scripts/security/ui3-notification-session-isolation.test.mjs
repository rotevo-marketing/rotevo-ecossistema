import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../../src/Components/shared/WorkflowNotificationBell.tsx",import.meta.url),"utf8");

test("notification state invalidates stale identity and in-flight requests",()=>{
 assert.match(source,/if\(identity\.current!==userId\)\{identity\.current=userId;revision\.current\+=1;\}/);
 assert.match(source,/const currentRevision=\+\+revision\.current/);
 assert.match(source,/if\(!isCurrent\(\)\)return;[\s\S]*?setNotices\(list\.notifications\)/);
 assert.match(source,/event==="SIGNED_OUT"[\s\S]*?revision\.current\+=1/);
});

test("notification writes verify actor identity and request generation",()=>{
 assert.match(source,/actor\.user\.id!==expected\|\|revision\.current!==atStart/);
 assert.match(source,/expectedAuthorUserId:expected/);
 assert.match(source,/identity\.current===expected&&revision\.current===atStart/);
});
