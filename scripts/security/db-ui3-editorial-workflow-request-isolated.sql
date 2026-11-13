-- Full request -> decision integration, isolated synthetic PostgreSQL ONLY.
\set ON_ERROR_STOP on
\ir db-ui3-editorial-workflow-isolated.sql
\ir ../../docs/security/sql/ui3-editorial-workflow-request-PROPOSAL-ONLY.sql

-- Reset an unrelated, synthetic Client B item to prepare one authorized request.
update public.planning_projects
 set data='{"editorialCalendar":[{"id":"new-idea-b","version":"10","status":"idea","visibleToClient":true}]}'::jsonb
 where id='b0000000-0000-4000-8000-000000000002';

-- An active strategist G2 admin submits the idea. Notification goes to sole client B.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000007',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select public.rotevo_editorial_workflow_request(
 'b0000000-0000-4000-8000-000000000002','new-idea-b','10','idea');
reset role;

do $assert$
begin
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects
     where id='b0000000-0000-4000-8000-000000000002')<>'idea_pending'
 then raise exception 'Request did not update state';end if;
 if (select count(*) from rotevo_workflow.approval_requests
    where project_id='b0000000-0000-4000-8000-000000000002'
      and resource_id='new-idea-b' and requested_by='a0000000-0000-4000-8000-000000000007')<>1
 then raise exception 'Request actor missing';end if;
 if (select count(*) from rotevo_workflow.user_notifications n
      join rotevo_workflow.operational_events e on e.id=n.event_id
      where e.project_id='b0000000-0000-4000-8000-000000000002'
        and e.resource_id='new-idea-b' and e.event_type='approval_requested'
        and n.recipient_user_id='a0000000-0000-4000-8000-000000000002')<>1
 then raise exception 'Sole client notification missing';end if;
end $assert$;

-- Client B approves; decision should reuse strategist request rather than forge a client request.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
set role authenticated;
select public.rotevo_editorial_workflow_decide(
 'b0000000-0000-4000-8000-000000000002','new-idea-b','10','idea','approved',null);
reset role;

do $assert$
begin
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects
    where id='b0000000-0000-4000-8000-000000000002')<>'idea_approved'
 then raise exception 'Request approval did not change status';end if;
 if (select count(*) from rotevo_workflow.approval_requests
    where project_id='b0000000-0000-4000-8000-000000000002' and resource_id='new-idea-b')<>1
 then raise exception 'Approval generated a duplicate request';end if;
 if (select count(*) from rotevo_workflow.approval_decisions d join rotevo_workflow.approval_requests r
      on r.id=d.request_id where r.resource_id='new-idea-b')<>1
 then raise exception 'Approval not paired with request';end if;
 if (select count(*) from rotevo_workflow.operational_events
     where project_id='b0000000-0000-4000-8000-000000000002' and resource_id='new-idea-b')<>2
 then raise exception 'Request and decision must produce two distinct events';end if;
end $assert$;

-- Client A must not submit approval requests, and a multi-user client project
-- must not randomly choose one person to receive an approval notification.
do $deny$
declare forbidden boolean;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
 forbidden:=false;
 begin
  perform public.rotevo_editorial_workflow_request(
   'b0000000-0000-4000-8000-000000000002','new-idea-b','10','idea');
 exception when insufficient_privilege then forbidden:=true;end;
 if not forbidden then raise exception 'Client request permission was granted';end if;
end $deny$;

-- Still no direct access to private schema despite RPC capability.
do $deny$
begin
 if has_table_privilege('authenticated','rotevo_workflow.user_notifications','SELECT')
 then raise exception 'Private notifications leaked to browser role';end if;
end $deny$;

-- Multiple client users with no designated approver: request must be denied.
update public.planning_projects set data='{"editorialCalendar":[{"id":"multi-user-c","version":"04","status":"idea","visibleToClient":true}]}'::jsonb
 where id='b0000000-0000-4000-8000-000000000003';
do $deny$
declare forbidden boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000007',false);
 begin
  perform public.rotevo_editorial_workflow_request(
   'b0000000-0000-4000-8000-000000000003','multi-user-c','04','idea');
 exception when insufficient_privilege then forbidden:=true;end;
 if not forbidden then raise exception 'Multi-user approval recipient was chosen without designation';end if;
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects
     where id='b0000000-0000-4000-8000-000000000003')<>'idea'
 then raise exception 'Denied request changed editorial status';end if;
end $deny$;

-- Inactive G2 staff cannot submit a client request.
do $deny$
declare forbidden boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000006',false);
 begin
  perform public.rotevo_editorial_workflow_request(
   'b0000000-0000-4000-8000-000000000003','multi-user-c','04','idea');
 exception when insufficient_privilege then forbidden:=true;end;
 if not forbidden then raise exception 'Inactive staff could submit approval';end if;
end $deny$;

select 'FULL_EDITORIAL_REQUEST_AND_DECISION_PASS' as result;
