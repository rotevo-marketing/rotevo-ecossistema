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

test("client editorial calendar uses local year/month across UTC day boundaries",()=>{
 const source=readFileSync(new URL("Components/cliente/EditorialCalendar.tsx",root),"utf8");
 assert.match(source,/d\.getFullYear\(\)/);
 assert.match(source,/d\.getMonth\(\)\+1/);
 assert.doesNotMatch(source,/toISOString\(\)\.slice\(0,7\)/);
 assert.match(source,/new Date\(y,m-2,1\)/);
 assert.match(source,/new Date\(y,m,1\)/);
});

test("editor explains that revised content needs a new version after client decision",()=>{
 const source=readFileSync(new URL("Components/admin/EditorialManager.tsx",root),"utf8");
 assert.match(source,/const decided=decisions\.some\(row=>row\.content_id===editing\.id/);
 assert.match(source,/row\.content_version===\(editing\.version\?\?""\)/);
 assert.match(source,/original\.version===editing\.version&&materialFields\.some/);
 assert.match(source,/Informe um novo número de versão antes de alterar o material/);
});
