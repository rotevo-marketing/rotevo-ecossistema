-- Synthetic, disposable PostgreSQL only: execute from scripts/security directory.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-submission-isolated.sql
\ir ../../docs/security/sql/ui3-client-action-review-PROPOSAL-ONLY.sql
select id as submission_id from rotevo_workflow.client_action_submissions
 where request_key='submission-test-001' \gset
select set_config('rotevo_test.submission_id', :'submission_id',false);

-- Assigned client cannot approve their own delivery.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $client_denied$
declare denied boolean:=false;
begin
 begin
  perform public.rotevo_client_action_review(
   current_setting('rotevo_test.assignment_id')::uuid,
   current_setting('rotevo_test.submission_id')::uuid,
   'validated','');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client was allowed to review own submission';end if;
end $client_denied$;
reset role;

-- An inactive staff member, even in same workspace, cannot approve.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000015',false);
set role authenticated;
do $inactive$
declare denied boolean:=false;
begin
 begin
  perform public.rotevo_client_action_review(
   current_setting('rotevo_test.assignment_id')::uuid,
   current_setting('rotevo_test.submission_id')::uuid,
   'validated','');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Inactive team member reviewed submission';end if;
end $inactive$;
reset role;

-- Correcting requires feedback; a valid review leaves content status untouched.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $feedback$
declare denied boolean:=false;
begin
 begin
  perform public.rotevo_client_action_review(
   current_setting('rotevo_test.assignment_id')::uuid,
   current_setting('rotevo_test.submission_id')::uuid,
   'correction_requested','');
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Correction accepted without reason';end if;
end $feedback$;
select public.rotevo_client_action_review(
 current_setting('rotevo_test.assignment_id')::uuid,
 current_setting('rotevo_test.submission_id')::uuid,
 'correction_requested','Gravar novamente com melhor iluminação');
-- Exact replay must not create a second review.
select public.rotevo_client_action_review(
 current_setting('rotevo_test.assignment_id')::uuid,
 current_setting('rotevo_test.submission_id')::uuid,
 'correction_requested','Gravar novamente com melhor iluminação');
do $review_conflict$
declare blocked boolean:=false;
begin
 begin
  perform public.rotevo_client_action_review(
   current_setting('rotevo_test.assignment_id')::uuid,
   current_setting('rotevo_test.submission_id')::uuid,'validated','');
 exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'Contradictory decision overwrote correction';end if;
end $review_conflict$;
reset role;

-- Client can resubmit only once correction has been issued.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,
 'Novo vídeo com iluminação corrigida','submission-test-004');
reset role;
select id as resubmission_id from rotevo_workflow.client_action_submissions
 where request_key='submission-test-004' \gset
select set_config('rotevo_test.resubmission_id', :'resubmission_id',false);

-- Internal reviewer validates latest submission; completed_at and history retained.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
select public.rotevo_client_action_review(
 current_setting('rotevo_test.assignment_id')::uuid,
 current_setting('rotevo_test.resubmission_id')::uuid,'validated','');
reset role;
do $check$
begin
 if (select status from rotevo_workflow.client_action_assignments
  where id=current_setting('rotevo_test.assignment_id')::uuid)<>'validated'
 then raise exception 'Final validation status missing';end if;
 if (select completed_at from rotevo_workflow.client_action_assignments
  where id=current_setting('rotevo_test.assignment_id')::uuid) is null
 then raise exception 'Completion timestamp missing';end if;
 if (select count(*) from rotevo_workflow.client_action_submissions
  where assignment_id=current_setting('rotevo_test.assignment_id')::uuid)<>2
 then raise exception 'Submission history was lost';end if;
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects
  where id='00000000-0000-4000-8000-000000000011')<>'idea'
 then raise exception 'Submission review modified editorial status';end if;
 if has_table_privilege('authenticated','rotevo_workflow.client_action_submissions','UPDATE')
 then raise exception 'Authenticated browser can update private submissions directly';end if;
 raise notice 'UI3_CLIENT_ACTION_REVIEW_ISOLATED_PASS';
end $check$;
