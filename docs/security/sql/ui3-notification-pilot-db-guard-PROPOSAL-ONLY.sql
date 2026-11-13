-- UI3 NOTIFICATION PILOT | PROPOSAL ONLY | NEVER DIRECTLY APPLY TO PRODUCTION
-- Defense in depth: direct /rest/v1/rpc calls obey the same named pilot restriction as Next.js.
-- Must be applied after private Gate B and notification read functions.
create table if not exists rotevo_workflow.notification_pilot_users (
 user_id uuid primary key references auth.users(id) on delete restrict,
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table rotevo_workflow.notification_pilot_users enable row level security;
revoke all on rotevo_workflow.notification_pilot_users from PUBLIC, anon, authenticated;
-- No rows inserted by migration: default deny. Named accounts require separate explicit authorization.
create or replace function rotevo_workflow.can_view_event(p_user uuid,p_event uuid)
returns boolean
language sql stable
security definer
set search_path=''
as $fn$
 select exists (
  select 1
  from rotevo_workflow.operational_events e
  join public.planning_projects p on p.id=e.project_id
  join public.profiles profile on profile.id=p_user
  where e.id=p_event
   and exists(select 1 from rotevo_workflow.notification_pilot_users pilot
     where pilot.user_id=p_user and pilot.enabled=true)
   and e.resource_type in ('content','task')
   and exists(
    select 1
    from jsonb_array_elements(
     case when jsonb_typeof(p.data->(case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end))='array'
      then p.data->(case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end) else '[]'::jsonb end
    ) as c(value)
    where c.value->>'id'=e.resource_id
      and (profile.role<>'client' or c.value->>'visibleToClient'='true')
      and coalesce(c.value->>'deletedAt','')=''
      and coalesce(c.value->>'archivedAt','')=''
   )
   and (
    (
     profile.role='client'
     and profile.client_id=p.client_id
     and (not (p.data ? 'portalModules') or
          jsonb_typeof(p.data->'portalModules')='array' and p.data->'portalModules' ? (case when e.resource_type='task' then 'execution' else 'content' end))
     and exists(select 1 from public.client_workspaces w
      where w.client_id=p.client_id and jsonb_typeof(w.data->'modules')='array'
      and w.data->'modules'?(case when e.resource_type='task' then 'execution' else 'content' end))
    )
    or (
     profile.role in ('strategist','staff')
     and exists(select 1 from public.team_members m where m.user_id=p_user
       and m.active and
       (m.role='admin' or
        exists(select 1 from public.team_project_assignments a
          where a.user_id=p_user and a.project_id=p.id)
        and exists(select 1 from public.team_member_permissions q
          where q.user_id=p_user and q.permission in ('editorial.read','projects.read'))
       )
     )
    )
   )
 );
$fn$;

revoke all on function rotevo_workflow.can_view_event(uuid,uuid) from PUBLIC,anon,authenticated;
