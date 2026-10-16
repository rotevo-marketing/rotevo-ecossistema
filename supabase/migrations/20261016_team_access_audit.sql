-- PROPOSED ONLY. Run in isolated homolgation database before production approval.
-- All team modifications must use this transactional RPC, not direct browser writes.
create table if not exists public.team_audit_events (
 id bigint generated always as identity primary key,
 actor_user_id uuid not null references auth.users(id),
 target_user_id uuid not null references auth.users(id),
 action text not null check(action in ('permission_granted','permission_revoked','project_assigned','project_unassigned','member_activated','member_deactivated')),
 detail jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
alter table public.team_audit_events enable row level security;
revoke all on public.team_audit_events from public, anon, authenticated;
-- No SELECT, INSERT, UPDATE or DELETE policy for user clients.
create or replace function public.rotevo_change_team_access(
 p_actor uuid, p_target uuid, p_action text, p_permission text default null,
 p_project uuid default null, p_enabled boolean default null
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
 elsif p_action='status' and p_permission is null and p_project is null and p_enabled is not null then
  update public.team_members set active=p_enabled,updated_at=now() where user_id=p_target;
  insert into public.team_audit_events(actor_user_id,target_user_id,action,detail)
   values(p_actor,p_target,case when p_enabled then 'member_activated' else 'member_deactivated' end,'{}'::jsonb);
 else
  raise exception 'invalid team operation' using errcode='22023';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.rotevo_change_team_access(uuid,uuid,text,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.rotevo_change_team_access(uuid,uuid,text,text,uuid,boolean) to service_role;
