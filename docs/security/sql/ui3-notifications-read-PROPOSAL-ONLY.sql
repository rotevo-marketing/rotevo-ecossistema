-- Gate B: safe notification read/unread proposals, isolated lab only.
-- No hosted migrations. Access is checked against current G2 and item visibility
-- on EVERY call; a notification is not a transferable capability.
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
   and e.resource_type='content'
   and exists(
    select 1
    from jsonb_array_elements(
     case when jsonb_typeof(p.data->'editorialCalendar')='array'
      then p.data->'editorialCalendar' else '[]'::jsonb end
    ) as c(value)
    where c.value->>'id'=e.resource_id
      and c.value->>'visibleToClient'='true'
      and coalesce(c.value->>'deletedAt','')=''
      and coalesce(c.value->>'archivedAt','')=''
   )
   and (
    (
     profile.role='client'
     and profile.client_id=p.client_id
     and (not (p.data ? 'portalModules') or
          jsonb_typeof(p.data->'portalModules')='array' and p.data->'portalModules' ? 'content')
     and exists(select 1 from public.client_workspaces w
      where w.client_id=p.client_id and jsonb_typeof(w.data->'modules')='array'
      and w.data->'modules'?'content')
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
revoke all on function rotevo_workflow.can_view_event(uuid,uuid)
 from PUBLIC,anon,authenticated;

create or replace function public.rotevo_workflow_list_notifications(
 p_limit integer default 30,p_unread_only boolean default false
)
returns table(
 notification_id uuid,event_id uuid,project_id uuid,project_title text,
 resource_id text,resource_version text,event_type text,
 event_phase text,occurred_at timestamptz,read_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 50
 then raise exception 'Invalid page size' using errcode='22023';end if;
 return query
 select n.id,e.id,e.project_id,p.title,e.resource_id,e.resource_version,
        e.event_type,e.metadata->>'phase',e.occurred_at,n.read_at
 from rotevo_workflow.user_notifications n
 join rotevo_workflow.operational_events e on e.id=n.event_id
 join public.planning_projects p on p.id=e.project_id
 where n.recipient_user_id=v_actor
   and (not coalesce(p_unread_only,false) or n.read_at is null)
   and rotevo_workflow.can_view_event(v_actor,e.id)
 order by e.occurred_at desc,e.id desc
 limit p_limit;
end
$fn$;
revoke all on function public.rotevo_workflow_list_notifications(integer,boolean)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_list_notifications(integer,boolean)
 to authenticated;

create or replace function public.rotevo_workflow_mark_notification_read(
 p_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid();v_updated uuid;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 update rotevo_workflow.user_notifications n
 set read_at=coalesce(n.read_at,clock_timestamp())
 from rotevo_workflow.operational_events e
 where n.id=p_notification_id and n.recipient_user_id=v_actor
  and n.event_id=e.id and rotevo_workflow.can_view_event(v_actor,e.id)
 returning n.id into v_updated;
 return v_updated is not null;
end
$fn$;
revoke all on function public.rotevo_workflow_mark_notification_read(uuid)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_mark_notification_read(uuid)
 to authenticated;
