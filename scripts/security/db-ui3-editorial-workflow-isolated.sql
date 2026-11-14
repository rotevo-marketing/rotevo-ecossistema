-- Gate B editorial transaction: disposable PostgreSQL 17 fixture ONLY.
\set ON_ERROR_STOP on
\ir db-ui3-gate-b-workflow-isolated.sql

-- Extend Gate B synthetic fixture to mirror the pre-existing Rotevo tables.
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;

alter table public.planning_projects add column client_id uuid;
alter table public.planning_projects add column updated_at timestamptz not null default now();
create table public.profiles(id uuid primary key references auth.users(id),role text not null,client_id uuid);
create table public.client_workspaces(client_id uuid primary key,data jsonb not null);
create table public.client_users(client_id uuid not null,user_id uuid not null,primary key(client_id,user_id));
create table public.team_members(user_id uuid primary key references auth.users(id),role text,active boolean);
create table public.team_project_assignments(user_id uuid,project_id uuid,primary key(user_id,project_id));
create table public.team_member_permissions(user_id uuid,permission text,primary key(user_id,permission));

alter table public.rotevo_collaboration_messages add column resource_type text;
alter table public.rotevo_collaboration_messages add column resource_id text;
alter table public.rotevo_collaboration_messages add column content_version text;
alter table public.rotevo_collaboration_messages add column author_user_id uuid;
alter table public.rotevo_collaboration_messages add column author_role text;
alter table public.rotevo_collaboration_messages add column body text;
alter table public.rotevo_collaboration_messages alter column id set default gen_random_uuid();

create table public.editorial_idea_approvals(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id),
 content_id text not null,
 content_version text not null,
 decision text not null,
 comment text,
 decided_by uuid not null references auth.users(id),
 decided_at timestamptz default clock_timestamp(),
 unique(project_id,content_id,content_version)
);
create table public.editorial_approvals(
 like public.editorial_idea_approvals including all,
 constraint final_adjustment_comment check(decision<>'changes_requested' or length(btrim(comment))>=3)
);

insert into auth.users(id) values
 ('a0000000-0000-4000-8000-000000000004'),
 ('a0000000-0000-4000-8000-000000000005'),
 ('a0000000-0000-4000-8000-000000000006'),
 ('a0000000-0000-4000-8000-000000000007');
insert into public.profiles(id,role,client_id) values
 ('a0000000-0000-4000-8000-000000000001','client','f0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000002','client','f0000000-0000-4000-8000-000000000002'),
 ('a0000000-0000-4000-8000-000000000003','staff',null),
 ('a0000000-0000-4000-8000-000000000005','staff',null),
 ('a0000000-0000-4000-8000-000000000006','staff',null),
 ('a0000000-0000-4000-8000-000000000007','strategist',null);
insert into public.client_users(client_id,user_id)
 select client_id,id from public.profiles where role='client';
\ir ../../docs/security/sql/ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql
insert into public.client_workspaces(client_id,data) values
 ('f0000000-0000-4000-8000-000000000001','{"modules":["content","execution"]}'),
 ('f0000000-0000-4000-8000-000000000002','{"modules":["content"]}');
insert into public.team_members(user_id,role,active) values
 ('a0000000-0000-4000-8000-000000000005','producer',true),
 ('a0000000-0000-4000-8000-000000000006','producer',false),
 ('a0000000-0000-4000-8000-000000000007','admin',true);
insert into public.team_project_assignments(user_id,project_id) values
 ('a0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000003'),
 ('a0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000003');
insert into public.team_member_permissions(user_id,permission) values
 ('a0000000-0000-4000-8000-000000000005','editorial.read'),
 ('a0000000-0000-4000-8000-000000000006','editorial.read');
insert into public.planning_projects(id,client_id,data) values
 ('b0000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000001',
 '{"editorialCalendar":[{"id":"idea-c","version":"01","status":"idea_pending","visibleToClient":true},{"id":"final-c","version":"02","status":"awaiting_client","visibleToClient":true},{"id":"adjust-c","version":"03","status":"idea_pending","visibleToClient":true}]}');
update public.planning_projects set client_id='f0000000-0000-4000-8000-000000000002'
 where id='b0000000-0000-4000-8000-000000000002';
\ir ../../docs/security/sql/ui3-editorial-workflow-rpc-PROPOSAL-ONLY.sql

-- Authenticate as client A (via synthetic JWT claims) and enforce invoker grants.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select public.rotevo_editorial_workflow_decide(
 'b0000000-0000-4000-8000-000000000003','idea-c','01','idea','approved',null);
select public.rotevo_editorial_workflow_decide(
 'b0000000-0000-4000-8000-000000000003','final-c','02','final','approved',null);
select public.rotevo_editorial_workflow_decide(
 'b0000000-0000-4000-8000-000000000003','adjust-c','03','idea','changes_requested',
 'Favor revisar a mensagem do post antes de publicar.');
reset role;

do $assert$
declare v_data jsonb;
begin
 select data into v_data from public.planning_projects where id='b0000000-0000-4000-8000-000000000003';
 if v_data #>> '{editorialCalendar,0,status}' <> 'idea_approved'
 or v_data #>> '{editorialCalendar,1,status}' <> 'approved'
 or v_data #>> '{editorialCalendar,2,status}' <> 'idea_changes'
 then raise exception 'Editorial state transition failed';end if;
 if (select count(*) from public.editorial_idea_approvals where project_id='b0000000-0000-4000-8000-000000000003')<>2
 or (select count(*) from public.editorial_approvals where project_id='b0000000-0000-4000-8000-000000000003')<>1
 or (select count(*) from rotevo_workflow.approval_decisions d join rotevo_workflow.approval_requests r on r.id=d.request_id
      where r.project_id='b0000000-0000-4000-8000-000000000003')<>3
 then raise exception 'Legacy and new decisions out of sync';end if;
 if (select count(*) from public.rotevo_collaboration_messages
      where project_id='b0000000-0000-4000-8000-000000000003'
      and resource_id='adjust-c' and content_version='03')<>1 then
  raise exception 'Formal adjustment was not recorded in conversation';end if;
 if (select count(*) from rotevo_workflow.operational_events
      where project_id='b0000000-0000-4000-8000-000000000003')<>3 then
  raise exception 'Workflow events missing';end if;
 if (select count(*) from rotevo_workflow.user_notifications n join rotevo_workflow.operational_events e on e.id=n.event_id
      where e.project_id='b0000000-0000-4000-8000-000000000003')<>6 then
  raise exception 'Expected two authorized recipients for each of three events';end if;
 if exists(select 1 from rotevo_workflow.user_notifications where recipient_user_id='a0000000-0000-4000-8000-000000000006') then
  raise exception 'Inactive staff received notification';end if;
end $assert$;

-- Two failed invocations are rolled back as subtransactions and do not emit events.
do $reject$
declare rejected boolean;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
 rejected:=false;
 begin
  perform public.rotevo_editorial_workflow_decide(
   'b0000000-0000-4000-8000-000000000003','idea-c','01','idea','approved',null);
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Cross-tenant decision accepted';end if;
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
 rejected:=false;
 begin
  perform public.rotevo_editorial_workflow_decide(
   'b0000000-0000-4000-8000-000000000003','idea-c','01','idea','approved',null);
 exception when serialization_failure then rejected:=true;end;
 if not rejected then raise exception 'Replay accepted';end if;
 if (select count(*) from rotevo_workflow.operational_events
     where project_id='b0000000-0000-4000-8000-000000000003')<>3 then
  raise exception 'Failed request emitted an event';end if;
end $reject$;

-- Add a second client account only after the single-approver positive cases.
-- Legacy-status decisions must fail closed on multi-user tenants too.
insert into public.profiles(id,role,client_id)
values('a0000000-0000-4000-8000-000000000004','client','f0000000-0000-4000-8000-000000000001');
 insert into public.client_users(client_id,user_id) values('f0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000004');
update public.planning_projects
 set data=jsonb_set(data,'{editorialCalendar}',(data->'editorialCalendar')||
  '[{"id":"multi-client-decision","version":"05","status":"idea_pending","visibleToClient":true}]'::jsonb)
 where id='b0000000-0000-4000-8000-000000000003';
do $multi$
declare denied boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
 begin
  perform public.rotevo_editorial_workflow_decide(
   'b0000000-0000-4000-8000-000000000003','multi-client-decision','05','idea','approved',null);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Multi-user client decision accepted without named approver';end if;
 if (select count(*) from rotevo_workflow.operational_events where resource_id='multi-client-decision')<>0 then
  raise exception 'Denied multi-user decision created event';end if;
end $multi$;



select 'EDITORIAL_TRANSACTION_DISPOSABLE_PASS' as result;
