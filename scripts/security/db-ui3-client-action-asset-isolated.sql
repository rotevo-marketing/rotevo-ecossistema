-- Disposable PostgreSQL validation: private immutable upload -> submission binding.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-storage-isolated.sql
\ir ../../docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql
\ir ../../docs/security/sql/ui3-client-action-submit-asset-PROPOSAL-ONLY.sql
-- Restore visibility changed by the RLS revocation exercise.
update public.planning_projects
set data=pg_catalog.jsonb_set(data,'{editorialCalendar,0,visibleToClient}','true'::jsonb,false)
where id='00000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select public.rotevo_client_action_submit_asset(
 current_setting('rotevo_test.assignment_id')::uuid,
 'Arquivo de depoimento enviado','client-asset-submit-001',
 current_setting('rotevo_test.asset_path'));
select public.rotevo_client_action_submit_asset(
 current_setting('rotevo_test.assignment_id')::uuid,
 'Arquivo de depoimento enviado','client-asset-submit-001',
 current_setting('rotevo_test.asset_path'));
reset role;
do $linked$
begin
 if (select count(*) from rotevo_workflow.client_action_submissions
  where request_key='client-asset-submit-001')<>1
 then raise exception 'Attachment retry duplicated submission';end if;
 if (select private_storage_path from rotevo_workflow.client_action_submissions
  where request_key='client-asset-submit-001')<>current_setting('rotevo_test.asset_path')
 then raise exception 'Private evidence not linked to submission';end if;
 if (select status from rotevo_workflow.client_action_assignments
 where id=current_setting('rotevo_test.assignment_id')::uuid)<>'submitted'
 then raise exception 'Assignment state changed incorrectly';end if;
end $linked$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',false);
set role authenticated;
do $cross$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_submit_asset(
 current_setting('rotevo_test.assignment_id')::uuid,
 'Material roubado de outra conta','client-asset-submit-002',
 current_setting('rotevo_test.asset_path'));
 exception when insufficient_privilege or invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Cross-tenant asset linked to submission';end if;
end $cross$;
reset role;
select 'UI3_CLIENT_ASSET_LINK_ISOLATED_PASS' as result;
