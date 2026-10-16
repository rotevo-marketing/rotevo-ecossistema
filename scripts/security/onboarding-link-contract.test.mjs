import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../src/app/api/admin/project/update/route.ts",import.meta.url),"utf8");
const editor=readFileSync(new URL("../../src/Components/admin/ProjectOnboarding.tsx",import.meta.url),"utf8");
test("onboarding links are checked in both API and editor",()=>{
 assert.match(source,/parsed\.protocol!=="https:"/);
 assert.match(editor,/new URL\(link\)\.protocol!=="https:"/);
});
test("the onboarding editor normalizes optional links before saving",()=>{
 assert.match(editor,/link:x\.link\?\.trim\(\)\|\|undefined/);
});
