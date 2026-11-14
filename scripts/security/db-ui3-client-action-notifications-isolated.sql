-- UI3 transactional notifications in disposable PostgreSQL only.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-rpc-isolated.sql
create table rotevo_workflow.operational_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null,resource_type text not null,resource_id text not null,
 resource_version text,event_type text not null,actor_user_id uuid not null,
 idempotency_key text not null unique,metadata jsonb not null,occurred_at timestamptz not null default now()
);
create table rotevo_workflow.user_notifications (
 id uuid primary key default gen_random_uuid(),event_id uuid not null
 references rotevo_workflow.operational_events(id),recipient_user_id uuid not null,
 read_at timestamptz,unique(event_id,recipient_user_id)
);
\ir ../../docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql
\ir ../../docs/security/sql/ui3-client-action-review-PROPOSAL-ONLY.sql
\ir ../../docs/security/sql/ui3-client-action-notifications-PROPOSAL-ONLY.sql
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
select public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','task','task-1',null,
 '00000000-0000-4000-8000-000000000012','send_material',
 'Enviar relatório final em texto',null,'notice-assignment-001');
-- Replayed request must not duplicate notice.
select public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','task','task-1',null,
 '00000000-0000-4000-8000-000000000012','send_material',
 'Enviar relatório final em texto',null,'notice-assignment-001');
reset role;
select id as notice_assignment from rotevo_workflow.client_action_assignments
 where idempotency_key='notice-assignment-001' \gset
select set_config('rotevo_test.notice_assignment',:'notice_assignment',false);
do $assigned$
begin
 if (select count(*) from rotevo_workflow.user_notifications
  where recipient_user_id='00000000-0000-4000-8000-000000000012')<>1
 then raise exception 'Assigned client did not receive a single notification';end if;
end $assigned$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.notice_assignment')::uuid,
 'Relatório pronto para revisão','notice-submit-001','https://drive.google.com/file/d/synthetic-test-link/view');
select public.rotevo_client_action_submit(
 current_setting('rotevo_test.notice_assignment')::uuid,
 'Relatório pronto para revisão','notice-submit-001','https://drive.google.com/file/d/synthetic-test-link/view');
reset role;
select id as notice_submission from rotevo_workflow.client_action_submissions
 where request_key='notice-submit-001' \gset
select set_config('rotevo_test.notice_submission',:'notice_submission',false);
do $submitted$
begin
 if (select count(*) from rotevo_workflow.user_notifications
  where recipient_user_id='00000000-0000-4000-8000-000000000013')<>1
 then raise exception 'Strategist submission notice absent or duplicated';end if;
end $submitted$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
select public.rotevo_client_action_review(
 current_setting('rotevo_test.notice_assignment')::uuid,
 current_setting('rotevo_test.notice_submission')::uuid,
 'validated','');
select public.rotevo_client_action_review(
 current_setting('rotevo_test.notice_assignment')::uuid,
 current_setting('rotevo_test.notice_submission')::uuid,
 'validated','');
reset role;
do $validated$
begin
 if (select count(*) from rotevo_workflow.operational_events)<>3
 or (select count(*) from rotevo_workflow.user_notifications)<>3
 then raise exception 'Notification event count wrong or duplicated';end if;
 if (select count(*) from rotevo_workflow.user_notifications n
    join rotevo_workflow.operational_events e on e.id=n.event_id
    where n.recipient_user_id=e.actor_user_id)<>0
 then raise exception 'Actor received own event';end if;
 if (select count(*) from rotevo_workflow.operational_events e
    where e.event_type='task_delivery_accepted')<>1
 then raise exception 'Validated delivery event not recorded';end if;
 raise notice 'UI3_CLIENT_ACTION_EVENTS_SYNTHETIC_PASS';
end $validated$;
