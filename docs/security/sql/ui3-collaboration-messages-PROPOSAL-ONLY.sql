-- PROPOSAL ONLY — NEVER execute on hosted Supabase without a separate approval.
-- DB-only rehearsal must happen in an isolated Supabase-equivalent stack.
-- This is NOT a migration and is NOT applied by a GitHub merge.
-- API is gated by ROTEVO_COLLABORATION_ENABLED; default is disabled.
begin;
do $preflight$
begin
 if to_regclass('public.planning_projects') is null or to_regclass('auth.users') is null
 then raise exception 'Required project/auth tables absent'; end if;
 if to_regclass('public.rotevo_collaboration_messages') is not null
 then raise exception 'Conversation table already exists; review schema drift manually'; end if;
end;
$preflight$;
create table public.rotevo_collaboration_messages (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('task','content')),
 resource_id text not null check(length(resource_id) between 1 and 100 and resource_id ~ '^[A-Za-z0-9_-]+$'),
 author_user_id uuid not null references auth.users(id) on delete restrict,
 author_role text not null check(author_role in ('client','staff','strategist')),
 body text not null check (length(btrim(body)) between 1 and 3000 and length(body)<=3000),
 created_at timestamptz not null default now()
);
create index rotevo_collaboration_resource_order_idx
 on public.rotevo_collaboration_messages(project_id,resource_type,resource_id,created_at desc,id desc);
alter table public.rotevo_collaboration_messages enable row level security;
-- Policies are exclusively for the trusted backend role; no user-facing access.
create policy rotevo_collaboration_service_read on public.rotevo_collaboration_messages
 for select to service_role using (true);
create policy rotevo_collaboration_service_write on public.rotevo_collaboration_messages
 for insert to service_role with check (true);

-- No SELECT/INSERT/UPDATE/DELETE policies for browser roles. Server endpoint verifies JWT,
-- profile, tenant, workspace module, project assignment, resource sharing and author.
revoke all on public.rotevo_collaboration_messages from PUBLIC,anon,authenticated;
grant select,insert on public.rotevo_collaboration_messages to service_role;
do $postflight$
begin
 if has_table_privilege('anon','public.rotevo_collaboration_messages','SELECT')
 or has_table_privilege('authenticated','public.rotevo_collaboration_messages','SELECT')
 or has_table_privilege('authenticated','public.rotevo_collaboration_messages','INSERT')
 or not has_table_privilege('service_role','public.rotevo_collaboration_messages','SELECT')
 or not has_table_privilege('service_role','public.rotevo_collaboration_messages','INSERT')
 then raise exception 'Unexpected effective grants on collaboration table'; end if;
 if not (select relrowsecurity from pg_class where oid='public.rotevo_collaboration_messages'::regclass)
 then raise exception 'RLS disabled'; end if;
end;
$postflight$;
commit;
