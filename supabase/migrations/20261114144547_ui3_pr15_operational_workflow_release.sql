-- ROTEVO UI 3.0 PR #15 | Release candidate migration (NOT DEPLOYED)
-- Based on 12 previously validated PROPOSAL-ONLY source scripts, ordered as in
-- scripts/security/ui3-operational-local-install.sh.
-- Production application authorized by owner but conditional upon preflight
-- on a disposable clone of the actual production snapshot, migration history
-- reconciliation, explicit release verification and active cutover plan.
-- This file never copies or overwrites client data. Existing grants that deny
-- direct authenticated/anon access to planning_projects.data MUST be preserved.
-- Supabase production existing object: public.rotevo_collaboration_messages.
-- Intentionally exclude previous grants-hardening/legacy collaboration scripts.
-- Do NOT run a partial subset. pg migration is transactional.
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '120s';

-- =====================================================================
-- SOURCE: docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- ROTEVO UI3 / GATE B: PROPOSAL ONLY. DO NOT APPLY TO ANY HOSTED DB.
-- Requires approved migration, G2/E2E tests and explicit production release approval.
-- No grants to anon/authenticated and no public RPCs. Application/API remains disabled.

create schema if not exists rotevo_workflow;
revoke all on schema rotevo_workflow from public, anon, authenticated;

create table if not exists rotevo_workflow.approval_requests (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('content','task','document','campaign')),
 resource_id text not null check(length(resource_id) between 1 and 100),
 phase text not null check(phase in ('idea','final','delivery')),
 resource_version text not null check(length(resource_version) between 1 and 80),
 -- Legacy items may already be awaiting approval without an identified requester.
 -- Never attribute their request to the client who is deciding.
 requested_by uuid references auth.users(id) on delete restrict,
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested','cancelled','superseded')),
 decided_at timestamptz,
 request_key text not null unique check(length(request_key) between 8 and 200),
 context jsonb not null default '{}'::jsonb,
 constraint request_type_phase check(
   (resource_type='content' and phase in ('idea','final')) or
   (resource_type in ('task','document','campaign') and phase='delivery')
 ),
 constraint decided_status_consistency check(
  (status='pending' and decided_at is null) or
  (status<>'pending')
 )
);
create unique index if not exists one_pending_request_per_version
 on rotevo_workflow.approval_requests(project_id,resource_type,resource_id,phase,resource_version)
 where status='pending';
create index if not exists approval_requests_project_status_idx
 on rotevo_workflow.approval_requests(project_id,status,requested_at desc);

create table if not exists rotevo_workflow.approval_decisions (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references rotevo_workflow.approval_requests(id) on delete restrict,
 decided_by uuid not null references auth.users(id) on delete restrict,
 decision text not null check(decision in ('approved','changes_requested')),
 decided_at timestamptz not null default now(),
 adjustment_message_id uuid references public.rotevo_collaboration_messages(id) on delete restrict,
 legacy_source text check(legacy_source in ('editorial_approvals','editorial_idea_approvals')),
 legacy_decision_id uuid,
 constraint legacy_reference_pair check((legacy_source is null)=(legacy_decision_id is null)),
 constraint adjustment_requires_message check(decision<>'changes_requested' or adjustment_message_id is not null)
);
create unique index if not exists approval_decisions_legacy_idx
 on rotevo_workflow.approval_decisions(legacy_source,legacy_decision_id)
 where legacy_source is not null;

create table if not exists rotevo_workflow.operational_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('content','task','document','campaign')),
 resource_id text not null check(length(resource_id) between 1 and 100),
 resource_version text,
 event_type text not null check(event_type in (
  'approval_requested','approval_approved','adjustments_requested','message_sent',
  'item_ready','task_delivery_accepted','assignment_changed')),
 actor_user_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid references rotevo_workflow.approval_requests(id) on delete restrict,
 source_message_id uuid references public.rotevo_collaboration_messages(id) on delete restrict,
 idempotency_key text not null unique check(length(idempotency_key) between 8 and 200),
 occurred_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb,
 constraint event_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists operational_events_project_time_idx
 on rotevo_workflow.operational_events(project_id,occurred_at desc,id desc);

create table if not exists rotevo_workflow.user_notifications (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references rotevo_workflow.operational_events(id) on delete restrict,
 recipient_user_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(event_id,recipient_user_id),
 constraint read_after_creation check(read_at is null or read_at>=created_at)
);
create index if not exists user_notifications_unread_idx
 on rotevo_workflow.user_notifications(recipient_user_id,created_at desc)
 where read_at is null;

-- Defense in depth: no automatic direct browser access. Authorization must be
-- implemented as reviewed server routes/RPCs checking recipient AND current G2,
-- module, project and item access on every read and deep-link resolution.
alter table rotevo_workflow.approval_requests enable row level security;
alter table rotevo_workflow.approval_decisions enable row level security;
alter table rotevo_workflow.operational_events enable row level security;
alter table rotevo_workflow.user_notifications enable row level security;
revoke all on all tables in schema rotevo_workflow from public, anon, authenticated;
-- Intentionally no policies, grants, functions, triggers or event publication.


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-actions-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 client actions / submissions: PROPOSAL ONLY. NEVER apply to production without gate.
-- Assumes existing private schema rotevo_workflow. Run only after review of RLS/GRANT,
-- account approver contract, backup and rollback. No public EXECUTE grants or API exposure.

create schema if not exists rotevo_workflow;
create table if not exists rotevo_workflow.client_action_assignments (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('content','task')),
 resource_id text not null check(length(resource_id) between 1 and 180),
 resource_version text,
 action_type text not null check(action_type in ('record_video','send_material','provide_information','review_material','custom')),
 client_user_id uuid not null,
 internal_owner_user_id uuid,
 instructions text not null default '' check(length(instructions)<=4000),
 reference_url text,
 due_date date,
 status text not null default 'pending' check(status in ('pending','in_progress','submitted','validated','correction_requested','cancelled')),
 ready_at timestamptz,
 released_at timestamptz,
 completed_at timestamptz,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 idempotency_key text not null unique check(length(idempotency_key) between 8 and 250),
 check(resource_type<>'content' or nullif(resource_version,'') is not null),
 check(released_at is null or ready_at is not null),
 check(completed_at is null or status in ('validated','cancelled')),
 check(reference_url is null or length(reference_url)<=2048)
);
create index if not exists idx_ui3_client_assignments_user
 on rotevo_workflow.client_action_assignments(client_user_id,status,due_date)
 where released_at is not null;
create index if not exists idx_ui3_client_assignments_resource
 on rotevo_workflow.client_action_assignments(project_id,resource_type,resource_id,resource_version);
create table if not exists rotevo_workflow.client_action_submissions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references rotevo_workflow.client_action_assignments(id) on delete restrict,
 submitted_by uuid not null,
 submission_url text,
 note text not null default '' check(length(note)<=4000),
 attempt_number integer not null check(attempt_number between 1 and 1000),
 review_status text not null default 'submitted' check(review_status in ('submitted','validated','correction_requested')),
 reviewed_by uuid,
 reviewed_at timestamptz,
 reviewer_feedback text check(reviewer_feedback is null or length(reviewer_feedback)<=4000),
 created_at timestamptz not null default now(),
 request_key text not null unique check(length(request_key) between 8 and 250),
 unique(assignment_id,attempt_number),
 check(submission_url is not null and length(trim(submission_url))>0),
 check(submission_url ~ '^https://(drive|docs)[.]google[.]com/' and length(submission_url)<=2048),
 check(reviewed_at is null or reviewed_by is not null)
);
create index if not exists idx_ui3_client_submissions_assignment
 on rotevo_workflow.client_action_submissions(assignment_id,created_at desc);
alter table rotevo_workflow.client_action_assignments enable row level security;
alter table rotevo_workflow.client_action_submissions enable row level security;
-- Fail closed: no RLS policies, no anon/authenticated grants, no exposed schema.
revoke all on rotevo_workflow.client_action_assignments from public, anon, authenticated;
revoke all on rotevo_workflow.client_action_submissions from public, anon, authenticated;

-- NON-EXECUTABLE INTEGRATION GATES
-- 1. Internal RPC must check auth.uid(), project's client_id, active client_users linkage,
--    assigned client_user_id, resource visibility, resource version, project/team/G2.
-- 2. Approved target users are explicit; client user names cannot authorize actions.
-- 3. Add server-side state transition, retry + optimistic concurrency, auditable events.
-- 4. No file storage: submissions contain only a validated Google Drive URL and optional note.
-- 5. A client submission cannot mutate editorial approval or publish status.
-- 6. No asynchronous reminders or notifications until recipient authorization is tested.
-- 7. If only SQL is applied, these tables remain unreachable: that is intentional.


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- ROTEVO UI3 / APPROVER DESIGNATION: PROPOSAL ONLY.
-- Not a production migration. Requires authorized role-management RPC, tenant
-- validation and E2E approval before use. Tables remain inaccessible by API.

create schema if not exists rotevo_workflow;
revoke all on schema rotevo_workflow from public, anon, authenticated;

create table if not exists rotevo_workflow.editorial_designated_approvers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.planning_projects(id) on delete restrict,
  phase text not null check(phase in ('idea','final')),
  approver_user_id uuid not null,
  designated_by uuid not null,
  designated_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
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


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-action-rpc-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 CLIENT ACTION RPCS — PROPOSAL ONLY, disposable PostgreSQL tests.
-- Requires ui3-client-actions-PROPOSAL-ONLY.sql and existing Rotevo public identity tables.
-- NEVER apply to a hosted database until full G2/tenant, backup and E2E acceptance.
-- No service_role in browser / API. SECURITY DEFINER has empty search_path.
create or replace function public.rotevo_client_action_create(
 p_project_id uuid,p_resource_type text,p_resource_id text,p_resource_version text,
 p_client_user_id uuid,p_action_type text,p_instructions text,p_due_date date,p_request_key text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_found integer;
 v_id uuid;
 v_existing rotevo_workflow.client_action_assignments%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role not in ('staff','strategist') then
  raise exception 'Only team can assign client actions' using errcode='42501';end if;
 if p_resource_type not in ('content','task') or p_resource_id is null
  or p_resource_id !~ '^[a-zA-Z0-9_-]{1,180}$'
  or (p_resource_type='content' and (p_resource_version is null or length(btrim(p_resource_version)) not between 1 and 80))
  or p_action_type not in ('record_video','send_material','provide_information','review_material','custom')
  or p_instructions is null or length(btrim(p_instructions)) not between 3 and 4000
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9:_-]{8,250}$'
 then raise exception 'Invalid action request' using errcode='22023';end if;

 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.team_members m where m.user_id=v_actor and m.active
   and (m.role='admin' or (
    exists(select 1 from public.team_project_assignments a where a.user_id=v_actor and a.project_id=p_project_id)
    and exists(select 1 from public.team_member_permissions g where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 write denied' using errcode='42501';end if;
 -- Both account tables must agree. Visibility of the content alone cannot grant an assignment.
 if not exists(
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.client_id=v_project.client_id and u.user_id=p_client_user_id
   and p.client_id=v_project.client_id and p.role='client'
 ) then raise exception 'Client user not linked to project tenant' using errcode='42501';end if;

 select count(*),(jsonb_agg(e.value)->0) into v_found,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
   then v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
   else '[]'::jsonb end) e(value)
 where value->>'id'=p_resource_id;
 if v_found<>1 or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
   or v_resource->>'visibleToClient' is distinct from 'true'
   or (p_resource_type='content' and coalesce(v_resource->>'version','')<>p_resource_version)
 then raise exception 'Resource unavailable or version changed' using errcode='40001';end if;

 -- Same idempotency key can return same assignment but cannot be repurposed.
 select * into v_existing from rotevo_workflow.client_action_assignments where idempotency_key=p_request_key;
 if found then
  if v_existing.project_id<>p_project_id or v_existing.resource_type<>p_resource_type
    or v_existing.resource_id<>p_resource_id or coalesce(v_existing.resource_version,'')<>coalesce(p_resource_version,'')
    or v_existing.client_user_id<>p_client_user_id or v_existing.action_type<>p_action_type
    or v_existing.instructions<>btrim(p_instructions) or v_existing.due_date is distinct from p_due_date
  then raise exception 'Idempotency key reused with changed request' using errcode='23505';end if;
  return jsonb_build_object('id',v_existing.id,'status',v_existing.status,'replayed',true);
 end if;
 insert into rotevo_workflow.client_action_assignments(
  project_id,resource_type,resource_id,resource_version,action_type,
  client_user_id,instructions,due_date,status,ready_at,released_at,created_by,idempotency_key)
 values(p_project_id,p_resource_type,p_resource_id,p_resource_version,p_action_type,
  p_client_user_id,btrim(p_instructions),p_due_date,'pending',clock_timestamp(),clock_timestamp(),v_actor,p_request_key)
 returning id into v_id;
 return jsonb_build_object('id',v_id,'status','pending','replayed',false);
end;
$fn$;
revoke all on function public.rotevo_client_action_create(uuid,text,text,text,uuid,text,text,date,text) from public,anon;
grant execute on function public.rotevo_client_action_create(uuid,text,text,text,uuid,text,text,date,text) to authenticated;

create or replace function public.rotevo_client_action_list(
 p_project_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_results jsonb;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id;
 if not found or not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_actor and cu.client_id=v_project.client_id
   and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Client tenant access denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id,'projectId',a.project_id,'resourceType',a.resource_type,
  'resourceId',a.resource_id,'resourceVersion',a.resource_version,
  'actionType',a.action_type,'instructions',a.instructions,
  'dueDate',a.due_date,'status',a.status,'updatedAt',a.updated_at)
  order by a.due_date nulls last,a.created_at), '[]'::jsonb)
 into v_results
 from rotevo_workflow.client_action_assignments a
 where a.project_id=p_project_id and a.client_user_id=v_actor
  and a.released_at is not null and a.status<>'cancelled'
  and exists (
   select 1 from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->(case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
    then v_project.data->(case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
    else '[]'::jsonb end
   ) e(value)
   where e.value->>'id'=a.resource_id and e.value->>'visibleToClient'='true'
    and coalesce(e.value->>'archivedAt','')='' and coalesce(e.value->>'deletedAt','')=''
    and (a.resource_type<>'content' or coalesce(e.value->>'version','')=a.resource_version)
  );
 return v_results;
end;
$fn$;
revoke all on function public.rotevo_client_action_list(uuid) from public,anon;
grant execute on function public.rotevo_client_action_list(uuid) to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- PROPOSAL ONLY: client delivers a Google Drive URL, NEVER a binary upload.
-- No changes to editorial approval or publishing state.
create or replace function public.rotevo_client_action_submit(
 p_assignment_id uuid,p_note text,p_request_key text,p_drive_url text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_count integer;
 v_attempt integer;
 v_submission uuid;
 v_existing rotevo_workflow.client_action_submissions%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_note is null or length(p_note)>4000
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9:_-]{8,250}$'
  or p_drive_url is null or length(p_drive_url)>2048
  or p_drive_url ~ '[[:space:]#@]'
  or not (
   p_drive_url ~ '^https://drive[.]google[.]com/(file/d/|drive/folders/|drive/u/[0-9]+/folders/)[A-Za-z0-9_-]+'
   or p_drive_url ~ '^https://drive[.]google[.]com/(open|uc)[?]id=[A-Za-z0-9_-]+'
   or p_drive_url ~ '^https://docs[.]google[.]com/(document|spreadsheets|presentation|forms|drawings|videos)/d/[A-Za-z0-9_-]+'
  )
 then raise exception 'Invalid Drive URL or submission' using errcode='22023';end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments
 where id=p_assignment_id for update;
 if not found or v_assignment.client_user_id<>v_actor or v_assignment.released_at is null
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found or not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_actor and cu.client_id=v_project.client_id
   and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Client access revoked' using errcode='42501';end if;
 select count(*),(jsonb_agg(e.value)->0) into v_count,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(case when v_assignment.resource_type='content'
    then 'editorialCalendar' else 'executionTimeline' end))='array'
  then v_project.data->(case when v_assignment.resource_type='content'
    then 'editorialCalendar' else 'executionTimeline' end)
  else '[]'::jsonb end
 ) e(value) where e.value->>'id'=v_assignment.resource_id;
 if v_count<>1 or v_resource->>'visibleToClient' is distinct from 'true'
  or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
  or (v_assignment.resource_type='content' and
      coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then raise exception 'Resource revoked or version changed' using errcode='40001';end if;
 select * into v_existing from rotevo_workflow.client_action_submissions
 where request_key=p_request_key;
 if found then
  if v_existing.assignment_id<>p_assignment_id or v_existing.submitted_by<>v_actor
   or v_existing.note<>btrim(p_note) or v_existing.submission_url<>p_drive_url
  then raise exception 'Idempotency key reused with changed payload' using errcode='23505';end if;
  return jsonb_build_object('id',v_existing.id,'status',v_existing.review_status,'replayed',true);
 end if;
 if v_assignment.status not in ('pending','in_progress','correction_requested')
 then raise exception 'Assignment does not accept new submission' using errcode='40001';end if;
 select coalesce(max(attempt_number),0)+1 into v_attempt
 from rotevo_workflow.client_action_submissions where assignment_id=p_assignment_id;
 insert into rotevo_workflow.client_action_submissions(
  assignment_id,submitted_by,note,submission_url,attempt_number,request_key)
 values(p_assignment_id,v_actor,btrim(p_note),p_drive_url,v_attempt,p_request_key)
 returning id into v_submission;
 update rotevo_workflow.client_action_assignments
 set status='submitted',updated_at=clock_timestamp() where id=p_assignment_id;
 return jsonb_build_object('id',v_submission,'status','submitted','replayed',false);
end;
$fn$;
revoke all on function public.rotevo_client_action_submit(uuid,text,text,text) from public,anon;
grant execute on function public.rotevo_client_action_submit(uuid,text,text,text) to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-action-review-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 | Team validation of client submissions. PROPOSAL-ONLY, NOT A PRODUCTION MIGRATION.
-- Must be tested with synthetic tenant accounts, revocation, G2 and concurrency before activation.
-- Intentionally does NOT change content editorial status, publication or external notifications.
create or replace function public.rotevo_client_action_review(
 p_assignment_id uuid,
 p_submission_id uuid,
 p_decision text,
 p_feedback text
) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_submission rotevo_workflow.client_action_submissions%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_matches integer;
 v_new_status text;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_decision not in ('validated','correction_requested')
   or p_feedback is null or length(p_feedback)>4000
   or (p_decision='correction_requested' and length(btrim(p_feedback))<3)
 then raise exception 'Invalid review decision or feedback' using errcode='22023';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role is distinct from 'staff' and v_role is distinct from 'strategist'
 then raise exception 'Only team can review assignments' using errcode='42501';end if;

 select * into v_assignment from rotevo_workflow.client_action_assignments
  where id=p_assignment_id for update;
 if not found or v_assignment.released_at is null or v_assignment.status='cancelled'
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.team_members m where m.user_id=v_actor and m.active
   and (m.role='admin' or (
     exists(select 1 from public.team_project_assignments a
       where a.user_id=v_actor and a.project_id=v_assignment.project_id)
     and exists(select 1 from public.team_member_permissions g
       where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 review denied' using errcode='42501';end if;

 -- A revoked client must not have its unreviewed submission implicitly approved.
 if not exists(
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.client_id=v_project.client_id and u.user_id=v_assignment.client_user_id
    and p.client_id=v_project.client_id and p.role='client'
 ) then raise exception 'Assigned client was unlinked' using errcode='42501';end if;

 select count(*),(jsonb_agg(e.value)->0) into v_matches,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(
   case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
  then v_project.data->(
   case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
  else '[]'::jsonb end) e(value)
 where e.value->>'id'=v_assignment.resource_id;
 if v_matches<>1 or v_resource->>'visibleToClient' is distinct from 'true'
 or coalesce(v_resource->>'deletedAt','')<>'' or coalesce(v_resource->>'archivedAt','')<>''
 or (v_assignment.resource_type='content'
   and coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then raise exception 'Resource revoked or version changed' using errcode='40001';end if;

 select * into v_submission from rotevo_workflow.client_action_submissions
 where id=p_submission_id and assignment_id=p_assignment_id for update;
 if not found then raise exception 'Submission unavailable' using errcode='42501';end if;
 if v_submission.submitted_by<>v_assignment.client_user_id
 then raise exception 'Unexpected submission owner' using errcode='42501';end if;

 -- Replaying an identical successful decision is safe; a different decision is a conflict.
 if v_submission.reviewed_at is not null then
  if v_submission.reviewed_by=v_actor
   and v_submission.review_status=p_decision
   and coalesce(v_submission.reviewer_feedback,'')=coalesce(nullif(btrim(p_feedback),''),'')
  then return jsonb_build_object('submissionId',v_submission.id,
    'status',v_submission.review_status,'replayed',true);end if;
  raise exception 'Submission already reviewed' using errcode='40001';
 end if;
 if v_assignment.status<>'submitted'
 then raise exception 'Assignment no longer awaiting review' using errcode='40001';end if;
 if exists(
  select 1 from rotevo_workflow.client_action_submissions newer
  where newer.assignment_id=p_assignment_id
    and newer.attempt_number>v_submission.attempt_number
 ) then raise exception 'Cannot review a stale submission' using errcode='40001';end if;

 v_new_status:=p_decision;
 update rotevo_workflow.client_action_submissions
 set review_status=v_new_status,reviewed_by=v_actor,reviewed_at=clock_timestamp(),
   reviewer_feedback=nullif(btrim(p_feedback),'')
 where id=p_submission_id;
 update rotevo_workflow.client_action_assignments
 set status=v_new_status,
     completed_at=case when v_new_status='validated' then clock_timestamp() else null end,
     updated_at=clock_timestamp()
 where id=p_assignment_id;
 return jsonb_build_object('submissionId',p_submission_id,'status',v_new_status,'replayed',false);
end;
$fn$;
revoke all on function public.rotevo_client_action_review(uuid,uuid,text,text) from public,anon;
grant execute on function public.rotevo_client_action_review(uuid,uuid,text,text) to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-action-review-queue-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- PROPOSAL ONLY. Internal review queue scoped to permitted projects. No data exposure to clients.
create or replace function public.rotevo_client_action_review_queue(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_role text;
 v_rows jsonb;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role is distinct from 'staff' and v_role is distinct from 'strategist'
 then raise exception 'Team only' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id;
 if not found then raise exception 'Unknown project' using errcode='42501';end if;
 if not exists(
   select 1 from public.team_members m where m.user_id=v_actor and m.active
    and (m.role='admin' or (
      exists(select 1 from public.team_project_assignments a
        where a.user_id=v_actor and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions g
        where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
    ))
 ) then raise exception 'G2 review access denied' using errcode='42501';end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'assignmentId',q.assignment_id,'submissionId',q.submission_id,
  'resourceType',q.resource_type,'resourceId',q.resource_id,
  'resourceVersion',q.resource_version,'clientUserId',q.client_user_id,
  'actionType',q.action_type,'instructions',q.instructions,
  'submittedAt',q.submitted_at,'note',q.note,'driveUrl',q.submission_url,
  'attemptNumber',q.attempt_number,'dueDate',q.due_date
 ) order by q.submitted_at,q.assignment_id), '[]'::jsonb) into v_rows
 from (
 select a.id assignment_id,s.id submission_id,
 a.resource_type,a.resource_id,a.resource_version,a.client_user_id,
 a.action_type,a.instructions,s.created_at submitted_at,s.note,
 s.attempt_number,a.due_date,s.submission_url
 from rotevo_workflow.client_action_assignments a
 join rotevo_workflow.client_action_submissions s on s.assignment_id=a.id
 where a.project_id=p_project_id and a.status='submitted' and s.review_status='submitted'
  and s.reviewed_at is null and a.released_at is not null
  and exists(
   select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
   where cu.user_id=a.client_user_id and cu.client_id=v_project.client_id
    and p.client_id=v_project.client_id and p.role='client'
  )
  and exists(
   select 1 from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->(
      case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
     then v_project.data->(
      case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
     else '[]'::jsonb end
   ) e(value)
   where e.value->>'id'=a.resource_id
    and e.value->>'visibleToClient'='true'
    and coalesce(e.value->>'archivedAt','')=''
    and coalesce(e.value->>'deletedAt','')=''
    and (a.resource_type<>'content' or coalesce(e.value->>'version','')=a.resource_version)
  )
 order by s.created_at,s.id limit 100
 ) q;
 return v_rows;
end;
$fn$;
revoke all on function public.rotevo_client_action_review_queue(uuid) from public,anon;
grant execute on function public.rotevo_client_action_review_queue(uuid) to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-client-action-notifications-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 client action notifications: PROPOSAL ONLY. Applies only after Gate B workflow tables exist.
-- Events are inserted in the same transaction as the state change; the read RPC
-- independently checks CURRENT project/module permissions and recipient identity.
-- No external mail, webhook, email or WhatsApp delivery is performed here.
create or replace function rotevo_workflow.client_action_emit_event(
 p_project_id uuid,p_resource_type text,p_resource_id text,p_resource_version text,
 p_event_type text,p_actor uuid,p_recipient uuid,p_key text,p_metadata jsonb
) returns void language plpgsql security definer set search_path='' as $fn$
declare v_event_id uuid;
begin
 if p_actor is null or p_recipient is null or p_actor=p_recipient then return;end if;
 if p_event_type not in ('assignment_changed','item_ready','task_delivery_accepted','adjustments_requested')
 then raise exception 'Invalid notification event' using errcode='22023';end if;
 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,
  actor_user_id,idempotency_key,metadata
 ) values(p_project_id,p_resource_type,p_resource_id,p_resource_version,
  p_event_type,p_actor,p_key,p_metadata)
 on conflict(idempotency_key) do nothing returning id into v_event_id;
 if v_event_id is null then
  select id into v_event_id from rotevo_workflow.operational_events
  where idempotency_key=p_key;
 end if;
 if v_event_id is not null then
  insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
  values(v_event_id,p_recipient) on conflict(event_id,recipient_user_id) do nothing;
 end if;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_emit_event(
 uuid,text,text,text,text,uuid,uuid,text,jsonb) from PUBLIC,anon,authenticated;

create or replace function rotevo_workflow.client_action_assignment_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_tenant uuid;
begin
 if new.released_at is null then return new;end if;
 select client_id into v_tenant from public.planning_projects where id=new.project_id;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=new.client_user_id and cu.client_id=v_tenant
    and p.client_id=v_tenant and p.role='client'
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  new.project_id,new.resource_type,new.resource_id,new.resource_version,
  'assignment_changed',new.created_by,new.client_user_id,
  'client-action:assigned:'||new.id,
  pg_catalog.jsonb_build_object('phase',new.resource_type,'actionId',new.id,'action','assigned')
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_assignment_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_assignment_notice
after insert on rotevo_workflow.client_action_assignments
for each row execute function rotevo_workflow.client_action_assignment_notice();

create or replace function rotevo_workflow.client_action_submission_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_recipient uuid;
begin
 select * into v_assignment from rotevo_workflow.client_action_assignments where id=new.assignment_id;
 if not found or v_assignment.status='cancelled' then return new;end if;
 v_recipient:=coalesce(v_assignment.internal_owner_user_id,v_assignment.created_by);
 if not exists(
  select 1 from public.team_members m where m.user_id=v_recipient and m.active
  and (m.role='admin' or (
   exists(select 1 from public.team_project_assignments a
    where a.user_id=v_recipient and a.project_id=v_assignment.project_id)
   and exists(select 1 from public.team_member_permissions g
    where g.user_id=v_recipient and g.permission in ('projects.read','projects.write','editorial.read','editorial.write'))
  ))
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  v_assignment.project_id,v_assignment.resource_type,v_assignment.resource_id,v_assignment.resource_version,
  'item_ready',new.submitted_by,v_recipient,'client-action:submitted:'||new.id,
  pg_catalog.jsonb_build_object('phase',v_assignment.resource_type,'actionId',v_assignment.id,'submissionId',new.id,'action','submitted')
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_submission_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_submission_notice
after insert on rotevo_workflow.client_action_submissions
for each row execute function rotevo_workflow.client_action_submission_notice();

create or replace function rotevo_workflow.client_action_review_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_tenant uuid;
begin
 if old.reviewed_at is not null or new.reviewed_at is null
 or new.review_status not in ('validated','correction_requested') then return new;end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments where id=new.assignment_id;
 if not found then return new;end if;
 select client_id into v_tenant from public.planning_projects where id=v_assignment.project_id;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_assignment.client_user_id and cu.client_id=v_tenant
  and p.client_id=v_tenant and p.role='client'
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  v_assignment.project_id,v_assignment.resource_type,v_assignment.resource_id,v_assignment.resource_version,
  case when new.review_status='validated' then 'task_delivery_accepted' else 'assignment_changed' end,
  new.reviewed_by,v_assignment.client_user_id,'client-action:review:'||new.id,
  pg_catalog.jsonb_build_object('phase',v_assignment.resource_type,'actionId',v_assignment.id,
   'submissionId',new.id,'action',new.review_status)
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_review_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_review_notice
after update of review_status,reviewed_at on rotevo_workflow.client_action_submissions
for each row execute function rotevo_workflow.client_action_review_notice();


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 designated formal client approver RPC, PROPOSAL ONLY.
-- Modifications restricted to an ACTIVE strategist with G2 workspace admin.
-- Preserves all historical decisions and each revoked designation row.
create or replace function public.rotevo_editorial_designate_approver(
 p_project_id uuid,p_phase text,p_approver_user_id uuid,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_active rotevo_workflow.editorial_designated_approvers%rowtype;
 v_new uuid;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_phase not in ('idea','final') or p_reason is null
 or length(btrim(p_reason)) not between 3 and 500
 then raise exception 'Invalid approver designation' using errcode='22023';end if;
 if not exists(
  select 1 from public.profiles p join public.team_members m on m.user_id=p.id
  where p.id=v_actor and p.role='strategist' and m.active and m.role='admin'
 ) then raise exception 'Only strategist administrator may designate an approver' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_project.client_id and cu.user_id=p_approver_user_id
    and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Approver does not belong to the client account' using errcode='42501';end if;
 select * into v_active from rotevo_workflow.editorial_designated_approvers
  where project_id=p_project_id and phase=p_phase and revoked_at is null for update;
 if found and v_active.approver_user_id=p_approver_user_id then
  return pg_catalog.jsonb_build_object('id',v_active.id,'approverUserId',p_approver_user_id,'replayed',true);
 end if;
 if found then
  update rotevo_workflow.editorial_designated_approvers
  set revoked_at=clock_timestamp(),revocation_reason=btrim(p_reason)
  where id=v_active.id;
 end if;
 insert into rotevo_workflow.editorial_designated_approvers(
  project_id,phase,approver_user_id,designated_by)
 values(p_project_id,p_phase,p_approver_user_id,v_actor)
 returning id into v_new;
 return pg_catalog.jsonb_build_object('id',v_new,'approverUserId',p_approver_user_id,'replayed',false);
end;
$fn$;
revoke all on function public.rotevo_editorial_designate_approver(uuid,text,uuid,text) from public,anon;
grant execute on function public.rotevo_editorial_designate_approver(uuid,text,uuid,text) to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-editorial-workflow-request-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- Gate B proposal: explicitly send a versioned editorial item for client approval.
-- Synthetic PostgreSQL only until approved E2E and migration. DO NOT APPLY HOSTED.
create or replace function public.rotevo_editorial_workflow_request(
 p_project_id uuid,p_content_id text,p_content_version text,p_phase text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_project public.planning_projects%rowtype;
 v_content jsonb;
 v_pos bigint;
 v_matches int;
 v_to_status text;
 v_from_status text;
 v_request_id uuid;
 v_event_id uuid;
 v_recipient uuid;
 v_recipients int;
 v_key text;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Password reset required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role not in ('staff','strategist') then
  raise exception 'Only authorized team can request approval' using errcode='42501';end if;
 if p_content_id is null or p_content_id !~ '^[A-Za-z0-9_-]{1,80}$'
  or p_content_version is null or length(btrim(p_content_version)) not between 1 and 30
  or p_phase not in ('idea','final')
 then raise exception 'Invalid request' using errcode='22023';end if;

 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
   select 1 from public.team_members m
   where m.user_id=v_actor and m.active and
   (m.role='admin' or (
      exists(select 1 from public.team_project_assignments a
         where a.user_id=v_actor and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions q
         where q.user_id=v_actor and q.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 write access denied' using errcode='42501';end if;

 if (jsonb_typeof(v_project.data->'portalModules')='array'
       and not (v_project.data->'portalModules' ? 'content'))
  or not exists(select 1 from public.client_workspaces w
       where w.client_id=v_project.client_id
        and jsonb_typeof(w.data->'modules')='array' and w.data->'modules'?'content')
 then raise exception 'Content module unavailable' using errcode='42501';end if;
 select count(*) into v_matches
 from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
   then v_project.data->'editorialCalendar' else '[]'::jsonb end) e(value)
 where value->>'id'=p_content_id;
 select value,pos into v_content,v_pos
 from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
   then v_project.data->'editorialCalendar' else '[]'::jsonb end) with ordinality e(value,pos)
 where value->>'id'=p_content_id limit 1;
 if v_matches<>1 or v_content->>'visibleToClient' is distinct from 'true'
   or coalesce(v_content->>'version','')<>p_content_version
   or coalesce(v_content->>'archivedAt','')<>''
   or coalesce(v_content->>'deletedAt','')<>''
 then raise exception 'Content unavailable' using errcode='40001';end if;
 v_from_status:=case p_phase when 'idea' then 'idea' else 'review' end;
 -- An idea is approved through a pending request, not a UI status named idea_pending.
 v_to_status:=case p_phase when 'idea' then 'idea' else 'awaiting_client' end;
 if v_content->>'status' is distinct from v_from_status
 then raise exception 'Not ready for client approval' using errcode='40001';end if;

 -- Explicit named approver wins. Sole-account fallback is allowed only
 -- while no designation exists. Multiple linked clients fail closed.
 select approver_user_id into v_recipient
 from rotevo_workflow.editorial_designated_approvers
 where project_id=p_project_id and phase=p_phase and revoked_at is null;
 if v_recipient is not null then
  if not exists(select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
    where cu.user_id=v_recipient and cu.client_id=v_project.client_id
      and p.client_id=v_project.client_id and p.role='client')
  then raise exception 'Designated account was revoked' using errcode='42501';end if;
 else
  select count(*) into v_recipients
  from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_project.client_id and p.client_id=v_project.client_id and p.role='client';
  if v_recipients<>1 then
   raise exception 'Explicit approver designation required' using errcode='42501';end if;
  select cu.user_id into v_recipient
  from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_project.client_id and p.client_id=v_project.client_id and p.role='client';
 end if;

 v_key:='editorial:'||p_project_id::text||':'||p_phase||':'||p_content_id||':'||p_content_version;
 insert into rotevo_workflow.approval_requests(
  project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
 values(p_project_id,'content',p_content_id,p_phase,p_content_version,v_actor,v_key)
 returning id into v_request_id;

 update public.planning_projects
 set data=jsonb_set(v_project.data,array['editorialCalendar',(v_pos-1)::text,'status'],
                    to_jsonb(v_to_status),false),
     updated_at=clock_timestamp()
 where id=p_project_id;

 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,
  actor_user_id,request_id,idempotency_key,metadata)
 values(p_project_id,'content',p_content_id,p_content_version,'approval_requested',
  v_actor,v_request_id,'editorial-request:'||v_key,
  jsonb_build_object('phase',p_phase))
 returning id into v_event_id;
 insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
 values(v_event_id,v_recipient);

 return jsonb_build_object('requestId',v_request_id,'eventId',v_event_id,'status',v_to_status);
end
$fn$;
revoke all on function public.rotevo_editorial_workflow_request(uuid,text,text,text)
 from PUBLIC,anon;
grant execute on function public.rotevo_editorial_workflow_request(uuid,text,text,text)
 to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-editorial-workflow-rpc-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- UI3 Gate B: EDITORIAL WORKFLOW FUNCTION PROPOSAL. ISOLATED LAB ONLY.
-- Apply AFTER docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql
-- Never apply to hosted Supabase or run in production without separate approval.
-- SECURITY DEFINER is necessary only for the guarded transaction against private tables.
-- Every invocation performs auth.uid(), role, tenant, module, item, state and version checks.
create or replace function public.rotevo_editorial_workflow_decide(
 p_project_id uuid,
 p_content_id text,
 p_content_version text,
 p_phase text,
 p_decision text,
 p_adjustment_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
 v_actor uuid := auth.uid();
 v_client uuid;
 v_client_approver_count integer;
 v_project public.planning_projects%rowtype;
 v_item jsonb;
 v_position bigint;
 v_matches integer;
 v_expected text;
 v_new_status text;
 v_request_id uuid;
 v_legacy_id uuid;
 v_message_id uuid;
 v_event_id uuid;
 v_key text;
 v_kind text;
 v_comment text;
 v_result jsonb;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then
  raise exception 'Initial password change required' using errcode='42501';
 end if;
 select client_id into v_client from public.profiles where id=v_actor and role='client';
 if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
 -- Designation is checked only after the intended project is locked.
 if p_content_id is null or p_content_id !~ '^[A-Za-z0-9_-]{1,80}$'
  or p_content_version is null or length(btrim(p_content_version)) not between 1 and 30
  or p_phase not in ('idea','final') or p_decision not in ('approved','changes_requested')
 then raise exception 'Invalid decision request' using errcode='22023';end if;
 v_comment := nullif(btrim(coalesce(p_adjustment_body,'')),'');
 if p_decision='changes_requested' and
   (v_comment is null or length(v_comment)<3 or length(v_comment)>3000)
 then raise exception 'Ajuste exige mensagem entre 3 e 3000 caracteres' using errcode='22023';end if;
 if p_decision='approved' and v_comment is not null then
  raise exception 'Approval cannot carry an adjustment message' using errcode='22023';
 end if;
 select * into v_project from public.planning_projects
 where id=p_project_id and client_id=v_client for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 -- Only a currently linked client account may decide. A named project/phase
 -- approver supersedes sole-account fallback; multiple users without one fail closed.
 if not exists(select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_actor and cu.client_id=v_client and p.client_id=v_client and p.role='client')
 then raise exception 'Client account link required' using errcode='42501';end if;
 if exists(select 1 from rotevo_workflow.editorial_designated_approvers d
  where d.project_id=p_project_id and d.phase=p_phase and d.revoked_at is null)
 then
  if not exists(select 1 from rotevo_workflow.editorial_designated_approvers d
   where d.project_id=p_project_id and d.phase=p_phase and d.revoked_at is null
    and d.approver_user_id=v_actor)
  then raise exception 'Decision reserved for designated approver' using errcode='42501';end if;
 else
  select count(*) into v_client_approver_count
  from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_client and p.client_id=v_client and p.role='client';
  if v_client_approver_count<>1
  then raise exception 'Explicit approver designation required' using errcode='42501';end if;
 end if;
 if (jsonb_typeof(v_project.data->'portalModules')='array'
     and not (v_project.data->'portalModules' ? 'content'))
  or not exists (
    select 1 from public.client_workspaces w where w.client_id=v_client
      and jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content'
  )
 then raise exception 'Content module unavailable' using errcode='42501';end if;

 select count(*) into v_matches
 from jsonb_array_elements(
   case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
     then v_project.data->'editorialCalendar' else '[]'::jsonb end
 ) as e(value) where value->>'id'=p_content_id;
 select value,pos into v_item,v_position
 from jsonb_array_elements(
   case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
     then v_project.data->'editorialCalendar' else '[]'::jsonb end
 ) with ordinality as e(value,pos)
 where value->>'id'=p_content_id limit 1;
 if v_matches<>1 or v_item->>'visibleToClient' is distinct from 'true'
  or coalesce(v_item->>'version','')<>p_content_version
  or v_item ? 'deletedAt' and coalesce(v_item->>'deletedAt','')<>''
  or v_item ? 'archivedAt' and coalesce(v_item->>'archivedAt','')<>''
 then raise exception 'Content unavailable' using errcode='40001';end if;
 v_expected := case p_phase when 'idea' then 'idea' else 'awaiting_client' end;
 if not ((p_phase='idea' and v_item->>'status' in ('idea','idea_pending'))
       or (p_phase='final' and v_item->>'status'='awaiting_client')) then
  raise exception 'Content state unavailable' using errcode='40001';end if;

 v_new_status := case when p_phase='idea' and p_decision='changes_requested' then 'idea_changes'
                       when p_decision='changes_requested' then 'changes_requested'
                       when p_phase='idea' then 'idea_approved' else 'approved' end;
 v_kind := case when p_phase='idea' then 'editorial_idea_approvals' else 'editorial_approvals' end;
 v_key := 'editorial:' || p_project_id::text || ':' || p_phase || ':' ||
             p_content_id || ':' || p_content_version;
 select id into v_request_id from rotevo_workflow.approval_requests
 where project_id=p_project_id and resource_type='content' and resource_id=p_content_id
   and phase=p_phase and resource_version=p_content_version and status='pending'
 for update;
 if v_request_id is null then
  -- A newly shared idea must have an explicit pending request; only legacy statuses can bridge.
  if p_phase='idea' and v_item->>'status'='idea' then
    raise exception 'No pending idea approval request' using errcode='40001';
  end if;
  -- Bridge old `idea_pending` / `awaiting_client` entries without fabricating
  -- an earlier strategist request or creating a second source of approval.
  insert into rotevo_workflow.approval_requests(
   project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key,context)
  values(p_project_id,'content',p_content_id,p_phase,p_content_version,
         null,v_key,jsonb_build_object('origin','legacy_status_bridge'))
  returning id into v_request_id;
 end if;

 -- The legacy decision is inserted in the same transaction so old client views
 -- continue to read approval history. A request for adjustments writes one
 -- conversation message first, with no second comment editor.
 if p_decision='changes_requested' then
  -- No duplicate message_sent; formal adjustment emits adjustments_requested below.
  perform set_config('rotevo_workflow.skip_message_event','on',true);
  insert into public.rotevo_collaboration_messages(
   project_id,resource_type,resource_id,content_version,author_user_id,author_role,body)
  values(p_project_id,'content',p_content_id,p_content_version,v_actor,'client',v_comment)
  returning id into v_message_id;
  perform set_config('rotevo_workflow.skip_message_event','off',true);
 end if;
 if p_phase='idea' then
  insert into public.editorial_idea_approvals(
   project_id,content_id,content_version,decision,comment,decided_by)
  values(p_project_id,p_content_id,p_content_version,p_decision,v_comment,v_actor)
  returning id into v_legacy_id;
 else
  insert into public.editorial_approvals(
   project_id,content_id,content_version,decision,comment,decided_by)
  values(p_project_id,p_content_id,p_content_version,p_decision,v_comment,v_actor)
  returning id into v_legacy_id;
 end if;
 insert into rotevo_workflow.approval_decisions(
  request_id,decided_by,decision,adjustment_message_id,legacy_source,legacy_decision_id)
 values(v_request_id,v_actor,p_decision,v_message_id,v_kind,v_legacy_id);
 update public.planning_projects
 set data=jsonb_set(v_project.data,array['editorialCalendar',(v_position-1)::text,'status'],
                    to_jsonb(v_new_status),false),
     updated_at=clock_timestamp()
 where id=p_project_id;

 update rotevo_workflow.approval_requests set status=p_decision,decided_at=clock_timestamp()
 where id=v_request_id;
 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,actor_user_id,
  request_id,source_message_id,idempotency_key,metadata)
 values(p_project_id,'content',p_content_id,p_content_version,
        case when p_decision='approved' then 'approval_approved' else 'adjustments_requested' end,
        v_actor,v_request_id,v_message_id,'editorial-decision:'||v_key,
        jsonb_build_object('phase',p_phase,'decision',p_decision))
 returning id into v_event_id;

 -- Recipient IDs are derived from active, currently authorized team members,
 -- NEVER from customer-supplied text. Exclude actor. Do not include message body.
 insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
 select v_event_id,m.user_id
 from public.team_members m
 join public.profiles u on u.id=m.user_id and u.role in ('staff','strategist')
 where m.active and m.user_id<>v_actor
  and (
    m.role='admin'
    or (
      exists(select 1 from public.team_project_assignments a
        where a.user_id=m.user_id and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions q
        where q.user_id=m.user_id and q.permission in ('editorial.read','projects.read'))
    )
  )
 on conflict(event_id,recipient_user_id) do nothing;
 v_result:=jsonb_build_object(
  'status',v_new_status,'decision',p_decision,'contentVersion',p_content_version,
  'requestId',v_request_id,'legacyDecisionId',v_legacy_id,'messageId',v_message_id,
  'eventId',v_event_id);
 return v_result;
end
$fn$;
revoke all on function public.rotevo_editorial_workflow_decide(uuid,text,text,text,text,text)
 from PUBLIC,anon;
grant execute on function public.rotevo_editorial_workflow_decide(uuid,text,text,text,text,text)
 to authenticated;


-- =====================================================================
-- SOURCE: docs/security/sql/ui3-account-appearance-PROPOSAL-ONLY.sql
-- Previously approved in an isolated local Auth/PostgreSQL laboratory.
-- =====================================================================
-- ROTEVO UI3: per-account appearance preference, PROPOSAL ONLY.
-- Does NOT activate a dark theme or edit existing production user records.
-- Apply to disposable PostgreSQL first; production requires explicit authorization.

alter table public.user_preferences
 add column if not exists appearance text not null default 'system'
 constraint user_preferences_appearance_check check (appearance in ('light','dark','system'));

create or replace function public.rotevo_account_appearance_get()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_user uuid:=auth.uid();v_appearance text;
begin
 if v_user is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select appearance into v_appearance from public.user_preferences where user_id=v_user;
 return jsonb_build_object('appearance',coalesce(v_appearance,'system'));
end;
$fn$;
revoke all on function public.rotevo_account_appearance_get() from public,anon;
grant execute on function public.rotevo_account_appearance_get() to authenticated;

create or replace function public.rotevo_account_appearance_set(p_appearance text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_appearance is null or p_appearance not in ('light','dark','system')
 then raise exception 'Invalid appearance' using errcode='22023';end if;
 -- Preserves display_name and avatar_asset_id of any existing preference.
 insert into public.user_preferences(user_id,appearance,updated_at)
 values(v_user,p_appearance,clock_timestamp())
 on conflict(user_id) do update
 set appearance=excluded.appearance,updated_at=clock_timestamp();
 return jsonb_build_object('appearance',p_appearance);
end;
$fn$;
revoke all on function public.rotevo_account_appearance_set(text) from public,anon;
grant execute on function public.rotevo_account_appearance_set(text) to authenticated;

COMMIT;
