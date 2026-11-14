-- Full multi-account editorial approval: disposable PostgreSQL only.
\set ON_ERROR_STOP on
\ir db-ui3-editorial-workflow-request-isolated.sql
\ir ../../docs/security/sql/ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000007',false);
set role authenticated;
select public.rotevo_editorial_designate_approver(
 'b0000000-0000-4000-8000-000000000003','idea',
 'a0000000-0000-4000-8000-000000000004','Aprovador escolhido pelo estrategista');
select public.rotevo_editorial_workflow_request(
 'b0000000-0000-4000-8000-000000000003','multi-user-c','04','idea');
reset role;
do $recipient$
begin
 if (select count(*) from rotevo_workflow.user_notifications n
 join rotevo_workflow.operational_events e on e.id=n.event_id
 where e.project_id='b0000000-0000-4000-8000-000000000003'
 and e.resource_id='multi-user-c' and e.event_type='approval_requested'
 and n.recipient_user_id='a0000000-0000-4000-8000-000000000004')<>1
 then raise exception 'Designated approver did not receive request';end if;
 if exists(select 1 from rotevo_workflow.user_notifications n
 join rotevo_workflow.operational_events e on e.id=n.event_id
 where e.resource_id='multi-user-c' and e.event_type='approval_requested'
 and n.recipient_user_id='a0000000-0000-4000-8000-000000000001')
 then raise exception 'Unassigned client received formal request';end if;
end $recipient$;

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $not_approver$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_editorial_workflow_decide(
  'b0000000-0000-4000-8000-000000000003','multi-user-c','04','idea','approved',null);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Other client account approved without designation';end if;
end $not_approver$;
reset role;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',false);
set role authenticated;
select public.rotevo_editorial_workflow_decide(
 'b0000000-0000-4000-8000-000000000003','multi-user-c','04','idea','approved',null);
reset role;
do $final$
begin
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects
 where id='b0000000-0000-4000-8000-000000000003')<>'idea_approved'
 then raise exception 'Named approver did not approve the planned idea';end if;
 if (select count(*) from rotevo_workflow.approval_decisions d
 join rotevo_workflow.approval_requests r on r.id=d.request_id
 where r.resource_id='multi-user-c' and d.decided_by='a0000000-0000-4000-8000-000000000004')<>1
 then raise exception 'Formal decision not attributed to named approver';end if;
 raise notice 'UI3_MULTIUSER_DESIGNATED_APPROVAL_PASS';
end $final$;
