-- UI3 client actions / submissions: PROPOSAL ONLY. NEVER apply to production without gate.
-- Assumes existing private schema rotevo_workflow. Run only after review of RLS/GRANT,
-- account approver contract, backup and rollback. No public EXECUTE grants or API exposure.
begin;
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
commit;

-- NON-EXECUTABLE INTEGRATION GATES
-- 1. Internal RPC must check auth.uid(), project's client_id, active client_users linkage,
--    assigned client_user_id, resource visibility, resource version, project/team/G2.
-- 2. Approved target users are explicit; client user names cannot authorize actions.
-- 3. Add server-side state transition, retry + optimistic concurrency, auditable events.
-- 4. No file storage: submissions contain only a validated Google Drive URL and optional note.
-- 5. A client submission cannot mutate editorial approval or publish status.
-- 6. No asynchronous reminders or notifications until recipient authorization is tested.
-- 7. If only SQL is applied, these tables remain unreachable: that is intentional.
