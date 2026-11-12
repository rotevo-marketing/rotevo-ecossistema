-- Gate B disposable PostgreSQL 17 verification. NEVER connect to hosted Supabase.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create table public.planning_projects(id uuid primary key, data jsonb not null default '{}'::jsonb);
create table public.rotevo_collaboration_messages(id uuid primary key,project_id uuid not null references public.planning_projects(id));
insert into auth.users(id) values
 ('a0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000002'),
 ('a0000000-0000-4000-8000-000000000003');
insert into public.planning_projects(id,data) values
 ('b0000000-0000-4000-8000-000000000001','{"editorialCalendar":[{"id":"content-a","version":"01","status":"idea_pending","visibleToClient":true}]}'::jsonb),
 ('b0000000-0000-4000-8000-000000000002','{"editorialCalendar":[{"id":"content-b","version":"01","status":"idea_pending","visibleToClient":true}]}'::jsonb);
insert into public.rotevo_collaboration_messages(id,project_id) values
 ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001');

\ir ../../docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql

do $assert$
declare x record;
begin
 for x in select unnest(array['approval_requests','approval_decisions','operational_events','user_notifications']) name loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='rotevo_workflow' and c.relname=x.name and c.relrowsecurity) then
   raise exception 'RLS missing for %',x.name; end if;
  if has_table_privilege('authenticated','rotevo_workflow.'||x.name,'SELECT')
   or has_table_privilege('authenticated','rotevo_workflow.'||x.name,'INSERT')
   or has_table_privilege('anon','rotevo_workflow.'||x.name,'SELECT') then
    raise exception 'Browser grant on %',x.name;
  end if;
 end loop;
 if has_schema_privilege('authenticated','rotevo_workflow','USAGE') or has_schema_privilege('anon','rotevo_workflow','USAGE') then
  raise exception 'Browser schema access';
 end if;
end $assert$;

-- A request starts pending. Approval + project status + event + notifications
-- are tested in the SAME transaction. This is a contract test, not a production RPC.
begin;
insert into rotevo_workflow.approval_requests
 (id,project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
 values ('d0000000-0000-4000-8000-000000000001',
 'b0000000-0000-4000-8000-000000000001','content','content-a','idea','01',
 'a0000000-0000-4000-8000-000000000001','demo-request-idea-v01');
insert into rotevo_workflow.approval_decisions(request_id,decided_by,decision)
 values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','approved');
update rotevo_workflow.approval_requests set status='approved',decided_at=now()
 where id='d0000000-0000-4000-8000-000000000001';
update public.planning_projects set data=jsonb_set(data,'{editorialCalendar,0,status}','"idea_approved"')
 where id='b0000000-0000-4000-8000-000000000001';
insert into rotevo_workflow.operational_events
 (id,project_id,resource_type,resource_id,resource_version,event_type,actor_user_id,request_id,idempotency_key)
 values ('e0000000-0000-4000-8000-000000000001',
 'b0000000-0000-4000-8000-000000000001','content','content-a','01','approval_approved',
 'a0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','approved-idea-v01');
insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
 values('e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
commit;

do $assert$
declare rejected boolean;
begin
 if (select data #>> '{editorialCalendar,0,status}' from public.planning_projects where id='b0000000-0000-4000-8000-000000000001') <> 'idea_approved'
  or (select count(*) from rotevo_workflow.approval_requests)<>1
  or (select count(*) from rotevo_workflow.approval_decisions)<>1
  or (select count(*) from rotevo_workflow.operational_events)<>1
  or (select count(*) from rotevo_workflow.user_notifications)<>1
 then raise exception 'Atomic approved fixture violated';end if;

 -- Replays must fail at database uniqueness constraints, not duplicate events.
 rejected:=false;
 begin
  insert into rotevo_workflow.operational_events(project_id,resource_type,resource_id,event_type,actor_user_id,idempotency_key)
  values('b0000000-0000-4000-8000-000000000001','content','content-a','approval_approved',
   'a0000000-0000-4000-8000-000000000002','approved-idea-v01');
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Duplicate event was accepted';end if;

 rejected:=false;
 begin
  insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
  values('e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Duplicate recipient notification accepted';end if;

 rejected:=false;
 begin
  insert into rotevo_workflow.approval_decisions(request_id,decided_by,decision)
  values('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','approved');
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Duplicate decision accepted';end if;

 rejected:=false;
 begin
  insert into rotevo_workflow.approval_requests(project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
  values('b0000000-0000-4000-8000-000000000001','content','content-a','idea','01',
    'a0000000-0000-4000-8000-000000000001','demo-request-idea-v01');
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Duplicate request key accepted';end if;

 rejected:=false;
 begin
  insert into rotevo_workflow.approval_requests(project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
  values('b0000000-0000-4000-8000-000000000002','task','task-b','idea','01',
    'a0000000-0000-4000-8000-000000000001','invalid-task-idea');
 exception when check_violation then rejected:=true;end;
 if not rejected then raise exception 'Invalid task phase accepted';end if;
end $assert$;

-- A transaction with a failing event must not leave a decision or status change.
-- Use an exception block as a PostgreSQL subtransaction (rollback is automatic).
do $rollback$
declare rejected boolean:=false;
begin
 begin
  insert into rotevo_workflow.approval_requests
   (id,project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
   values('d0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002','content','content-b','idea','01',
   'a0000000-0000-4000-8000-000000000001','rollback-case-idea-v01');
  insert into rotevo_workflow.approval_decisions(request_id,decided_by,decision)
   values('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','approved');
  update public.planning_projects set data=jsonb_set(data,'{editorialCalendar,0,status}','"idea_approved"')
   where id='b0000000-0000-4000-8000-000000000002';
  insert into rotevo_workflow.operational_events(project_id,resource_type,resource_id,event_type,actor_user_id,idempotency_key)
   values('b0000000-0000-4000-8000-000000000002','content','content-b','approval_approved',
    'a0000000-0000-4000-8000-000000000003','approved-idea-v01');
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Expected duplicate event rollback';end if;
 if exists(select 1 from rotevo_workflow.approval_requests where id='d0000000-0000-4000-8000-000000000002')
   or exists(select 1 from rotevo_workflow.approval_decisions where request_id='d0000000-0000-4000-8000-000000000002')
   or (select data #>> '{editorialCalendar,0,status}' from public.planning_projects where id='b0000000-0000-4000-8000-000000000002') <> 'idea_pending'
 then raise exception 'Failed operation leaked partial state';end if;
end $rollback$;

-- Requesting changes must reference a chat message, not parallel free-text.
do $adjust$
declare rejected boolean:=false;
begin
 insert into rotevo_workflow.approval_requests(id,project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
 values('d0000000-0000-4000-8000-000000000003',
 'b0000000-0000-4000-8000-000000000002','content','content-b','final','01',
 'a0000000-0000-4000-8000-000000000001','request-final-v01');
 begin
  insert into rotevo_workflow.approval_decisions(request_id,decided_by,decision)
   values('d0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','changes_requested');
 exception when check_violation then rejected:=true;end;
 if not rejected then raise exception 'Adjustment without message accepted';end if;
 -- This existing foreign key enforces a valid message ID, but additional
 -- project/resource/author/version checks MUST be added at service/RPC layer.
end $adjust$;
select 'GATE_B_POSTGRES_DISPOSABLE_PASS' as result;
