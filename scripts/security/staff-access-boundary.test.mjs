import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const login=read("../../src/app/estrategista/login/page.tsx");
const api=read("../../src/app/api/team/my-access/route.ts");
const invite=read("../../src/app/api/team/invite/route.ts");
const sql=read("../../supabase/migrations/20261016_staff_role_legacy_boundary.sql");
test("staff never gets legacy admin routing",()=>{
 assert.match(login,/profile\?\.role === "staff"/);
 assert.match(login,/router\.replace\("\/equipe\/meu-acesso"\)/);
 assert.match(login,/profile\?\.role !== "strategist"/);
});
test("restricted staff access requires a verified JWT, staff profile and active membership",()=>{
 assert.match(api,/auth\.getUser\(token\.slice\(7\)\)/);
 assert.match(api,/profile\?\.role!=="staff"/);
 assert.match(api,/!member\?\.active/);
 assert.match(api,/rotevo_password_reset_required===true/);
 assert.doesNotMatch(api,/\.select\("id,title,data"/);
});
test("staff registration and database constraints disallow legacy strategist inheritance",()=>{
 assert.match(invite,/role: "staff"/);
 assert.match(sql,/role in \('strategist','client','staff'\)/);
 assert.match(sql,/revoke update on public\.profiles from anon,authenticated/);
});

test("only explicitly assigned projects with read permission expose titles",()=>{
 assert.match(api,/permitted\.includes\("projects\.read"\)&&ids\.length>0/);
 assert.match(api,/\.select\("id,title"\)\.in\("id",ids\)/);
 assert.doesNotMatch(api,/\.select\("\*"\)/);
});
