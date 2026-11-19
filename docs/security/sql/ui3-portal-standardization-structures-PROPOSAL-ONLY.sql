-- PROPOSAL ONLY. Review, backup and explicit authorization required. Not applied.
begin;
create or replace function rotevo_workflow.client_resource_visible(p_type text,p_resource jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(p_resource)='object'
 and coalesce(p_resource->>'deletedAt','')='' and coalesce(p_resource->>'archivedAt','')=''
 and case when p_type='task' and p_resource->>'kind'='task'
  then coalesce(p_resource->>'clientVisibility','project')<>'confidential'
  else p_resource->>'visibleToClient'='true' end,false)
$$;
revoke all on function rotevo_workflow.client_resource_visible(text,jsonb) from public,anon;
grant execute on function rotevo_workflow.client_resource_visible(text,jsonb) to authenticated,service_role;

create or replace function public.rotevo_provision_client_profile(
 p_user_id uuid,p_client_id uuid,p_full_name text,p_email text,p_enroll_notifications boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.profiles%rowtype;
begin
 if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'Service only' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if p_user_id is null or p_client_id is null or p_full_name is null or p_email is null
 or length(btrim(p_email)) not between 3 and 320
 or not exists(select 1 from public.clients where id=p_client_id and status='active')
 or not exists(select 1 from auth.users where id=p_user_id and lower(email)=lower(p_email))
 or length(btrim(p_full_name)) not between 1 and 200 then
 raise exception 'Invalid client identity' using errcode='22023';end if;
 select * into existing from public.profiles where id=p_user_id for update;
 if found and (existing.role is distinct from 'client' or existing.client_id is distinct from p_client_id)
 then raise exception 'Identity already belongs to another scope' using errcode='42501';end if;
 if exists(select 1 from public.client_users where user_id=p_user_id and client_id<>p_client_id)
 then raise exception 'Conflicting client association' using errcode='42501';end if;
 insert into public.profiles(id,full_name,email,role,client_id,updated_at)
 values(p_user_id,p_full_name,p_email,'client',p_client_id,clock_timestamp()) on conflict(id) do nothing;
 insert into public.client_users(client_id,user_id) values(p_client_id,p_user_id) on conflict(client_id,user_id) do nothing;
 if p_enroll_notifications then
  insert into rotevo_workflow.notification_pilot_users(user_id,enabled) values(p_user_id,true)
  on conflict(user_id) do update set enabled=true;
 end if;
 return jsonb_build_object('userId',p_user_id,'clientId',p_client_id);
end $$;
revoke all on function public.rotevo_provision_client_profile(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.rotevo_provision_client_profile(uuid,uuid,text,text,boolean) to service_role;

create or replace function public.rotevo_workflow_notification_access()
returns text language sql stable security definer set search_path='' as $$
 select case
 when auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then null
 when not exists(select 1 from rotevo_workflow.notification_pilot_users n where n.user_id=auth.uid() and n.enabled) then null
 when exists(select 1 from public.profiles p join public.client_users u on u.user_id=p.id and u.client_id=p.client_id
  join public.clients c on c.id=p.client_id where p.id=auth.uid() and p.role='client' and c.status='active') then 'client'
 when exists(select 1 from public.profiles p join public.team_members t on t.user_id=p.id where p.id=auth.uid() and p.role in ('strategist','staff') and t.active) then 'team'
 else null end
$$;
revoke all on function public.rotevo_workflow_notification_access() from public,anon;
grant execute on function public.rotevo_workflow_notification_access() to authenticated,service_role;

create or replace function public.rotevo_workflow_unread_notification_count()
returns bigint language plpgsql stable security definer set search_path='' as $$
begin
 if public.rotevo_workflow_notification_access() is null then raise exception 'Access denied' using errcode='42501';end if;
 return (select count(*) from rotevo_workflow.user_notifications n
 where n.recipient_user_id=auth.uid() and n.read_at is null and rotevo_workflow.can_view_event_v2(auth.uid(),n.event_id));
end $$;
revoke all on function public.rotevo_workflow_unread_notification_count() from public,anon;
grant execute on function public.rotevo_workflow_unread_notification_count() to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.rotevo_client_action_create(p_project_id uuid, p_resource_type text, p_resource_id text, p_resource_version text, p_client_user_id uuid, p_action_type text, p_instructions text, p_due_date date, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_found integer;
 v_id uuid;
 v_existing rotevo_workflow.client_action_assignments%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role is distinct from 'staff' and v_role is distinct from 'strategist' then
  raise exception 'Only team can assign client actions' using errcode='42501';end if;
 if p_resource_type not in ('content','task') or p_resource_id is null
  or p_resource_id !~ '^[a-zA-Z0-9_-]{1,180}$'
  or (p_resource_type='content' and (p_resource_version is null or length(btrim(p_resource_version)) not between 1 and 80))
  or p_action_type not in ('record_video','send_material','provide_information','review_material','custom')
  or p_instructions is null or length(btrim(p_instructions)) not between 3 and 4000
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9:_-]{8,250}$'
 then raise exception 'Invalid action request' using errcode='22023';end if;

 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.team_members m where m.user_id=v_actor and m.active
   and (m.role='admin' or (
    exists(select 1 from public.team_project_assignments a where a.user_id=v_actor and a.project_id=p_project_id)
    and exists(select 1 from public.team_member_permissions g where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 write denied' using errcode='42501';end if;
 -- Both account tables must agree. Visibility of the content alone cannot grant an assignment.
 if not exists(
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.client_id=v_project.client_id and u.user_id=p_client_user_id
   and p.client_id=v_project.client_id and p.role='client'
 ) then raise exception 'Client user not linked to project tenant' using errcode='42501';end if;

 select count(*),(jsonb_agg(e.value)->0) into v_found,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
   then v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
   else '[]'::jsonb end) e(value)
 where value->>'id'=p_resource_id;
 if v_found<>1 or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
   or not rotevo_workflow.client_resource_visible(p_resource_type,v_resource)
   or (p_resource_type='content' and coalesce(v_resource->>'version','')<>p_resource_version)
 then raise exception 'Resource unavailable or version changed' using errcode='40001';end if;

 -- Same idempotency key can return same assignment but cannot be repurposed.
 select * into v_existing from rotevo_workflow.client_action_assignments where idempotency_key=p_request_key;
 if found then
  if v_existing.project_id<>p_project_id or v_existing.resource_type<>p_resource_type
    or v_existing.resource_id<>p_resource_id or coalesce(v_existing.resource_version,'')<>coalesce(p_resource_version,'')
    or v_existing.client_user_id<>p_client_user_id or v_existing.action_type<>p_action_type
    or v_existing.instructions<>btrim(p_instructions) or v_existing.due_date is distinct from p_due_date
  then raise exception 'Idempotency key reused with changed request' using errcode='23505';end if;
  return jsonb_build_object('id',v_existing.id,'status',v_existing.status,'replayed',true);
 end if;
 insert into rotevo_workflow.client_action_assignments(
  project_id,resource_type,resource_id,resource_version,action_type,
  client_user_id,instructions,due_date,status,ready_at,released_at,created_by,idempotency_key)
 values(p_project_id,p_resource_type,p_resource_id,p_resource_version,p_action_type,
  p_client_user_id,btrim(p_instructions),p_due_date,'pending',clock_timestamp(),clock_timestamp(),v_actor,p_request_key)
 returning id into v_id;
 return jsonb_build_object('id',v_id,'status','pending','replayed',false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.rotevo_client_action_list(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_results jsonb;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id;
 if not found or not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_actor and cu.client_id=v_project.client_id
   and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Client tenant access denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id,'projectId',a.project_id,'resourceType',a.resource_type,
  'resourceId',a.resource_id,'resourceVersion',a.resource_version,
  'actionType',a.action_type,'instructions',a.instructions,
  'dueDate',a.due_date,'status',a.status,'updatedAt',a.updated_at)
  order by a.due_date nulls last,a.created_at), '[]'::jsonb)
 into v_results
 from rotevo_workflow.client_action_assignments a
 where a.project_id=p_project_id and a.client_user_id=v_actor
  and a.released_at is not null and a.status<>'cancelled'
  and exists (
   select 1 from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->(case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
    then v_project.data->(case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
    else '[]'::jsonb end
   ) e(value)
   where e.value->>'id'=a.resource_id and rotevo_workflow.client_resource_visible(a.resource_type,e.value)
    and coalesce(e.value->>'archivedAt','')='' and coalesce(e.value->>'deletedAt','')=''
    and (a.resource_type<>'content' or coalesce(e.value->>'version','')=a.resource_version)
  );
 return v_results;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rotevo_client_action_submit(p_assignment_id uuid, p_note text, p_request_key text, p_drive_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid();
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_count integer;
 v_attempt integer;
 v_submission uuid;
 v_existing rotevo_workflow.client_action_submissions%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_note is null or length(p_note)>4000
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9:_-]{8,250}$'
  or p_drive_url is null or length(p_drive_url)>2048
  or p_drive_url ~ '[[:space:]#@]'
  or not (
   p_drive_url ~ '^https://drive[.]google[.]com/(file/d/|drive/folders/|drive/u/[0-9]+/folders/)[A-Za-z0-9_-]+'
   or p_drive_url ~ '^https://drive[.]google[.]com/(open|uc)[?]id=[A-Za-z0-9_-]+'
   or p_drive_url ~ '^https://docs[.]google[.]com/(document|spreadsheets|presentation|forms|drawings|videos)/d/[A-Za-z0-9_-]+'
  )
 then raise exception 'Invalid Drive URL or submission' using errcode='22023';end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments
 where id=p_assignment_id for update;
 if not found or v_assignment.client_user_id<>v_actor or v_assignment.released_at is null
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found or not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_actor and cu.client_id=v_project.client_id
   and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Client access revoked' using errcode='42501';end if;
 select count(*),(jsonb_agg(e.value)->0) into v_count,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(case when v_assignment.resource_type='content'
    then 'editorialCalendar' else 'executionTimeline' end))='array'
  then v_project.data->(case when v_assignment.resource_type='content'
    then 'editorialCalendar' else 'executionTimeline' end)
  else '[]'::jsonb end
 ) e(value) where e.value->>'id'=v_assignment.resource_id;
 if v_count<>1 or not rotevo_workflow.client_resource_visible(v_assignment.resource_type,v_resource)
  or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
  or (v_assignment.resource_type='content' and
      coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then raise exception 'Resource revoked or version changed' using errcode='40001';end if;
 select * into v_existing from rotevo_workflow.client_action_submissions
 where request_key=p_request_key;
 if found then
  if v_existing.assignment_id<>p_assignment_id or v_existing.submitted_by<>v_actor
   or v_existing.note<>btrim(p_note) or v_existing.submission_url<>p_drive_url
  then raise exception 'Idempotency key reused with changed payload' using errcode='23505';end if;
  return jsonb_build_object('id',v_existing.id,'status',v_existing.review_status,'replayed',true);
 end if;
 if v_assignment.status not in ('pending','in_progress','correction_requested')
 then raise exception 'Assignment does not accept new submission' using errcode='40001';end if;
 select coalesce(max(attempt_number),0)+1 into v_attempt
 from rotevo_workflow.client_action_submissions where assignment_id=p_assignment_id;
 insert into rotevo_workflow.client_action_submissions(
  assignment_id,submitted_by,note,submission_url,attempt_number,request_key)
 values(p_assignment_id,v_actor,btrim(p_note),p_drive_url,v_attempt,p_request_key)
 returning id into v_submission;
 update rotevo_workflow.client_action_assignments
 set status='submitted',updated_at=clock_timestamp() where id=p_assignment_id;
 return jsonb_build_object('id',v_submission,'status','submitted','replayed',false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.rotevo_client_action_review(p_assignment_id uuid, p_submission_id uuid, p_decision text, p_feedback text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_submission rotevo_workflow.client_action_submissions%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_matches integer;
 v_new_status text;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_decision not in ('validated','correction_requested')
   or p_feedback is null or length(p_feedback)>4000
   or (p_decision='correction_requested' and length(btrim(p_feedback))<3)
 then raise exception 'Invalid review decision or feedback' using errcode='22023';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role is distinct from 'staff' and v_role is distinct from 'strategist'
 then raise exception 'Only team can review assignments' using errcode='42501';end if;

 select * into v_assignment from rotevo_workflow.client_action_assignments
  where id=p_assignment_id for update;
 if not found or v_assignment.released_at is null or v_assignment.status='cancelled'
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.team_members m where m.user_id=v_actor and m.active
   and (m.role='admin' or (
     exists(select 1 from public.team_project_assignments a
       where a.user_id=v_actor and a.project_id=v_assignment.project_id)
     and exists(select 1 from public.team_member_permissions g
       where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 review denied' using errcode='42501';end if;

 -- A revoked client must not have its unreviewed submission implicitly approved.
 if not exists(
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.client_id=v_project.client_id and u.user_id=v_assignment.client_user_id
    and p.client_id=v_project.client_id and p.role='client'
 ) then raise exception 'Assigned client was unlinked' using errcode='42501';end if;

 select count(*),(jsonb_agg(e.value)->0) into v_matches,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(
   case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
  then v_project.data->(
   case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
  else '[]'::jsonb end) e(value)
 where e.value->>'id'=v_assignment.resource_id;
 if v_matches<>1 or not rotevo_workflow.client_resource_visible(v_assignment.resource_type,v_resource)
 or coalesce(v_resource->>'deletedAt','')<>'' or coalesce(v_resource->>'archivedAt','')<>''
 or (v_assignment.resource_type='content'
   and coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then raise exception 'Resource revoked or version changed' using errcode='40001';end if;

 select * into v_submission from rotevo_workflow.client_action_submissions
 where id=p_submission_id and assignment_id=p_assignment_id for update;
 if not found then raise exception 'Submission unavailable' using errcode='42501';end if;
 if v_submission.submitted_by<>v_assignment.client_user_id
 then raise exception 'Unexpected submission owner' using errcode='42501';end if;

 -- Replaying an identical successful decision is safe; a different decision is a conflict.
 if v_submission.reviewed_at is not null then
  if v_submission.reviewed_by=v_actor
   and v_submission.review_status=p_decision
   and coalesce(v_submission.reviewer_feedback,'')=coalesce(nullif(btrim(p_feedback),''),'')
  then return jsonb_build_object('submissionId',v_submission.id,
    'status',v_submission.review_status,'replayed',true);end if;
  raise exception 'Submission already reviewed' using errcode='40001';
 end if;
 if v_assignment.status<>'submitted'
 then raise exception 'Assignment no longer awaiting review' using errcode='40001';end if;
 if exists(
  select 1 from rotevo_workflow.client_action_submissions newer
  where newer.assignment_id=p_assignment_id
    and newer.attempt_number>v_submission.attempt_number
 ) then raise exception 'Cannot review a stale submission' using errcode='40001';end if;

 v_new_status:=p_decision;
 update rotevo_workflow.client_action_submissions
 set review_status=v_new_status,reviewed_by=v_actor,reviewed_at=clock_timestamp(),
   reviewer_feedback=nullif(btrim(p_feedback),'')
 where id=p_submission_id;
 update rotevo_workflow.client_action_assignments
 set status=v_new_status,
     completed_at=case when v_new_status='validated' then clock_timestamp() else null end,
     updated_at=clock_timestamp()
 where id=p_assignment_id;
 return jsonb_build_object('submissionId',p_submission_id,'status',v_new_status,'replayed',false);
end;
$function$;

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
       or not rotevo_workflow.client_resource_visible(new.resource_type,v_item)
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
  on conflict(idempotency_key) do nothing returning id into v_event;
  if v_event is null then select id into v_event from rotevo_workflow.operational_events where idempotency_key='conversation-message:'||new.id::text;end if;

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
    and rotevo_workflow.client_resource_visible(new.resource_type,v_item)
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
      and exists(select 1 from public.client_users link
        where link.user_id=u.id and link.client_id=v_project.client_id)
    on conflict(event_id,recipient_user_id) do nothing;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION rotevo_workflow.can_view_event_v2(p_user uuid, p_event uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
       or rotevo_workflow.client_resource_visible(e.resource_type,element.value)
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
$function$;

CREATE OR REPLACE FUNCTION public.rotevo_project_client_assignments(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 actor uuid:=auth.uid();
 project_row public.planning_projects%rowtype;
 result jsonb;
begin
 if actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if not exists (
  select 1 from public.profiles p join public.team_members m on m.user_id=p.id
   where p.id=actor and p.role in ('strategist','staff') and m.active
    and (m.role='admin' or (
     exists(select 1 from public.team_project_assignments t where t.user_id=actor and t.project_id=p_project_id)
     and exists(select 1 from public.team_member_permissions g where g.user_id=actor and g.permission in ('projects.write','editorial.write'))
    ))
 ) then raise exception 'G2 assignment access denied' using errcode='42501';end if;

 select * into project_row from public.planning_projects where id=p_project_id;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id,'projectId',a.project_id,'resourceType',a.resource_type,'resourceId',a.resource_id,
  'resourceVersion',a.resource_version,'clientUserId',a.client_user_id,'actionType',a.action_type,
  'instructions',a.instructions,'dueDate',a.due_date,'status',a.status,'completedAt',a.completed_at,
  'updatedAt',a.updated_at,
  'responsible',(select nullif(btrim(to_jsonb(p)->>'full_name'),'') from public.profiles p where p.id=a.client_user_id),
  'deliveries',coalesce((select jsonb_agg(jsonb_build_object(
   'id',d.id,'driveUrl',d.submission_url,'note',d.note,'attempt',d.attempt_number,
   'status',d.review_status,'feedback',d.reviewer_feedback,'createdAt',d.created_at
  ) order by d.attempt_number desc)
  from rotevo_workflow.client_action_submissions d where d.assignment_id=a.id and d.submitted_by=a.client_user_id),'[]'::jsonb)
 ) order by a.due_date nulls last,a.created_at,a.id),'[]'::jsonb)
 into result
 from rotevo_workflow.client_action_assignments a
 where a.project_id=p_project_id and a.released_at is not null and a.status<>'cancelled'
 and exists (
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.client_id=project_row.client_id and u.user_id=a.client_user_id and p.client_id=project_row.client_id and p.role='client'
 )
 and exists (
  select 1 from jsonb_array_elements(
   case
    when a.resource_type='content' and jsonb_typeof(project_row.data->'editorialCalendar')='array' then project_row.data->'editorialCalendar'
    when a.resource_type='task' and jsonb_typeof(project_row.data->'executionTimeline')='array' then project_row.data->'executionTimeline'
    else '[]'::jsonb
   end
  ) as r(value)
  where r.value->>'id'=a.resource_id and rotevo_workflow.client_resource_visible(a.resource_type,r.value)
   and coalesce(r.value->>'deletedAt','')='' and coalesce(r.value->>'archivedAt','')=''
   and (a.resource_type<>'content' or coalesce(r.value->>'version','')=a.resource_version)
 );
 return result;
end;
$function$;

commit;
