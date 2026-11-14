-- UI3 | Team validation of client submissions. PROPOSAL-ONLY, NOT A PRODUCTION MIGRATION.
-- Must be tested with synthetic tenant accounts, revocation, G2 and concurrency before activation.
-- Intentionally does NOT change content editorial status, publication or external notifications.
create or replace function public.rotevo_client_action_review(
 p_assignment_id uuid,
 p_submission_id uuid,
 p_decision text,
 p_feedback text
) returns jsonb
language plpgsql security definer set search_path='' as $fn$
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
 if v_matches<>1 or v_resource->>'visibleToClient' is distinct from 'true'
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
$fn$;
revoke all on function public.rotevo_client_action_review(uuid,uuid,text,text) from public,anon;
grant execute on function public.rotevo_client_action_review(uuid,uuid,text,text) to authenticated;
