import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base=new URL("../../src/",import.meta.url);
const admin=readFileSync(new URL("app/admin/page.tsx",base),"utf8");
const menu=readFileSync(new URL("Components/admin/AdminUserMenu.tsx",base),"utf8");
const tasks=readFileSync(new URL("Components/admin/CentralTarefas.tsx",base),"utf8");
test("admin header uses account menu with profile display name",()=>{
 assert.match(admin,/AdminUserMenu email=\{userEmail\} name=\{userName\} avatarUrl=\{userAvatar\}/);
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

test("password change recovers from network errors and re-enables controls",()=>{
 assert.match(menu,/catch\{/);
 assert.match(menu,/Falha de conexão ao alterar a senha/);
 assert.match(menu,/finally\{/);
 assert.match(menu,/setBusy\(false\)/);
});

test("account menu dismisses with outside click or Escape and restores keyboard focus",()=>{
 assert.match(menu,/document\.addEventListener\("pointerdown",closeOutside\)/);
 assert.match(menu,/document\.addEventListener\("keydown",escape\)/);
 assert.match(menu,/event\.key==="Escape"/);
 assert.match(menu,/triggerRef\.current\?\.focus\(\)/);
 assert.match(menu,/aria-expanded=\{open\}/);
});

test("in-progress projects are included in production counts and filters",()=>{
 assert.match(admin,/project\.status === "draft" \|\| project\.status === "in_progress"/);
 assert.match(admin,/statusFilter === "draft" && project\.status !== "draft" && project\.status !== "in_progress"/);
 assert.match(admin,/statusFilter === "published" && project\.status !== "published"/);
});

test("admin profile photo is optional and uses the existing account menu",()=>{
 assert.match(admin,/\.select\("avatar_url"\)/);
 assert.match(admin,/setUserAvatar\(/);
 assert.match(menu,/avatarUrl\?<img/);
 assert.match(menu,/initials\|\|"U"/);
});
test("tasks dashboard includes today's deadlines and meeting agenda",()=>{
 assert.match(tasks,/Minha visão do dia/);
 assert.match(tasks,/Agenda de hoje/);
 assert.match(tasks,/todayAppointments/);
 assert.match(tasks,/setDeadline\("today"\)/);
 assert.match(tasks,/setDeadline\("overdue"\)/);
 assert.match(tasks,/task\.visibleToClient===true\?"Visível ao cliente":"Uso interno"/);
});

test("daily tasks layout does not render escaped newline artifacts",()=>{
 assert.doesNotMatch(tasks,/\\\\n\s*<div/);
 assert.doesNotMatch(tasks,/\\\\n\s*<\/section>/);
});
test("failed admin API loads show a retry rather than false zero project totals",()=>{
 assert.match(admin,/errorMessage && !isLoading && <div role="alert"/);
 assert.match(admin,/onClick=\{\(\)=>void loadAdminData\(\)\}/);
 assert.match(admin,/workspaceTab==="projects" && !errorMessage &&/);
});
