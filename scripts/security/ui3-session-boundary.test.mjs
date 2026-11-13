import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("session changes immediately lock both portals",()=>{
 const h=src("src/hooks/useSessionBoundary.ts");
 for(const s of ["onAuthStateChange","SIGNED_OUT","setBlocked(true)","visibilitychange","focus","profile.data?.role!==role"])assert.ok(h.includes(s));
 for(const p of ["src/app/admin/page.tsx","src/app/cliente/page.tsx"])assert.ok(src(p).includes("if(sessionBlocked)return <main"));
});
test("role mismatch never signs out the newly logged-in tab",()=>{
 const a=src("src/app/admin/page.tsx"),c=src("src/app/cliente/page.tsx");
 assert.doesNotMatch(a,/profileError \|\| profile\?\.role !== "strategist"\) \{\s*await supabase\.auth\.signOut/);
 assert.doesNotMatch(c,/if\(!profile\)\{await supabase\.auth\.signOut/);
 assert.doesNotMatch(c,/if\(profile\.role!=="client"\|\|!profile\.client_id\)\{await supabase\.auth\.signOut/);
});
test("conversation binds sender identity in browser and API",()=>{
 const ui=src("src/Components/shared/ProjectConversation.tsx"),api=src("src/app/api/collaboration/messages/route.ts");
 assert.ok(ui.includes("mountedAuthor.current"));assert.ok(ui.includes("expectedAuthorUserId"));assert.ok(api.includes("expectedAuthor!==session.userId"));
});
