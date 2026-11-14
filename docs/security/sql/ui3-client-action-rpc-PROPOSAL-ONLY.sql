-- UI3 CLIENT ACTION RPCS — PROPOSAL ONLY, disposable PostgreSQL tests.
-- Requires ui3-client-actions-PROPOSAL-ONLY.sql and existing Rotevo public identity tables.
-- NEVER apply to a hosted database until full G2/tenant, backup and E2E acceptance.
-- No service_role in browser / API. SECURITY DEFINER has empty search_path.
create or replace function public.rotevo_client_action_create(
 p_project_id uuid,p_resource_type text,p_resource_id text,p_resource_version text,
 p_client_user_id uuid,p_action_type text,p_instructions text,p_due_date date,p_request_key text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
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
 if v_role not in ('staff','strategist') then
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

 select count(*),max(e.value) into v_found,v_resource
 from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
   then v_project.data->(case when p_resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
   else '[]'::jsonb end) e(value)
 where value->>'id'=p_resource_id;
 if v_found<>1 or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
   or v_resource->>'visibleToClient' is distinct from 'true'
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
$fn$;
revoke all on function public.rotevo_client_action_create(uuid,text,text,text,uuid,text,text,date,text) from public,anon;
grant execute on function public.rotevo_client_action_create(uuid,text,text,text,uuid,text,text,date,text) to authenticated;

create or replace function public.rotevo_client_action_list(
 p_project_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $fn$
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
  and a.released_at is not null and a.status<>'cancelled';
 return v_results;
end;
$fn$;
revoke all on function public.rotevo_client_action_list(uuid) from public,anon;
grant execute on function public.rotevo_client_action_list(uuid) to authenticated;
