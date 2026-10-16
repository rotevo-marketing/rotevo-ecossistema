-- Exact SQL applied to the hosted project after verified private recovery.
-- Release record only: do not replay or include alongside the source proposals.
do $$ begin
if to_regclass('public.team_members') is not null or to_regclass('public.team_audit_events') is not null then raise exception 'Unexpected deployed team schema'; end if;
if (select count(*) from public.profiles p join auth.users u on u.id=p.id where lower(p.email)='contato@rotevo.com.br' and lower(u.email)=lower(p.email) and p.full_name='Otávio Silva' and p.role='strategist')<>1 then raise exception 'Owner identity preflight failed'; end if;
end $$;
-- STAGED SECURITY FIX - DO NOT APPLY BEFORE REVIEWING EXISTING SIGNUP / PROFILE-EDIT FLOWS.
-- Existing RLS allows users to UPDATE their own profiles, potentially including role and client_id.
-- PostgreSQL grants must restrict column writes independently of row policies.
-- Administrative profile changes must use a separately audited server-side flow.
revoke update on table public.profiles from anon, authenticated;
-- Permit changes to benign display information only.
grant update (full_name) on table public.profiles to authenticated;
-- Keep current RLS self-row policy so an authenticated user edits only their own name.
-- Staff role, client_id, email and account identity cannot be updated through client-side API.
-- Before applying, audit any code that writes profiles.email, profiles.updated_at,
-- profiles.role or profiles.client_id from a browser session.

-- PROPOSED ONLY. Do not apply before auditing the existing strategist policies.
-- Rotevo team membership and authorization metadata.
create table if not exists public.team_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 job_title text,
 avatar_url text,
 role text not null check (role in ('admin','strategist','project_manager','producer','finance')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.team_project_assignments (
 user_id uuid not null references public.team_members(user_id) on delete cascade,
 project_id uuid not null references public.planning_projects(id) on delete cascade,
 assigned_at timestamptz not null default now(),
 primary key (user_id,project_id)
);
create table if not exists public.team_member_permissions (
 user_id uuid not null references public.team_members(user_id) on delete cascade,
 permission text not null check(permission in ('projects.read','projects.write','tasks.read','tasks.write','editorial.read','editorial.write','meetings.read','finance.read','finance.write','team.manage')),
 granted_at timestamptz not null default now(),
 primary key(user_id,permission)
);
alter table public.team_members enable row level security;
alter table public.team_project_assignments enable row level security;
alter table public.team_member_permissions enable row level security;
revoke all on public.team_members,public.team_project_assignments,public.team_member_permissions from anon;
grant select on public.team_members,public.team_project_assignments,public.team_member_permissions to authenticated;
-- Safe read-only policy: only authenticated strategist accounts already recognized in profiles.
create policy "strategists read team directory" on public.team_members for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
create policy "strategists read team assignments" on public.team_project_assignments for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
create policy "strategists read team permissions" on public.team_member_permissions for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
-- No client-side insert/update/delete policies. Invitations and authorization management
-- will be handled by server-side admin endpoints after migration/RLS review.

-- Proposal for controlled rollout only. Never apply without verified database recovery.
-- The existing strategist role must not be granted to a restricted employee.
-- A separate profile role prevents accidental inheritance of legacy strategist policies.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('strategist','client','staff'));
-- Existing profiles are preserved. New staff identities must use role='staff'
-- and must never be allowed to update role or client_id from the browser.
revoke update on public.profiles from anon,authenticated;
grant update(full_name) on public.profiles to authenticated;
-- Exposed SECURITY DEFINER function is not intended as an anonymous RPC.
revoke execute on function public.is_strategist() from public,anon;
-- Authenticated is required to evaluate the existing RLS policies using this function.
grant execute on function public.is_strategist() to authenticated;

-- PROPOSED ONLY. Run in isolated homolgation database before production approval.
-- All team modifications must use this transactional RPC, not direct browser writes.
create table if not exists public.team_audit_events (
 id bigint generated always as identity primary key,
 actor_user_id uuid not null references auth.users(id),
 target_user_id uuid not null references auth.users(id),
 action text not null check(action in ('permission_granted','permission_revoked','project_assigned','project_unassigned','member_activated','member_deactivated','administrator_transferred')),
 detail jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
alter table public.team_audit_events enable row level security;
revoke all on public.team_audit_events from public, anon, authenticated;
-- No SELECT, INSERT, UPDATE or DELETE policy for user clients.
create or replace function public.rotevo_change_team_access(
 p_actor uuid, p_target uuid, p_action text, p_permission text default null,
 p_project uuid default null, p_enabled boolean default null, p_expected_active boolean default null
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare actor_role text; target_role text; target_active boolean;
begin
 if p_actor is null or p_target is null or p_actor=p_target then
  raise exception 'forbidden team operation' using errcode='42501';
 end if;
 select role into actor_role from public.team_members
  where user_id=p_actor and role='admin' and active=true for update;
 if actor_role is distinct from 'admin' then
  raise exception 'administrator required' using errcode='42501';
 end if;
 select role,active into target_role,target_active from public.team_members
  where user_id=p_target for update;
 if not found or target_role='admin' then
  raise exception 'target not permitted' using errcode='42501';
 end if;
 if p_action='permission' and p_permission is not null and p_project is null and p_enabled is not null and target_active=true then
  if p_permission not in ('projects.read','projects.write','tasks.read','tasks.write','editorial.read','editorial.write','meetings.read','finance.read','finance.write') then
   raise exception 'invalid permission' using errcode='22023';
  end if;
  if p_enabled then
   insert into public.team_member_permissions(user_id,permission) values(p_target,p_permission)
   on conflict(user_id,permission) do nothing;
  else
   delete from public.team_member_permissions where user_id=p_target and permission=p_permission;
  end if;
  insert into public.team_audit_events(actor_user_id,target_user_id,action,detail)
   values(p_actor,p_target,case when p_enabled then 'permission_granted' else 'permission_revoked' end,jsonb_build_object('permission',p_permission));
 elsif p_action='assignment' and p_project is not null and p_permission is null and p_enabled is not null and target_active=true then
  if not exists(select 1 from public.planning_projects where id=p_project) then
   raise exception 'project missing' using errcode='22023';
  end if;
  if p_enabled then
   insert into public.team_project_assignments(user_id,project_id) values(p_target,p_project)
   on conflict(user_id,project_id) do nothing;
  else
   delete from public.team_project_assignments where user_id=p_target and project_id=p_project;
  end if;
  insert into public.team_audit_events(actor_user_id,target_user_id,action,detail)
   values(p_actor,p_target,case when p_enabled then 'project_assigned' else 'project_unassigned' end,jsonb_build_object('project_id',p_project));
 elsif p_action='status' and p_permission is null and p_project is null and p_enabled is not null and p_expected_active is not null then
  if target_active is distinct from p_expected_active then
   raise exception 'member status changed concurrently' using errcode='40001';
  end if;
  update public.team_members set active=p_enabled,updated_at=now() where user_id=p_target;
  insert into public.team_audit_events(actor_user_id,target_user_id,action,detail)
   values(p_actor,p_target,case when p_enabled then 'member_activated' else 'member_deactivated' end,'{}'::jsonb);
 else
  raise exception 'invalid team operation' using errcode='22023';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.rotevo_change_team_access(uuid,uuid,text,text,uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.rotevo_change_team_access(uuid,uuid,text,text,uuid,boolean,boolean) to service_role;

-- Staged one-step admin succession. Promotes replacement before demoting outgoing admin.
create or replace function public.rotevo_transfer_team_admin(p_actor uuid,p_target uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare actor_role text; target_role text; target_active boolean;
begin
 if p_actor is null or p_target is null or p_actor=p_target then
  raise exception 'invalid administrator succession' using errcode='42501';
 end if;
 select role into actor_role from public.team_members
  where user_id=p_actor and role='admin' and active=true for update;
 if actor_role is distinct from 'admin' then
  raise exception 'active administrator required' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='strategist') then
  raise exception 'verified strategist profile required' using errcode='42501';
 end if;
 select role,active into target_role,target_active from public.team_members
  where user_id=p_target for update;
 if not found or target_role='admin' or target_active is distinct from true then
  raise exception 'active nonadministrator replacement required' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles where id=p_target and role='strategist') then
  raise exception 'replacement requires strategist profile' using errcode='42501';
 end if;
 update public.team_members set role='admin',updated_at=now() where user_id=p_target;
 update public.team_members set role='strategist',updated_at=now() where user_id=p_actor;
 insert into public.team_audit_events(actor_user_id,target_user_id,action,detail)
  values(p_actor,p_target,'administrator_transferred',jsonb_build_object('outgoing_admin',p_actor,'incoming_admin',p_target));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.rotevo_transfer_team_admin(uuid,uuid) from public, anon, authenticated;
grant execute on function public.rotevo_transfer_team_admin(uuid,uuid) to service_role;

-- Apply only after verified production backup/restore and compatibility validation.
-- TRUNCATE is not subject to row-level security. No browser role needs it.
revoke truncate, references, trigger on table public.clients, public.client_users,
 public.planning_projects, public.profiles from public, anon, authenticated;
-- Profile identities and tenant/role associations are managed by the server only.
revoke insert, delete, update on table public.profiles from public, anon, authenticated;
-- Remove column-level grants too: a table REVOKE does not remove independent grants.
do $$
declare columns text;
begin
 select string_agg(quote_ident(attname), ',') into columns
 from pg_attribute where attrelid='public.profiles'::regclass
 and attnum>0 and not attisdropped;
 execute format('revoke insert (%s), update (%s), references (%s) on public.profiles from public, anon, authenticated', columns, columns, columns);
end $$;
grant update(full_name) on public.profiles to authenticated;
-- Hosted Supabase default privileges can otherwise grant new tables ALL.
revoke all on table public.team_members, public.team_project_assignments,
 public.team_member_permissions from public, anon, authenticated;
grant select on table public.team_members, public.team_project_assignments,
 public.team_member_permissions to authenticated;
grant all on table public.team_members, public.team_project_assignments,
 public.team_member_permissions, public.team_audit_events to service_role;
grant usage, select on sequence public.team_audit_events_id_seq to service_role;

-- Existing authenticated cover policies allow cross-project writes by clients.
-- Preserve existing strategist upload flows; restricted staff use server APIs only.
create policy rotevo_storage_insert_strategist_only on storage.objects
 as restrictive for insert to authenticated
 with check ((select public.is_strategist()));
create policy rotevo_storage_update_strategist_only on storage.objects
 as restrictive for update to authenticated
 using ((select public.is_strategist())) with check ((select public.is_strategist()));
create policy rotevo_storage_delete_strategist_only on storage.objects
 as restrictive for delete to authenticated
 using ((select public.is_strategist()));

-- Activate the explicitly identified ROTEVO owner only after team_roles has been applied.
-- Fail closed if identity is absent, duplicated, renamed, or not a strategist.
do $$
declare owner_id uuid;
begin
 select p.id into strict owner_id
 from public.profiles p
 join auth.users u on u.id=p.id
 where lower(p.email)='contato@rotevo.com.br'
   and lower(u.email)='contato@rotevo.com.br'
   and p.full_name='Otávio Silva'
   and p.role='strategist';
 if exists(select 1 from public.team_members where role='admin' and user_id<>owner_id) then
  raise exception 'Unexpected existing team administrator; manual review required';
 end if;
 insert into public.team_members(user_id,display_name,role,active)
 values(owner_id,'Otávio Silva','admin',true)
 on conflict(user_id) do update
 set display_name=excluded.display_name,role='admin',active=true,updated_at=now()
 where public.team_members.role='admin';
 if not exists(select 1 from public.team_members where user_id=owner_id and role='admin' and active) then
  raise exception 'Owner membership conflicts with an existing non-admin record';
 end if;
end $$;
