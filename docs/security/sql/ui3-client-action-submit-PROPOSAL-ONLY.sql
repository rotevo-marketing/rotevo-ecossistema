-- UI3 CLIENT ACTION SUBMISSION (text-only) PROPOSAL ONLY.
-- No Storage and no publication/approval side-effects. Test in disposable DB only.
create or replace function public.rotevo_client_action_submit(
 p_assignment_id uuid,p_note text,p_request_key text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_number integer;
 v_id uuid;
 v_existing rotevo_workflow.client_action_submissions%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_note is null or length(btrim(p_note)) not between 3 and 4000
   or p_request_key is null or p_request_key !~ '^[A-Za-z0-9:_-]{8,250}$'
 then raise exception 'Invalid submission' using errcode='22023';end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments
 where id=p_assignment_id for update;
 if not found or v_assignment.client_user_id<>v_actor or v_assignment.released_at is null
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found or not exists(
  select 1 from public.client_users u join public.profiles p on p.id=u.user_id
  where u.user_id=v_actor and u.client_id=v_project.client_id
   and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Project or account access revoked' using errcode='42501';end if;
 select e.value into v_resource from jsonb_array_elements(
 case when jsonb_typeof(v_project.data->(case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
 then v_project.data->(case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
 else '[]'::jsonb end) e(value) where value->>'id'=v_assignment.resource_id limit 1;
 if v_resource is null or v_resource->>'visibleToClient' is distinct from 'true'
 or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
 or (v_assignment.resource_type='content' and coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then raise exception 'Resource revoked or version changed' using errcode='40001';end if;
 select * into v_existing from rotevo_workflow.client_action_submissions where request_key=p_request_key;
 if found then
  if v_existing.assignment_id<>p_assignment_id or v_existing.submitted_by<>v_actor or v_existing.note<>btrim(p_note)
  then raise exception 'Submission replay mismatch' using errcode='23505';end if;
  return jsonb_build_object('id',v_existing.id,'status',v_existing.review_status,'replayed',true);
 end if;
 if v_assignment.status not in ('pending','in_progress','correction_requested')
 then raise exception 'Action no longer accepts submissions' using errcode='40001';end if;
 select coalesce(max(attempt_number),0)+1 into v_number from rotevo_workflow.client_action_submissions
 where assignment_id=p_assignment_id;
 insert into rotevo_workflow.client_action_submissions(
 assignment_id,submitted_by,note,attempt_number,request_key)
 values(p_assignment_id,v_actor,btrim(p_note),v_number,p_request_key)
 returning id into v_id;
 update rotevo_workflow.client_action_assignments
 set status='submitted',updated_at=clock_timestamp()
 where id=p_assignment_id;
 return jsonb_build_object('id',v_id,'status','submitted','replayed',false);
end;
$fn$;
revoke all on function public.rotevo_client_action_submit(uuid,text,text) from public,anon;
grant execute on function public.rotevo_client_action_submit(uuid,text,text) to authenticated;
