-- PROPOSAL ONLY: DO NOT APPLY TO HOSTED ROTEVO UNTIL DATABASE BACKUP + RESTORE GATE
-- Isolated, append-only collaboration. Application server performs tenant/visibility authorization before each access.
begin;
create table if not exists public.project_collaboration_messages(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 item_type text not null check(item_type in ('task','content')),
 item_id text not null check(length(item_id) between 1 and 100),
 content_version text not null default '' check(length(content_version)<=30),
 message_type text not null default 'comment' check(message_type in ('comment','task_approved','task_changes_requested')),
 body text not null check(length(btrim(body)) between 1 and 2000),
 author_id uuid not null references auth.users(id) on delete restrict,
 author_kind text not null check(author_kind in ('client','strategist')),
 created_at timestamptz not null default clock_timestamp(),
 constraint task_review_type_check check(message_type='comment' or (item_type='task' and author_kind='client')),
 constraint task_review_reason_check check(message_type<>'task_changes_requested' or length(btrim(body))>=3)
);
create index if not exists project_collaboration_messages_lookup_idx on public.project_collaboration_messages(project_id,item_type,item_id,created_at,id);
create index if not exists project_collaboration_messages_rate_idx on public.project_collaboration_messages(author_id,created_at desc);
alter table public.project_collaboration_messages enable row level security;
revoke all on public.project_collaboration_messages from public,anon,authenticated;
grant select,insert on public.project_collaboration_messages to service_role;
-- No direct client RLS policy; authorized server verifies current item ownership/visibility per request.
commit;
