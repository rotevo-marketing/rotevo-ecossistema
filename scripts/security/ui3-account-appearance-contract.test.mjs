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
 assert.doesNotMatch(preference,/localStorage\\.(?:setItem|getItem|removeItem)/);
 assert.match(css,/html\[data-rotevo-appearance="dark"\] \.rv-ui3/);
 assert.match(css,/\.se-paper,\.bn-editor/);
 const boot=readFileSync(new URL("../../src/Components/operations/AccountAppearanceBootstrap.tsx",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../../src/app/admin/page.tsx",import.meta.url),"utf8");
 assert.match(admin,/NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED==="true"&&<AccountAppearanceBootstrap/);
 assert.match(client,/NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED==="true"&&<AccountAppearanceBootstrap/);
 assert.match(boot,/onAuthStateChange/);
 assert.match(boot,/rotevo-appearance-updated/);
 assert.match(boot,/document\.documentElement\.removeAttribute\("data-rotevo-appearance"\)/);
 assert.match(preference,/new CustomEvent\("rotevo-appearance-updated"/);
});

const luminance=(hex)=>[0,2,4].map(n=>Number.parseInt(hex.slice(n,n+2),16)/255)
 .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4)
 .reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
test("UI3 dark token contrast meets minimum WCAG 2.2 AA for visible text and controls",()=>{
 const css=readFileSync(new URL("../../src/app/rotevo-ui3.css",import.meta.url),"utf8");
 const scope=css.slice(css.lastIndexOf('/* UI3 appearance pilot'));
 const token=(name)=>{const m=scope.match(new RegExp('--rv3-'+name+':#([0-9a-fA-F]{6})'));assert.ok(m,name+" token missing");return m[1];};
 const surface=token('surface'),text=token('text'),muted=token('muted'),border=token('border'),accent=token('accent');
 assert.ok(ratio(text,surface)>=4.5,"dark normal text must meet AA");
 assert.ok(ratio(muted,surface)>=4.5,"dark metadata must meet AA");
 assert.ok(ratio(accent,surface)>=4.5,"dark links must meet AA");
 assert.ok(ratio(border,surface)>=3,"dark control borders must reach non-text 3:1");
});
