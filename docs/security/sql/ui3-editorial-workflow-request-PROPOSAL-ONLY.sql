-- Gate B proposal: explicitly send a versioned editorial item for client approval.
-- Synthetic PostgreSQL only until approved E2E and migration. DO NOT APPLY HOSTED.
create or replace function public.rotevo_editorial_workflow_request(
 p_project_id uuid,p_content_id text,p_content_version text,p_phase text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_project public.planning_projects%rowtype;
 v_content jsonb;
 v_pos bigint;
 v_matches int;
 v_to_status text;
 v_from_status text;
 v_request_id uuid;
 v_event_id uuid;
 v_recipient uuid;
 v_recipients int;
 v_key text;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Password reset required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role not in ('staff','strategist') then
  raise exception 'Only authorized team can request approval' using errcode='42501';end if;
 if p_content_id is null or p_content_id !~ '^[A-Za-z0-9_-]{1,80}$'
  or p_content_version is null or length(btrim(p_content_version)) not between 1 and 30
  or p_phase not in ('idea','final')
 then raise exception 'Invalid request' using errcode='22023';end if;

 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
   select 1 from public.team_members m
   where m.user_id=v_actor and m.active and
   (m.role='admin' or (
      exists(select 1 from public.team_project_assignments a
         where a.user_id=v_actor and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions q
         where q.user_id=v_actor and q.permission in ('projects.write','editorial.write'))
   ))
 ) then raise exception 'G2 write access denied' using errcode='42501';end if;

 if (jsonb_typeof(v_project.data->'portalModules')='array'
       and not (v_project.data->'portalModules' ? 'content'))
  or not exists(select 1 from public.client_workspaces w
       where w.client_id=v_project.client_id
        and jsonb_typeof(w.data->'modules')='array' and w.data->'modules'?'content')
 then raise exception 'Content module unavailable' using errcode='42501';end if;
 select count(*) into v_matches
 from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
   then v_project.data->'editorialCalendar' else '[]'::jsonb end) e(value)
 where value->>'id'=p_content_id;
 select value,pos into v_content,v_pos
 from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
   then v_project.data->'editorialCalendar' else '[]'::jsonb end) with ordinality e(value,pos)
 where value->>'id'=p_content_id limit 1;
 if v_matches<>1 or v_content->>'visibleToClient' is distinct from 'true'
   or coalesce(v_content->>'version','')<>p_content_version
   or coalesce(v_content->>'archivedAt','')<>''
   or coalesce(v_content->>'deletedAt','')<>''
 then raise exception 'Content unavailable' using errcode='40001';end if;
 v_from_status:=case p_phase when 'idea' then 'idea' else 'review' end;
 v_to_status:=case p_phase when 'idea' then 'idea_pending' else 'awaiting_client' end;
 if v_content->>'status' is distinct from v_from_status
 then raise exception 'Not ready for client approval' using errcode='40001';end if;

 -- No principal approver field exists in client_users yet. Do not designate
 -- a recipient arbitrarily when multiple client accounts exist.
 select count(*) into v_recipients
 from public.profiles
 where client_id=v_project.client_id and role='client';
 select id into v_recipient from public.profiles
 where client_id=v_project.client_id and role='client' limit 1;
 if v_recipients<>1 then
  raise exception 'Explicit approver designation required' using errcode='42501';end if;

 v_key:='editorial:'||p_project_id::text||':'||p_phase||':'||p_content_id||':'||p_content_version;
 insert into rotevo_workflow.approval_requests(
  project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
 values(p_project_id,'content',p_content_id,p_phase,p_content_version,v_actor,v_key)
 returning id into v_request_id;

 update public.planning_projects
 set data=jsonb_set(v_project.data,array['editorialCalendar',(v_pos-1)::text,'status'],
                    to_jsonb(v_to_status),false),
     updated_at=clock_timestamp()
 where id=p_project_id;

 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,
  actor_user_id,request_id,idempotency_key,metadata)
 values(p_project_id,'content',p_content_id,p_content_version,'approval_requested',
  v_actor,v_request_id,'editorial-request:'||v_key,
  jsonb_build_object('phase',p_phase))
 returning id into v_event_id;
 insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
 values(v_event_id,v_recipient);

 return jsonb_build_object('requestId',v_request_id,'eventId',v_event_id,'status',v_to_status);
end
$fn$;
revoke all on function public.rotevo_editorial_workflow_request(uuid,text,text,text)
 from PUBLIC,anon;
grant execute on function public.rotevo_editorial_workflow_request(uuid,text,text,text)
 to authenticated;
