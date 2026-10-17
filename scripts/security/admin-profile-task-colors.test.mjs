import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base=new URL("../../src/",import.meta.url);
const admin=readFileSync(new URL("app/admin/page.tsx",base),"utf8");
const menu=readFileSync(new URL("Components/admin/AdminUserMenu.tsx",base),"utf8");
const tasks=readFileSync(new URL("Components/admin/CentralTarefas.tsx",base),"utf8");
test("admin header uses account menu with profile display name",()=>{
 assert.match(admin,/AdminUserMenu email=\{userEmail\} name=\{userName\}/);
 assert.match(admin,/\.select\("role,full_name"\)/);
});
test("account menu offers password change and logout",()=>{
 assert.match(menu,/auth\.updateUser\(\{password\}\)/);
 assert.match(menu,/password\.length<12/);
 assert.match(menu,/password!==confirm/);
 assert.match(menu,/onLogout\(\)/);
});
test("task status cards have semantically distinct palettes",()=>{
 for(const color of ["#F5F3FF","#EFF6FF","#FEF2F2","#FFFBEB","#FFF7ED"])assert.ok(tasks.includes(color),color);
});
