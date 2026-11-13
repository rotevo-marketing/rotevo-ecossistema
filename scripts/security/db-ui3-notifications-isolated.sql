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


-- Task message -> event -> recipient notification is one SQL transaction.
-- The sole customer, authorized G2 and cross-tenant clients are synthetic.
\ir ../../docs/security/sql/ui3-content-message-event-PROPOSAL-ONLY.sql
update public.client_workspaces set data='{"modules":["content","execution"]}'::jsonb
 where client_id='f0000000-0000-4000-8000-000000000002';
update public.team_members set active=true where user_id='a0000000-0000-4000-8000-000000000007';
update public.planning_projects set data=jsonb_set(data,'{executionTimeline}',
 '[{"id":"task-test","title":"Tarefa sintética","status":"planned","visibleToClient":true}]'::jsonb,true)
 where id='b0000000-0000-4000-8000-000000000002';

do $task$
declare v_message uuid;v_event uuid;v_count integer;v_denied boolean;
begin
 insert into public.rotevo_collaboration_messages(project_id,resource_type,resource_id,author_user_id,author_role,body)
 values('b0000000-0000-4000-8000-000000000002','task','task-test',
  'a0000000-0000-4000-8000-000000000002','client','Mensagem sintética ao estrategista')
 returning id into v_message;
 select id into strict v_event from rotevo_workflow.operational_events
  where source_message_id=v_message and resource_type='task' and metadata->>'phase'='task';
 if not exists(select 1 from rotevo_workflow.user_notifications
  where event_id=v_event and recipient_user_id='a0000000-0000-4000-8000-000000000007')
 then raise exception 'Task notification missing from G2 inbox';end if;

 insert into public.rotevo_collaboration_messages(project_id,resource_type,resource_id,author_user_id,author_role,body)
 values('b0000000-0000-4000-8000-000000000002','task','task-test',
  'a0000000-0000-4000-8000-000000000007','strategist','Resposta sintética à cliente')
 returning id into v_message;
 select id into strict v_event from rotevo_workflow.operational_events
  where source_message_id=v_message and resource_type='task';
 if not exists(select 1 from rotevo_workflow.user_notifications
  where event_id=v_event and recipient_user_id='a0000000-0000-4000-8000-000000000002')
 then raise exception 'Client missing task notification';end if;

 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
 perform set_config('request.jwt.claims','{"app_metadata":{}}',false);
 select count(*) into v_count from public.rotevo_workflow_list_notifications(30,true)
  where event_phase='task';
 if v_count<>1 then raise exception 'Client cannot read task notification %',v_count;end if;

 v_denied:=false;
 begin
  insert into public.rotevo_collaboration_messages(project_id,resource_type,resource_id,author_user_id,author_role,body)
  values('b0000000-0000-4000-8000-000000000002','task','task-test',
   'a0000000-0000-4000-8000-000000000001','client','Cross-tenant forbidden');
 exception when insufficient_privilege then v_denied:=true;end;
 if not v_denied then raise exception 'Cross-tenant message accepted';end if;

 update public.planning_projects set data=jsonb_set(data,'{executionTimeline,0,visibleToClient}','false'::jsonb,false)
 where id='b0000000-0000-4000-8000-000000000002';
 select count(*) into v_count from public.rotevo_workflow_list_notifications(30,true)
  where event_phase='task';
 if v_count<>0 then raise exception 'Unshared task notification visible to client';end if;
end $task$;
select 'TASK_NOTIFICATION_TRANSACTION_AND_TENANT_PASS' as result;


-- Pilot guard must protect the RPC endpoint even when called without the Next.js allowlist.
-- Install only after all legacy workflow tests above; zero rows means closed by default.
\ir ../../docs/security/sql/ui3-notification-pilot-db-guard-PROPOSAL-ONLY.sql
update public.team_members set active=true where user_id='a0000000-0000-4000-8000-000000000007';
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000007',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
do $pilot$
begin
 if exists(select 1 from public.rotevo_workflow_list_notifications(30,false))
 then raise exception 'Unauthorized direct RPC caller can read pilot inbox';end if;
end $pilot$;
reset role;
insert into rotevo_workflow.notification_pilot_users(user_id,enabled)
values('a0000000-0000-4000-8000-000000000007',true);
set role authenticated;
do $pilot$
begin
 if (select count(*) from public.rotevo_workflow_list_notifications(30,false)
     where project_id='b0000000-0000-4000-8000-000000000002')<>1
 then raise exception 'Authorized pilot lost G2 notice';end if;
end $pilot$;
reset role;
update rotevo_workflow.notification_pilot_users set enabled=false
 where user_id='a0000000-0000-4000-8000-000000000007';
set role authenticated;
do $pilot$
begin
 if exists(select 1 from public.rotevo_workflow_list_notifications(30,false))
 then raise exception 'Revoked pilot still reads notices';end if;
end $pilot$;
reset role;
select 'NOTIFICATIONS_PILOT_DB_DIRECT_RPC_REVOKED_PASS' as result;
