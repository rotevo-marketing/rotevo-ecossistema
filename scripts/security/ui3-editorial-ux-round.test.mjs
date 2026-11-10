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
 assert.match(calendar,/items\.filter\(i=>projectFilter==="all"\|\|i\.projectId===projectFilter\)/);
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
 assert.match(calendar,/groupedList=Object\.entries\(listItems\.reduce/);
 for(const col of ["Conteúdo","Projeto","Responsável","Situação","Prioridade","Prazo"])assert.ok(calendar.includes(col));
 assert.match(calendar,/aria-label="Filtrar conteúdos por canal"/);
 assert.match(calendar,/onClick=\{\(\)=>setSelected\(item\.projectId\+":"\+item\.id\)\}/);
});
test("task-like editorial metadata is optional and bounded on server",()=>{
 assert.match(calendar,/owner\?:string;priority\?:"low"/);
 assert.match(manager,/value=\{editing\.owner\?\?""\}/);
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
 assert.match(calendar,/disabled=\{\["approved","changes_requested","idea_approved"\]\.includes\(status\)\}/);
 assert.match(client,/visibleToClient===true/);
});
test("bidirectional comments remain explicitly gated, not deceptive or client writable",()=>{
 assert.match(calendar,/Conversas bidirecionais ainda não estão habilitadas/);
 assert.match(client,/Conversas em tempo real e respostas encadeadas ainda não estão habilitadas/);
 assert.doesNotMatch(manager,/\/api\/editorial\/comments/);
});
