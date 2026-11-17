-- Read-only project assignments for the strategist task center.
-- Apply only after authorization. Existing assignment and delivery rows are unchanged.
begin;
create or replace function public.rotevo_project_client_assignments(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
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
  where r.value->>'id'=a.resource_id and r.value->>'visibleToClient'='true'
   and coalesce(r.value->>'deletedAt','')='' and coalesce(r.value->>'archivedAt','')=''
   and (a.resource_type<>'content' or coalesce(r.value->>'version','')=a.resource_version)
 );
 return result;
end;
$fn$;
revoke all on function public.rotevo_project_client_assignments(uuid) from public,anon;
grant execute on function public.rotevo_project_client_assignments(uuid) to authenticated;
commit;
