-- Synthetic designated approver G2 and audit lifecycle.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-rpc-isolated.sql
\ir ../../docs/security/sql/ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql
insert into public.profiles(id,client_id,role) values
('00000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000001','client');
insert into public.client_users(client_id,user_id) values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000016');
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $client$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','idea',
 '00000000-0000-4000-8000-000000000012','Primeiro aprovador');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client self-designated approval authority';end if;
end $client$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
select public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','idea',
 '00000000-0000-4000-8000-000000000012','Aprovador inicial');
select public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','idea',
 '00000000-0000-4000-8000-000000000012','Aprovador inicial');
select public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','idea',
 '00000000-0000-4000-8000-000000000016','Mudança autorizada');
select public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','idea',
 '00000000-0000-4000-8000-000000000012','Novo ciclo de aprovação');
do $cross$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_editorial_designate_approver(
 '00000000-0000-4000-8000-000000000011','final',
 '00000000-0000-4000-8000-000000000014','Outro cliente');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-tenant approver was designated';end if;
end $cross$;
reset role;
do $audit$
begin
 if (select count(*) from rotevo_workflow.editorial_designated_approvers
 where project_id='00000000-0000-4000-8000-000000000011' and phase='idea')<>3
 then raise exception 'Approver history lost on repeated designation';end if;
 if (select count(*) from rotevo_workflow.editorial_designated_approvers
 where project_id='00000000-0000-4000-8000-000000000011' and phase='idea'
 and revoked_at is null)<>1
 then raise exception 'Multiple active approvers';end if;
 if (select count(*) from rotevo_workflow.editorial_designated_approvers
 where project_id='00000000-0000-4000-8000-000000000011' and phase='idea'
 and revoked_at is not null and length(revocation_reason)>=3)<>2
 then raise exception 'Revocation reasons missing';end if;
 if has_table_privilege('authenticated','rotevo_workflow.editorial_designated_approvers','SELECT')
 then raise exception 'Private approver history exposed to browser';end if;
 raise notice 'UI3_APPROVER_DESIGNATION_LIFECYCLE_PASS';
end $audit$;
