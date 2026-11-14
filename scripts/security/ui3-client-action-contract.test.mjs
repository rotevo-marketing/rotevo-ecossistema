import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseClientActionCreate,parseClientActionList,parseClientActionSubmit,parseClientActionReview,parseClientActionSubmitAsset} from "../../src/lib/workflow/clientActionsContract.ts";

const base={
 projectId:"00000000-0000-4000-8000-000000000011",
 resourceType:"content",resourceId:"content-1",resourceVersion:"01",
 clientUserId:"00000000-0000-4000-8000-000000000012",
 actionType:"record_video",instructions:"Gravar vídeo de apresentação",
 dueDate:"2026-11-20",requestKey:"assignment-synthetic-001",
 expectedAuthorUserId:"00000000-0000-4000-8000-000000000013"
};
test("create contract accepts explicit project/resource/user/version with calendar-valid date",()=>{
 assert.equal(parseClientActionCreate(base)?.resourceVersion,"01");
 assert.equal(parseClientActionCreate({...base,dueDate:null})?.dueDate,null);
 assert.equal(parseClientActionCreate({...base,dueDate:"2026-02-30"}),null);
 assert.equal(parseClientActionCreate({...base,dueDate:"2028-02-29"})?.dueDate,"2028-02-29");
});
test("create rejects unknown fields, invalid types and content without version",()=>{
 for(const data of [
  {...base,resourceType:"other"}, {...base,actionType:"publish_content"},
  {...base,resourceVersion:null},{...base,clientUserId:"not-uuid"},
  {...base,expectedAuthorUserId:""},{...base,requestKey:"bad"},
  {...base,privateStoragePath:"tenant/file"},{...base,instructions:""}
 ]) assert.equal(parseClientActionCreate(data),null);
 assert.equal(parseClientActionCreate({...base,resourceType:"task",resourceVersion:null})?.resourceType,"task");
});
test("list query rejects tenantless or userless requests",()=>{
 assert.equal(parseClientActionList({projectId:base.projectId,expectedAuthorUserId:base.expectedAuthorUserId})?.projectId,base.projectId);
 assert.equal(parseClientActionList({projectId:base.projectId}),null);
 assert.equal(parseClientActionList({projectId:base.projectId,expectedAuthorUserId:base.expectedAuthorUserId,all:true}),null);
});
test("API fails closed by default and relies on SQL authorization, not service role",()=>{
 const source=readFileSync(new URL("../../src/app/api/workflow/client-actions/route.ts",import.meta.url),"utf8");
 assert.match(source,/ROTEVO_CLIENT_ACTIONS_ENABLED!=="true"/);
 assert.match(source,/client\.auth\.getUser\(token\)/);
 assert.match(source,/data\.user\.id!==expectedUserId/);
 assert.match(source,/rotevo_client_action_create/);
 assert.match(source,/rotevo_client_action_list/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("submissions bind UUID, idempotency key and note to account identity",()=>{
 const good={assignmentId:base.projectId,expectedAuthorUserId:base.expectedAuthorUserId,
  requestKey:"submission-request-001",note:"Vídeo enviado para revisão"};
 assert.equal(parseClientActionSubmit(good)?.assignmentId,base.projectId);
 assert.equal(parseClientActionSubmit({...good,note:""}),null);
 assert.equal(parseClientActionSubmit({...good,assignmentId:"invalid"}),null);
 assert.equal(parseClientActionSubmit({...good,storagePath:"tenant-secret"}),null);
 const route=readFileSync(new URL("../../src/app/api/workflow/client-actions/submit/route.ts",import.meta.url),"utf8");
 assert.match(route,/ROTEVO_CLIENT_ACTIONS_ENABLED!=="true"/);
 assert.match(route,/client\.auth\.getUser\(token\)/);
 assert.match(route,/identity\.user\.id!==args\.expectedAuthorUserId/);
 assert.match(route,/rotevo_client_action_submit/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("review contract permits only formal validation or reasoned correction",()=>{
 const valid={assignmentId:base.projectId,submissionId:base.clientUserId,
  expectedAuthorUserId:base.expectedAuthorUserId,decision:"correction_requested",
  feedback:"Solicitar uma versão com áudio mais claro"};
 assert.equal(parseClientActionReview(valid)?.decision,"correction_requested");
 assert.equal(parseClientActionReview({...valid,feedback:""}),null);
 assert.equal(parseClientActionReview({...valid,decision:"publish"}),null);
 assert.equal(parseClientActionReview({...valid,submissionId:"not-uuid"}),null);
 assert.equal(parseClientActionReview({...valid,reviewedBy:"someone"}),null);
 assert.equal(parseClientActionReview({...valid,decision:"validated",feedback:""})?.decision,"validated");
 const route=readFileSync(new URL("../../src/app/api/workflow/client-actions/review/route.ts",import.meta.url),"utf8");
 assert.match(route,/ROTEVO_CLIENT_ACTIONS_ENABLED!=="true"/);
 assert.match(route,/client\.auth\.getUser\(token\)/);
 assert.match(route,/identity\.user\.id!==args\.expectedAuthorUserId/);
 assert.match(route,/rotevo_client_action_review/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("pending review queue remains team-gated and does not use service-role credentials",()=>{
 const route=readFileSync(new URL("../../src/app/api/workflow/client-actions/review-queue/route.ts",import.meta.url),"utf8");
 assert.match(route,/ROTEVO_CLIENT_ACTIONS_ENABLED!=="true"/);
 assert.match(route,/client\.auth\.getUser\(token\)/);
 assert.match(route,/identity\.user\.id!==args\.expectedAuthorUserId/);
 assert.match(route,/rotevo_client_action_review_queue/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("internal delivery review UI is disabled by default and does not bypass server authorization",()=>{
 const tasks=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
 const panel=readFileSync(new URL("../../src/Components/admin/ClientActionReviewPanel.tsx",import.meta.url),"utf8");
 assert.match(tasks,/NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED==="true"/);
 assert.match(tasks,/ClientActionReviewPanel/);
 assert.match(panel,/rotevo_client_action_review_queue|review-queue/);
 assert.match(panel,/supabase\.auth\.getUser\(\)/);
 assert.match(panel,/expectedAuthorUserId:data\.user\.id/);
 assert.match(panel,/decision==="correction_requested"&&note\.length<3/);
 assert.match(panel,/onAuthStateChange/);
 assert.match(panel,/session\.user\.id!==loadedUserId/);
 assert.match(panel,/alive=false;setItems\(\[\]\)/);
 assert.doesNotMatch(panel,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("private file submissions require immutable assignment and actor-bound object path",()=>{
 const good={assignmentId:base.projectId,expectedAuthorUserId:base.clientUserId,
  note:"Arquivo enviado para avaliação",requestKey:"private-asset-request-001",
  privateStoragePath:base.projectId+"/"+base.clientUserId+"/00000000-0000-4000-8000-000000000021.pdf"};
 assert.equal(parseClientActionSubmitAsset(good)?.privateStoragePath,good.privateStoragePath);
 assert.equal(parseClientActionSubmitAsset({...good,privateStoragePath:base.projectId+"/"+base.expectedAuthorUserId+"/00000000-0000-4000-8000-000000000021.pdf"}),null);
 assert.equal(parseClientActionSubmitAsset({...good,privateStoragePath:"../private"}),null);
 assert.equal(parseClientActionSubmitAsset({...good,privateStoragePath:good.privateStoragePath.replace(".pdf",".exe")}),null);
 const route=readFileSync(new URL("../../src/app/api/workflow/client-actions/submit-asset/route.ts",import.meta.url),"utf8");
 assert.match(route,/ROTEVO_PRIVATE_DELIVERIES_ENABLED!=="true"/);
 assert.match(route,/client\.auth\.getUser\(token\)/);
 assert.match(route,/rotevo_client_action_submit_asset/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("approver designation cannot run without G2-protected RPC and server flag",()=>{
 const api=readFileSync(new URL("../../src/app/api/workflow/editorial/designate-approver/route.ts",import.meta.url),"utf8");
 const sql=readFileSync(new URL("../../docs/security/sql/ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql",import.meta.url),"utf8");
 assert.match(api,/ROTEVO_DESIGNATED_APPROVAL_ENABLED!=="true"/);
 assert.match(api,/db\.auth\.getUser\(token\)/);
 assert.match(api,/identity\.user\.id!==data\.expectedAuthorUserId/);
 assert.match(sql,/p\.role='strategist' and m\.active and m\.role='admin'/);
 assert.match(sql,/public\.client_users cu join public\.profiles p/);
 assert.match(sql,/revoked_at=clock_timestamp\(\),revocation_reason/);
 assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY/);
});
test("client action notifications use existing private workflow events with explicit recipient",()=>{
 const sql=readFileSync(new URL("../../docs/security/sql/ui3-client-action-notifications-PROPOSAL-ONLY.sql",import.meta.url),"utf8");
 const bell=readFileSync(new URL("../../src/Components/shared/WorkflowNotificationBell.tsx",import.meta.url),"utf8");
 assert.match(sql,/if p_actor is null or p_recipient is null or p_actor=p_recipient then return/);
 assert.match(sql,/on conflict\(event_id,recipient_user_id\) do nothing/);
 assert.match(sql,/client_action_review_notice/);
 assert.match(bell,/n\.event_type==="assignment_changed"/);
 assert.match(bell,/n\.event_phase==="task"\?onOpenTask:onOpenContent/);
});
