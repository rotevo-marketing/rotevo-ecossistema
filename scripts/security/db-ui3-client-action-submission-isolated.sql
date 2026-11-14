-- UI3 client submission: synthetic PostgreSQL only.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-rpc-isolated.sql
\ir ../../docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql
select id as assignment_id from rotevo_workflow.client_action_assignments
 where idempotency_key='assignment-test-001' \gset
select set_config('rotevo_test.assignment_id', :'assignment_id',false);

-- Assigned client submits text without directly touching tables or approvals.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Vídeo gravado e entregue para análise','submission-test-001');
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Vídeo gravado e entregue para análise','submission-test-001');
reset role;
do $check$
begin
 if (select count(*) from rotevo_workflow.client_action_submissions
 where request_key='submission-test-001')<>1
 then raise exception 'Duplicate submission after retry';end if;
 if (select status from rotevo_workflow.client_action_assignments
 where id=current_setting('rotevo_test.assignment_id')::uuid)<>'submitted'
 then raise exception 'Assignment not marked submitted';end if;
end $check$;

-- Other tenant cannot submit even with known assignment UUID.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',false);
set role authenticated;
do $denied$
declare blocked boolean:=false;
begin
 begin
 perform public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Tentativa de outro cliente','submission-test-002');
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Other client submitted assigned work';end if;
end $denied$;
reset role;
-- Assigned client cannot resubmit a new attempt while previous one is awaiting review.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $pending$
declare blocked boolean:=false;
begin
 begin
 perform public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Uma segunda entrega sem revisão','submission-test-003');
 exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'Unreviewed submission overwritten';end if;
end $pending$;
reset role;
select 'UI3_CLIENT_ACTION_SUBMISSION_ISOLATED_PASS' as result;
