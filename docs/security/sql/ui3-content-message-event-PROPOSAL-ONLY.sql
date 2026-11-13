-- ROTEVO UI3. LAB PROPOSAL ONLY. Never apply directly to production.
-- Requires Gate B private tables and notification RPC; transactionally records message events.
CREATE OR REPLACE FUNCTION rotevo_workflow.record_content_message_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_project public.planning_projects%rowtype;
  v_actor public.profiles%rowtype;
  v_item jsonb;
  v_items_key text;
  v_module text;
  v_event uuid;
begin
  if current_setting('rotevo_workflow.skip_message_event',true)='on' then
    return new;
  end if;
  if new.resource_type not in ('content','task') then return new; end if;
  v_items_key:=case when new.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end;
  v_module:=case when new.resource_type='task' then 'execution' else 'content' end;

  select * into v_project from public.planning_projects where id=new.project_id;
  if not found then raise exception 'Message project unavailable' using errcode='42501'; end if;
  select * into v_actor from public.profiles where id=new.author_user_id;
  if not found or v_actor.role is distinct from new.author_role
  then raise exception 'Invalid message author' using errcode='42501'; end if;

  select e.value into v_item from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->v_items_key)='array'
         then v_project.data->v_items_key else '[]'::jsonb end
  ) as e(value) where e.value->>'id'=new.resource_id limit 1;

  if v_item is null
    or coalesce(v_item->>'deletedAt','')<>''
    or coalesce(v_item->>'archivedAt','')<>''
    or (new.content_version is not null and coalesce(v_item->>'version','')<>new.content_version)
  then raise exception 'Message item unavailable' using errcode='42501'; end if;

  if v_actor.role='client' then
    if v_actor.client_id is distinct from v_project.client_id
       or v_item->>'visibleToClient' is distinct from 'true'
       or (jsonb_typeof(v_project.data->'portalModules')='array'
           and not (v_project.data->'portalModules' ? v_module))
       or not exists(
         select 1 from public.client_workspaces w
         where w.client_id=v_project.client_id and
           jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? v_module)
    then raise exception 'Client message scope unavailable' using errcode='42501'; end if;
  elsif v_actor.role in ('staff','strategist') then
    if not exists (
      select 1 from public.team_members m where m.user_id=new.author_user_id
        and m.active and
        (m.role='admin' or
          (exists(select 1 from public.team_project_assignments a
            where a.user_id=m.user_id and a.project_id=v_project.id)
           and exists(select 1 from public.team_member_permissions q
            where q.user_id=m.user_id and q.permission in ('projects.write','editorial.write'))))
    ) then raise exception 'Team message scope unavailable' using errcode='42501'; end if;
  else
    raise exception 'Message author role unavailable' using errcode='42501';
  end if;

  insert into rotevo_workflow.operational_events(
    project_id,resource_type,resource_id,resource_version,event_type,
    actor_user_id,source_message_id,idempotency_key,metadata)
  values(new.project_id,new.resource_type,new.resource_id,new.content_version,'message_sent',
    new.author_user_id,new.id,'conversation-message:'||new.id::text,
    jsonb_strip_nulls(jsonb_build_object('origin','conversation','phase',case when new.resource_type='task' then 'task' else null end)))
  returning id into v_event;

  -- Audience is derived inside the same transaction. Never accept recipients from the request.
  -- Internal messages notify currently authorized team members. Team messages additionally
  -- notify client accounts only while the content is shared and client content module is on.
  insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
  select v_event,m.user_id
    from public.team_members m
    join public.profiles u on u.id=m.user_id and u.role in ('staff','strategist')
   where m.active and m.user_id<>new.author_user_id
     and (m.role='admin' or
       (exists(select 1 from public.team_project_assignments a
         where a.user_id=m.user_id and a.project_id=new.project_id)
        and exists(select 1 from public.team_member_permissions q
         where q.user_id=m.user_id and q.permission in ('editorial.read','projects.read'))))
  on conflict(event_id,recipient_user_id) do nothing;

  if new.author_role<>'client'
    and v_item->>'visibleToClient'='true'
    and (not(v_project.data ? 'portalModules') or
      (jsonb_typeof(v_project.data->'portalModules')='array' and
       v_project.data->'portalModules' ? v_module))
    and exists(select 1 from public.client_workspaces w
      where w.client_id=v_project.client_id
        and jsonb_typeof(w.data->'modules')='array' and w.data->'modules'?v_module)
  then
    insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
    select v_event,u.id from public.profiles u
    where u.client_id=v_project.client_id and u.role='client'
      and u.id<>new.author_user_id
    on conflict(event_id,recipient_user_id) do nothing;
  end if;
  return new;
end
$function$;

revoke all on function rotevo_workflow.record_content_message_event() from PUBLIC,anon,authenticated;
drop trigger if exists rotevo_workflow_content_message_event_insert on public.rotevo_collaboration_messages;
CREATE TRIGGER rotevo_workflow_content_message_event_insert AFTER INSERT ON public.rotevo_collaboration_messages FOR EACH ROW EXECUTE FUNCTION rotevo_workflow.record_content_message_event();