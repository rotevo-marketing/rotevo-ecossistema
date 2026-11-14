-- UI3 PR17 | PRODUCTION NOTIFICATION V2 — PROPOSAL ONLY, NOT AUTHORIZED FOR EXECUTION.
-- Target only project kadvzjelkyfwouqmlxaa, after a separately approved production maintenance window.
-- Preconditions must be re-verified immediately before application. No client data mutation.
begin;
do $guard$
begin
 if to_regclass('rotevo_workflow.client_action_assignments') is null or
    to_regclass('rotevo_workflow.client_action_submissions') is null or
    to_regclass('rotevo_workflow.operational_events') is null or
    to_regclass('rotevo_workflow.user_notifications') is null then
    raise exception 'Production workflow prerequisites are missing: abort';
 end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='rotevo_workflow' and not t.tgisinternal
      and t.tgname in ('ui3_client_action_assignment_notice',
       'ui3_client_action_submission_notice','ui3_client_action_review_notice')) <> 3 then
     raise exception 'Expected three existing production notification triggers: abort';
 end if;
 if to_regprocedure('public.rotevo_workflow_list_notifications_v2(integer,boolean)') is not null
    or to_regprocedure('public.rotevo_workflow_mark_notification_read_v2(uuid)') is not null
    or to_regprocedure('rotevo_workflow.can_view_event_v2(uuid,uuid)') is not null then
    raise exception 'V2 already installed: stop and inspect, do not overwrite';
 end if;
end $guard$;
create table if not exists rotevo_workflow.notification_pilot_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table rotevo_workflow.notification_pilot_users enable row level security;
revoke all on rotevo_workflow.notification_pilot_users from PUBLIC,anon,authenticated;
-- No recipient is enabled by this proposal.

-- This private helper is intentionally SECURITY DEFINER because the workflow
-- tables are private and have no authenticated grants. It does not trust p_user
-- by itself as authorization for the public entry points below use auth.uid().
create or replace function rotevo_workflow.can_view_event_v2(p_user uuid,p_event uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
select exists (
 select 1
 from rotevo_workflow.operational_events e
 join public.planning_projects project on project.id=e.project_id
 join public.profiles profile on profile.id=p_user
 where e.id=p_event
   and exists(select 1 from rotevo_workflow.notification_pilot_users pilot
              where pilot.user_id=p_user and pilot.enabled=true)
   and e.resource_type in ('content','task')
   and exists (
    select 1 from pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(project.data->
      (case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end))='array'
     then project.data->(case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end)
     else '[]'::jsonb end) element(value)
    where element.value->>'id'=e.resource_id
      and coalesce(element.value->>'deletedAt','')=''
      and coalesce(element.value->>'archivedAt','')=''
      and (
       profile.role in ('staff','strategist')
       or element.value->>'visibleToClient'='true'
      )
      and (
       e.resource_type<>'content'
       or e.resource_version is null
       or coalesce(element.value->>'version','')=e.resource_version
      )
   )
   and (
    (
     profile.role='client'
     and profile.client_id=project.client_id
     and exists(
       select 1 from public.client_users cu
       where cu.user_id=p_user and cu.client_id=project.client_id
     )
     and (
      -- A private client action may be viewed without granting the entire execution module.
      -- The same user must be the explicit assignee, and the event must be tied
      -- to exactly that assignment, project, resource and current version.
      (
       e.event_type in ('assignment_changed','item_ready','task_delivery_accepted')
       and e.metadata->>'actionId' is not null
       and exists(
        select 1 from rotevo_workflow.client_action_assignments assignment
        where assignment.id::text=e.metadata->>'actionId'
          and assignment.project_id=e.project_id
          and assignment.resource_type=e.resource_type
          and assignment.resource_id=e.resource_id
          and coalesce(assignment.resource_version,'')=
              coalesce(e.resource_version,'')
          and assignment.client_user_id=p_user
          and assignment.released_at is not null
          and assignment.status<>'cancelled'
       )
      )
      or
      -- Ordinary editorial/task notifications still require module sharing.
      (
       (
        not (project.data ? 'portalModules')
        or (
         pg_catalog.jsonb_typeof(project.data->'portalModules')='array'
         and project.data->'portalModules'?
            (case when e.resource_type='task' then 'execution' else 'content' end)
        )
       )
       and exists(
        select 1 from public.client_workspaces w
        where w.client_id=project.client_id
         and pg_catalog.jsonb_typeof(w.data->'modules')='array'
         and w.data->'modules'?
           (case when e.resource_type='task' then 'execution' else 'content' end)
       )
       and (e.metadata->>'actionId' is null)
      )
     )
    )
    or
    (
     profile.role in ('staff','strategist')
     and exists(
      select 1 from public.team_members m
      where m.user_id=p_user and m.active
       and (
        m.role='admin'
        or (
         exists(select 1 from public.team_project_assignments a
                where a.user_id=p_user and a.project_id=project.id)
         and exists(select 1 from public.team_member_permissions g
           where g.user_id=p_user and g.permission in ('projects.read','editorial.read'))
        )
       )
     )
     and (
      e.metadata->>'actionId' is null
      or exists(
       select 1 from rotevo_workflow.client_action_assignments assignment
       where assignment.id::text=e.metadata->>'actionId'
        and assignment.project_id=e.project_id
        and assignment.resource_type=e.resource_type
        and assignment.resource_id=e.resource_id
        and coalesce(assignment.resource_version,'')=
            coalesce(e.resource_version,'')
        and coalesce(assignment.internal_owner_user_id,assignment.created_by)=p_user
      )
     )
    )
   )
);
$fn$;
revoke all on function rotevo_workflow.can_view_event_v2(uuid,uuid)
 from PUBLIC,anon,authenticated;

create or replace function public.rotevo_workflow_list_notifications_v2(
 p_limit integer default 30,p_unread_only boolean default false)
returns table(
 notification_id uuid,event_id uuid,project_id uuid,project_title text,
 resource_id text,resource_version text,event_type text,event_phase text,
 action_id text,occurred_at timestamptz,read_at timestamptz
) language plpgsql stable security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 50
 then raise exception 'Invalid notification limit' using errcode='22023';end if;
 return query
 select n.id,e.id,e.project_id,project.title,e.resource_id,e.resource_version,
        e.event_type,e.metadata->>'phase',e.metadata->>'actionId',e.occurred_at,n.read_at
 from rotevo_workflow.user_notifications n
 join rotevo_workflow.operational_events e on e.id=n.event_id
 join public.planning_projects project on project.id=e.project_id
 where n.recipient_user_id=v_actor
   and (not coalesce(p_unread_only,false) or n.read_at is null)
   and rotevo_workflow.can_view_event_v2(v_actor,e.id)
 order by e.occurred_at desc,e.id desc
 limit p_limit;
end;
$fn$;
revoke all on function public.rotevo_workflow_list_notifications_v2(integer,boolean)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_list_notifications_v2(integer,boolean)
 to authenticated;

create or replace function public.rotevo_workflow_mark_notification_read_v2(
 p_notification_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();v_updated uuid;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 update rotevo_workflow.user_notifications n
 set read_at=coalesce(n.read_at,pg_catalog.clock_timestamp())
 from rotevo_workflow.operational_events e
 where n.id=p_notification_id and n.recipient_user_id=v_actor
   and n.event_id=e.id and rotevo_workflow.can_view_event_v2(v_actor,e.id)
 returning n.id into v_updated;
 return v_updated is not null;
end;
$fn$;
revoke all on function public.rotevo_workflow_mark_notification_read_v2(uuid)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_mark_notification_read_v2(uuid)
 to authenticated;
commit;
