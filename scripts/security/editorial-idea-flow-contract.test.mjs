import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("idea approval is available on shared Idea without intermediate pending status",()=>{
 const modal=read("src/Components/cliente/EditorialCalendar.tsx");
 const idea=read("src/Components/cliente/EditorialIdeaDecision.tsx");
 assert.match(modal,/<EditorialIdeaDecision/);
 assert.match(idea,/\["idea","idea_pending"\]\.includes\(item\.status\)/);
 assert.match(idea,/Aprovar ideia/);
 assert.match(idea,/Solicitar ajustes/);
 assert.match(modal,/idea_changes:"Ajustes na ideia"/);
 assert.match(modal,/idea_approved:"Ideia aprovada"/);
 assert.doesNotMatch(modal,/idea_pending:"Ideia aguardando aprovação"/);
 assert.match(modal,/<ProjectConversation/);
 assert.match(modal,/<EditorialDecision/);
});
test("strategist cannot bypass formal approval; adjustment needs a new version",()=>{
 const api=read("src/app/api/admin/project/update/route.ts");
 const manager=read("src/Components/admin/EditorialManager.tsx");
 assert.match(api,/priorStatus==="idea_approved"/);
 assert.match(api,/approved\?\.decision!=="approved"/);
 assert.match(api,/priorStatus==="idea_changes"/);
 assert.match(api,/priorVersion===nextVersion/);
 assert.match(manager,/Aprovação formal exige uma decisão|A aprovação formal exige uma decisão/);
 assert.match(manager,/Envie a ideia ao cliente/);
 assert.match(manager,/Edite o direcionamento e crie uma nova versão/);
});
test("idea decision is transactional, scoped, versioned and blocks multi-account approval",()=>{
 const sql=read("docs/security/sql/editorial-idea-approval-state-transition-PROPOSAL-ONLY.sql");
 for(const part of ["security definer set search_path=''","auth.uid()","for update","editorial_idea_approvals","idea_approved","idea_changes","jsonb_set","v_content->>'visibleToClient'","count(*) from public.profiles","grant execute"]){
  assert.ok(sql.includes(part),part);
 }
 assert.match(sql,/v_content->>'status' not in \('idea','idea_pending'\)/);
 assert.match(sql,/updated_at=clock_timestamp\(\)/);
});
