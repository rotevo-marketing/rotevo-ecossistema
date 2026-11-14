-- PROPOSAL ONLY. Internal review queue scoped to permitted projects. No data exposure to clients.
create or replace function public.rotevo_client_action_review_queue(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_role text;
 v_rows jsonb;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select role into v_role from public.profiles where id=v_actor;
 if v_role is distinct from 'staff' and v_role is distinct from 'strategist'
 then raise exception 'Team only' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id;
 if not found then raise exception 'Unknown project' using errcode='42501';end if;
 if not exists(
   select 1 from public.team_members m where m.user_id=v_actor and m.active
    and (m.role='admin' or (
      exists(select 1 from public.team_project_assignments a
        where a.user_id=v_actor and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions g
        where g.user_id=v_actor and g.permission in ('projects.write','editorial.write'))
    ))
 ) then raise exception 'G2 review access denied' using errcode='42501';end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'assignmentId',q.assignment_id,'submissionId',q.submission_id,
  'resourceType',q.resource_type,'resourceId',q.resource_id,
  'resourceVersion',q.resource_version,'clientUserId',q.client_user_id,
  'actionType',q.action_type,'instructions',q.instructions,
  'submittedAt',q.submitted_at,'note',q.note,'driveUrl',q.submission_url,
  'attemptNumber',q.attempt_number,'dueDate',q.due_date
 ) order by q.submitted_at,q.assignment_id), '[]'::jsonb) into v_rows
 from (
 select a.id assignment_id,s.id submission_id,
 a.resource_type,a.resource_id,a.resource_version,a.client_user_id,
 a.action_type,a.instructions,s.created_at submitted_at,s.note,
 s.attempt_number,a.due_date,s.submission_url
 from rotevo_workflow.client_action_assignments a
 join rotevo_workflow.client_action_submissions s on s.assignment_id=a.id
 where a.project_id=p_project_id and a.status='submitted' and s.review_status='submitted'
  and s.reviewed_at is null and a.released_at is not null
  and exists(
   select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
   where cu.user_id=a.client_user_id and cu.client_id=v_project.client_id
    and p.client_id=v_project.client_id and p.role='client'
  )
  and exists(
   select 1 from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->(
      case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
     then v_project.data->(
      case when a.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
     else '[]'::jsonb end
   ) e(value)
   where e.value->>'id'=a.resource_id
    and e.value->>'visibleToClient'='true'
    and coalesce(e.value->>'archivedAt','')=''
    and coalesce(e.value->>'deletedAt','')=''
    and (a.resource_type<>'content' or coalesce(e.value->>'version','')=a.resource_version)
  )
 order by s.created_at,s.id limit 100
 ) q;
 return v_rows;
end;
$fn$;
revoke all on function public.rotevo_client_action_review_queue(uuid) from public,anon;
grant execute on function public.rotevo_client_action_review_queue(uuid) to authenticated;
