import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../../docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql",import.meta.url),"utf8").toLowerCase();
test("Gate B remains proposal-only and browser access fail-closed",()=>{
 assert.match(sql,/proposal only/);
 for(const name of ["approval_requests","approval_decisions","operational_events","user_notifications"]){
  assert.ok(sql.includes("create table if not exists rotevo_workflow."+name),name);
  assert.ok(sql.includes("alter table rotevo_workflow."+name+" enable row level security"),name);
 }
 assert.match(sql,/revoke all on all tables in schema rotevo_workflow from public, anon, authenticated;/);
 assert.doesNotMatch(sql,/security definer|grant\s+(select|insert|update|all)\s+on\s+/);
});
test("versions, unique events and per-user deduplication cannot be bypassed",()=>{
 for(const required of [
 "request_key text not null unique","idempotency_key text not null unique",
 "unique(event_id,recipient_user_id)","request_id uuid not null unique",
 "one_pending_request_per_version","read_at timestamptz",
 "adjustment_message_id uuid references public.rotevo_collaboration_messages",
 "adjustment_requires_message"
 ])assert.ok(sql.includes(required),required);
});
test("existing approval and collaboration tables remain untouched",()=>{
 assert.doesNotMatch(sql,/alter table public\.(editorial_approvals|editorial_idea_approvals|rotevo_collaboration_messages)/);
 assert.doesNotMatch(sql,/delete\s+from|truncate\s+table|drop\s+table/);
});
