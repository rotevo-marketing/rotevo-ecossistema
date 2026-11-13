-- ROTEVO UI3 / GATE B: PROPOSAL ONLY. DO NOT APPLY TO ANY HOSTED DB.
-- Requires approved migration, G2/E2E tests and explicit production release approval.
-- No grants to anon/authenticated and no public RPCs. Application/API remains disabled.
begin;
create schema if not exists rotevo_workflow;
revoke all on schema rotevo_workflow from public, anon, authenticated;

create table if not exists rotevo_workflow.approval_requests (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('content','task','document','campaign')),
 resource_id text not null check(length(resource_id) between 1 and 100),
 phase text not null check(phase in ('idea','final','delivery')),
 resource_version text not null check(length(resource_version) between 1 and 80),
 requested_by uuid not null references auth.users(id) on delete restrict,
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
commit;
