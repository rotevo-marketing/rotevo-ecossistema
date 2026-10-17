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
 for(const color of ["#DCEBFF","#FFF1D4","#DFF6E7","#FFE4E6","#EEEAFE"])assert.ok(tasks.includes(color),color);
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
 assert.match(tasks,/Reuniões hoje/);
 assert.match(tasks,/todayAppointments/);
 assert.match(tasks,/setDeadline\("today"\)/);
 assert.match(tasks,/setDeadline\("overdue"\)/);
 assert.match(tasks,/visibleToClient:false/);
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

test("central task table has six meaningful columns and compact controls",()=>{
 for(const col of ["Tarefa","Projeto","Responsável","Situação","Prioridade","Prazo"])assert.ok(tasks.includes('"'+col+'"'),col);
 for(const term of ["Nova tarefa","Filtrar projeto","Filtrar responsável","Filtrar prioridade","Buscar tarefas","Ordenar tarefas","Kanban"])assert.ok(tasks.includes(term),term);
 assert.match(tasks,/value="all">Todos os projetos/);
 assert.match(tasks,/href=\{projectLink\(project\)\}/);
 assert.match(tasks,/visibleToClient:false/);
 assert.match(tasks,/expectedUpdatedAt:project.updated_at/);
 assert.match(tasks,/\/api\/admin\/project\/update/);
});

test("task details open from list and kanban and save through protected project API",()=>{
 assert.match(tasks,/onClick=\{\(\)=>openDetails\(\{task,project,client\}\)\}/);
 assert.match(tasks,/onClick=\{\(\)=>openDetails\(x\)\}/);
 assert.match(tasks,/aria-label="Detalhes da tarefa"/);
 assert.match(tasks,/onClick=\{\(\)=>void saveDetails\(\)\}/);
 assert.match(tasks,/visibleToClient:detailDraft.visibleToClient/);
 assert.match(tasks,/expectedUpdatedAt:project.updated_at/);
 assert.match(tasks,/new URL\(driveUrl\).protocol!=="https:"/);
 assert.match(tasks,/Material no Google Drive/);
});
test("task operations use the selected official Tabler icons",()=>{
 const icons=readFileSync(new URL("Components/RotevoTablerIcon.tsx",base),"utf8");
 for(const icon of ["square-rounded-plus","search","filter","user-check","folder","arrows-sort","list","layout-kanban","calendar-week","flag","link","message-circle","circle-check","view-360-arrow","history","x"])assert.ok(icons.includes('"'+icon+'"'),icon);
 for(const icon of ["square-rounded-plus","search","filter","arrows-sort","list","layout-kanban","calendar-week","flag","folder","user-check","link","message-circle","circle-check","view-360-arrow","history","x"])assert.ok(tasks.includes('name="'+icon+'"'),icon);
});
