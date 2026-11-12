-- Notification read permission tests against disposable PostgreSQL.
\set ON_ERROR_STOP on
\ir db-ui3-editorial-workflow-request-isolated.sql
alter table public.planning_projects add column title text not null default 'Synthetic project';
\ir ../../docs/security/sql/ui3-notifications-read-PROPOSAL-ONLY.sql

-- Client B has a notification from the strategist request.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select * from public.rotevo_workflow_list_notifications(30,false);
do $test$
declare v_id uuid;v_count integer;
begin
 select count(*) into v_count from public.rotevo_workflow_list_notifications(30,false);
 if v_count<>1 then raise exception 'Client B expected one notification, got %',v_count;end if;
 select notification_id into v_id from public.rotevo_workflow_list_notifications(30,false);
 if not public.rotevo_workflow_mark_notification_read(v_id)
 then raise exception 'Client could not mark own notification read';end if;
 if (select count(*) from public.rotevo_workflow_list_notifications(30,true))<>0
 then raise exception 'Read notification stayed unread';end if;
end $test$;
reset role;

-- Client A is not a member of project B. No cross-tenant event is returned.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $test$
begin
 if exists(select 1 from public.rotevo_workflow_list_notifications(30,false) where project_id='b0000000-0000-4000-8000-000000000002')
 then raise exception 'Cross-tenant notification visible';end if;
end $test$;
reset role;

-- Role/tenant revocation after issuance must hide old notifications immediately.
update public.client_workspaces set data='{"modules":[]}'::jsonb
 where client_id='f0000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
begin
 if exists(select 1 from public.rotevo_workflow_list_notifications(30,false))
 then raise exception 'Revoked module still sees past notifications';end if;
end $test$;
reset role;

-- Admin recipient may see the decision event; an inactive staff member never can.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000007',false);
set role authenticated;
do $test$
begin
 if (select count(*) from public.rotevo_workflow_list_notifications(30,false)
      where project_id='b0000000-0000-4000-8000-000000000002')<>1
 then raise exception 'Authorized team did not see client decision';end if;
end $test$;
reset role;
update public.team_members set active=false
 where user_id='a0000000-0000-4000-8000-000000000007';
set role authenticated;
do $test$
begin
 if exists(select 1 from public.rotevo_workflow_list_notifications(30,false)
      where project_id='b0000000-0000-4000-8000-000000000002')
 then raise exception 'Deactivated admin still reads notifications';end if;
end $test$;
reset role;

select 'NOTIFICATIONS_G2_REVOKED_ACCESS_PASS' as result;
