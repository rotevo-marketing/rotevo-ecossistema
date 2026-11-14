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
 current_setting('rotevo_test.assignment_id')::uuid,'Vídeo gravado e entregue para análise','submission-test-001','https://drive.google.com/file/d/synthetic-test-link/view');
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Vídeo gravado e entregue para análise','submission-test-001','https://drive.google.com/file/d/synthetic-test-link/view');
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

-- Reject external domains, text-only submissions and changed Drive URL replays.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $reject_drive$
declare blocked boolean;
begin
 blocked:=false;
 begin perform public.rotevo_client_action_submit(
  current_setting('rotevo_test.assignment_id')::uuid,'','drive-invalid-001',
  'https://evil.example/file/d/steal');
 exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'External URL accepted';end if;
 blocked:=false;
 begin perform public.rotevo_client_action_submit(
  current_setting('rotevo_test.assignment_id')::uuid,'','drive-invalid-002',null);
 exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Missing Drive URL accepted';end if;
 blocked:=false;
 begin perform public.rotevo_client_action_submit(
  current_setting('rotevo_test.assignment_id')::uuid,
  'Vídeo gravado e entregue para análise','submission-test-001',
  'https://drive.google.com/file/d/different-file/view');
 exception when unique_violation then blocked:=true;end;
 if not blocked then raise exception 'Replayed request changed the Drive link';end if;
end $reject_drive$;
reset role;
do $schema_check$
begin
 if exists(select 1 from information_schema.columns where table_schema='rotevo_workflow'
  and table_name='client_action_submissions' and column_name='private_storage_path')
 then raise exception 'Unexpected binary storage path exists';end if;
end $schema_check$;

-- Other tenant cannot submit even with known assignment UUID.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',false);
set role authenticated;
do $denied$
declare blocked boolean:=false;
begin
 begin
 perform public.rotevo_client_action_submit(
 current_setting('rotevo_test.assignment_id')::uuid,'Tentativa de outro cliente','submission-test-002','https://drive.google.com/file/d/synthetic-test-link/view');
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
 current_setting('rotevo_test.assignment_id')::uuid,'Uma segunda entrega sem revisão','submission-test-003','https://drive.google.com/file/d/synthetic-test-link/view');
 exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'Unreviewed submission overwritten';end if;
end $pending$;
reset role;
select 'UI3_CLIENT_ACTION_SUBMISSION_ISOLATED_PASS' as result;
