import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const calendar=read("../../src/Components/cliente/EditorialCalendar.tsx");
const manager=read("../../src/Components/admin/EditorialManager.tsx");
const client=read("../../src/Components/cliente/ClientContent.tsx");
const decision=read("../../src/Components/cliente/EditorialDecision.tsx");
const validator=read("../../src/lib/security/executionDependencyValidation.ts");
test("saved content reveals its channel and month without adding phantom channels",()=>{
 assert.match(calendar,/scopedItems\.filter\(i=>projectFilter==="all"\|\|i\.projectId===projectFilter\)/);
 assert.match(calendar,/contentScope==="trash"/);
 assert.match(calendar,/onLifecycleChange/);
 assert.match(client,/!i\.archivedAt&&!i\.deletedAt/);
 assert.match(calendar,/setChannelFilter\(focusItem\.channel\)/);
 assert.match(manager,/setFocusItem\(\{projectId:target\.id/);
 assert.match(manager,/onChanged\(target\.id,result\.project\.data/);
});
test("content creation is centered and preserves protected save and conflict checks",()=>{
 assert.match(manager,/aria-label="Editor de conteúdo"/);
 assert.match(manager,/flex items-center justify-center p-2 sm:p-5/);
 assert.match(manager,/max-w-\[1080px\]/);
 assert.match(manager,/expectedUpdatedAt:target\.updated_at/);
 assert.match(manager,/response\.status===409/);
});
test("editorial list is grouped by customer and offers six requested columns",()=>{
 assert.match(calendar,/groupedList=new Map/);
 for(const col of ["Conteúdo","Projeto","Responsável","Situação","Prioridade","Prazo"])assert.ok(calendar.includes(col));
 assert.match(calendar,/aria-label="Filtrar conteúdos por canal"/);
 assert.match(calendar,/onClick=\{\(\)=>setSelected\(item\.projectId\+":"\+item\.id\)\}/);
});
test("task-like editorial metadata is optional and bounded on server",()=>{
 assert.match(calendar,/owner\?:string;ownerUserId\?:string;ownerAvatarUrl\?:string;priority\?:"low"/);
 assert.match(calendar,/kind="people"/);
 assert.match(calendar,/clientPhotos/);
 assert.match(manager,/team_members/);
 assert.match(manager,/ownerUserId,owner/);
 assert.match(manager,/value=\{editing\.ownerUserId\?\?""\}/);
 assert.match(manager,/value=\{editing\.priority\?\?"normal"\}/);
 assert.match(validator,/const editorial=root\.editorialCalendar/);
 assert.match(validator,/item\.owner\.length>120/);
});
test("client and strategist details are two-pane, keeping formal approvals separated from editable operational status",()=>{
 assert.match(calendar,/aria-label="Atualizações e aprovações do conteúdo"/);
 assert.match(client,/aria-label="Solicitações e aprovações"/);
 assert.match(client,/EditorialIdeaDecision/);
 assert.match(client,/EditorialDecision/);
 assert.match(decision,/rpc\("rotevo_editorial_decide"/);
 assert.match(manager,/A aprovação formal exige uma decisão registrada no fluxo do cliente/);
 assert.match(calendar,/editorialStatusOptions/);
 assert.match(calendar,/disabled=\{\["approved","changes_requested","idea_approved"\]\.includes\(active\.status\)\}/);
 assert.match(calendar,/Rotevo · Detalhes do conteúdo/);
 assert.match(client,/visibleToClient===true/);
});
test("bidirectional comments use the shared component rather than an unsafe direct client writer",()=>{
 assert.match(calendar,/ProjectConversation/);
 assert.match(client,/ProjectConversation/);
 assert.doesNotMatch(manager,/\/api\/editorial\/comments/);
});
