import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../../src/",import.meta.url);
test("editorial entries use semantic calendar validation, not date-shaped regex only",()=>{
 const source=readFileSync(new URL("Components/admin/EditorialManager.tsx",root),"utf8");
 assert.match(source,/import \{validOperationalDate\} from/);
 assert.match(source,/validOperationalDate\(editing\.publishDate\)/);
});
test("calendar date validator rejects nonexistent leap and month days",()=>{
 const source=readFileSync(new URL("lib/security/executionDependencyValidation.ts",root),"utf8");
 assert.match(source,/const leap=/);
 assert.match(source,/return day<=days\[month-1\]/);
});
