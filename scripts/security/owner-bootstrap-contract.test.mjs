import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../../supabase/migrations/20261016_bootstrap_rotevo_owner.sql",import.meta.url),"utf8");
test("bootstrap identifies the corporate owner by matching profile and auth identity",()=>{
 assert.match(sql,/join auth\.users u on u\.id=p\.id/);
 assert.match(sql,/lower\(p\.email\)='contato@rotevo\.com\.br'/);
 assert.match(sql,/lower\(u\.email\)='contato@rotevo\.com\.br'/);
 assert.match(sql,/p\.full_name='Otávio Silva'/);
 assert.match(sql,/p\.role='strategist'/);
});
test("bootstrap refuses replacing existing unrelated administrators or non-admin member rows",()=>{
 assert.match(sql,/role='admin' and user_id<>owner_id/);
 assert.match(sql,/where public\.team_members\.role='admin'/);
 assert.match(sql,/Owner membership conflicts/);
 assert.match(sql,/into strict owner_id/);
});
