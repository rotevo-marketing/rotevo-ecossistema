import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const route=readFileSync(new URL("../../src/app/api/account/appearance/route.ts",import.meta.url),"utf8");
const sql=readFileSync(new URL("../../docs/security/sql/ui3-account-appearance-PROPOSAL-ONLY.sql",import.meta.url),"utf8");
test("appearance endpoints are disabled by default and require current authenticated identity",()=>{
 assert.match(route,/ROTEVO_APPEARANCE_ENABLED!=="true"/);
 assert.match(route,/client\.auth\.getUser\(token\)/);
 assert.match(route,/data\.user\.id!==expectedUserId/);
 assert.match(route,/rotevo_password_reset_required/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});
test("appearance accepts only system light dark and does not alter existing profile fields",()=>{
 assert.match(route,/appearance!=="light"&&appearance!=="dark"&&appearance!=="system"/);
 assert.match(sql,/appearance in \('light','dark','system'\)/);
 assert.match(sql,/on conflict\(user_id\) do update/);
 assert.doesNotMatch(sql,/set .*display_name=|set .*avatar_asset_id=/i);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/revoke all on function public\.rotevo_account_appearance_set/);
});

test("appearance menu is shared by strategist and client but remains disabled without flags",()=>{
 const menu=readFileSync(new URL("../../src/Components/admin/AdminUserMenu.tsx",import.meta.url),"utf8");
 const client=readFileSync(new URL("../../src/app/cliente/page.tsx",import.meta.url),"utf8");
 const preference=readFileSync(new URL("../../src/Components/operations/AccountAppearancePreference.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../../src/app/rotevo-ui3.css",import.meta.url),"utf8");
 assert.match(menu,/NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED==="true"/);
 assert.match(client,/NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED==="true"/);
 assert.match(preference,/supabase\.auth\.getUser\(\)/);
 assert.match(preference,/expectedAuthorUserId:user/);
 assert.match(preference,/prefers-color-scheme: dark/);
 assert.doesNotMatch(preference,/localStorage/);
 assert.match(css,/html\[data-rotevo-appearance="dark"\] \.rv-ui3/);
 assert.match(css,/\.se-paper,\.bn-editor/);
});
