-- ROTEVO UI3 / APPROVER DESIGNATION: PROPOSAL ONLY.
-- Not a production migration. Requires authorized role-management RPC, tenant
-- validation and E2E approval before use. Tables remain inaccessible by API.
begin;
create schema if not exists rotevo_workflow;
revoke all on schema rotevo_workflow from public, anon, authenticated;

create table if not exists rotevo_workflow.editorial_designated_approvers (
  project_id uuid not null references public.planning_projects(id) on delete restrict,
  phase text not null check(phase in ('idea','final')),
  approver_user_id uuid not null,
  designated_by uuid not null,
  designated_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
  constraint editorial_designated_approvers_pk primary key(project_id,phase,approver_user_id),
  constraint editorial_designation_revocation_note check(
    revoked_at is null or (revocation_reason is not null and length(trim(revocation_reason)) between 3 and 500)
  )
);
create unique index if not exists editorial_one_active_approver_per_phase
  on rotevo_workflow.editorial_designated_approvers(project_id,phase)
  where revoked_at is null;
create index if not exists editorial_designated_by_user
  on rotevo_workflow.editorial_designated_approvers(approver_user_id,project_id)
  where revoked_at is null;
alter table rotevo_workflow.editorial_designated_approvers enable row level security;
revoke all on rotevo_workflow.editorial_designated_approvers from public,anon,authenticated;
commit;

-- MANDATORY RPC GATES BEFORE ACTIVATION:
-- Verify auth.uid() in an authorized internal role, enforce G2 projects.write.
-- Verify approver_user_id belongs to an ACTIVE client_users entry of the same
-- project client_id and a valid authenticated profiles client record.
-- Preserve historical approvers and prior decisions when revoking.
-- Explicit approver must be the only permitted decision actor for the phase.
-- An absent designation MUST FAIL CLOSED when more than one client user exists.
-- A designation must not unlock approval without visibility, matching content
-- version, pending request, session boundary and module authorization.
-- Do not read these rows via browser REST: use guarded RPC, no direct grants.
