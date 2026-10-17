import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../../src/Components/admin/OperationalAgenda.tsx",import.meta.url),"utf8");
const validation=readFileSync(new URL("../../src/lib/security/executionDependencyValidation.ts",import.meta.url),"utf8");
test("agenda validates notes and owner field limits before submission",()=>{
 assert.match(ui,/editing\.notes\?\?""\)\.length>2000/);
 assert.match(ui,/editing\.owner\?\?""\)\.length>120/);
 assert.match(validation,/item\.notes\.length>2000/);
 assert.match(validation,/item\.owner\.length>120/);
});
