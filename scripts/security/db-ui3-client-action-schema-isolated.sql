-- Executed in disposable PostgreSQL by GitHub Actions only.
\set ON_ERROR_STOP on
do $$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create table public.planning_projects(id uuid primary key);
insert into public.planning_projects(id) values ('00000000-0000-4000-8000-000000000011');
\ir ../../docs/security/sql/ui3-client-actions-PROPOSAL-ONLY.sql
do $$
declare
  a uuid;
begin
  if not (select relrowsecurity from pg_class where oid='rotevo_workflow.client_action_assignments'::regclass) then
    raise exception 'assignments RLS missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='rotevo_workflow.client_action_submissions'::regclass) then
    raise exception 'submissions RLS missing';
  end if;
  if exists(select 1 from pg_policies where schemaname='rotevo_workflow' and tablename like 'client_action_%') then
    raise exception 'unexpected policies';
  end if;
  if has_table_privilege('authenticated','rotevo_workflow.client_action_assignments','SELECT') or
     has_table_privilege('anon','rotevo_workflow.client_action_submissions','INSERT') then
    raise exception 'exposed client action privileges';
  end if;
  insert into rotevo_workflow.client_action_assignments
    (project_id,resource_type,resource_id,resource_version,action_type,client_user_id,created_by,idempotency_key)
   values
    ('00000000-0000-4000-8000-000000000011','content','content-1','01','record_video',
     '00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013','assign-demo-0001')
   returning id into a;
  begin
    insert into rotevo_workflow.client_action_assignments
      (project_id,resource_type,resource_id,resource_version,action_type,client_user_id,created_by,idempotency_key)
    values('00000000-0000-4000-8000-000000000011','content','content-1','01','record_video',
     '00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013','assign-demo-0001');
    raise exception 'idempotency failed';
  exception when unique_violation then null;
  end;
  insert into rotevo_workflow.client_action_submissions
    (assignment_id,submitted_by,note,attempt_number,request_key)
   values(a,'00000000-0000-4000-8000-000000000012','Material entregue para validação',1,'submit-demo-0001');
  begin
    insert into rotevo_workflow.client_action_submissions
      (assignment_id,submitted_by,note,attempt_number,request_key)
    values(a,'00000000-0000-4000-8000-000000000012','Duas submissões no mesmo envio',1,'submit-demo-0002');
    raise exception 'submission version uniqueness failed';
  exception when unique_violation then null;
  end;
  begin
    insert into rotevo_workflow.client_action_assignments
      (project_id,resource_type,resource_id,action_type,client_user_id,created_by,idempotency_key)
    values('00000000-0000-4000-8000-000000000011','content','content-2','record_video',
     '00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013','assign-demo-0002');
    raise exception 'missing content version accepted';
  exception when check_violation then null;
  end;
  raise notice 'UI3_CLIENT_ACTION_SCHEMA_SYNTHETIC_PASS';
end $$;

\ir ../../docs/security/sql/ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql
do $approvers$
declare
 p uuid:='00000000-0000-4000-8000-000000000011';
begin
 if not (select relrowsecurity from pg_class where oid='rotevo_workflow.editorial_designated_approvers'::regclass)
 then raise exception 'Designated approver RLS missing';end if;
 if has_table_privilege('authenticated','rotevo_workflow.editorial_designated_approvers','SELECT')
 then raise exception 'Approver assignments exposed to authenticated';end if;
 insert into rotevo_workflow.editorial_designated_approvers(project_id,phase,approver_user_id,designated_by)
 values(p,'idea','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013');
 begin
  insert into rotevo_workflow.editorial_designated_approvers(project_id,phase,approver_user_id,designated_by)
  values(p,'idea','00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000013');
  raise exception 'Two simultaneous active idea approvers accepted';
 exception when unique_violation then null;end;
 update rotevo_workflow.editorial_designated_approvers
 set revoked_at=clock_timestamp(),revocation_reason='Authorized reassignment in synthetic test'
 where project_id=p and phase='idea' and approver_user_id='00000000-0000-4000-8000-000000000012';
 insert into rotevo_workflow.editorial_designated_approvers(project_id,phase,approver_user_id,designated_by)
 values(p,'idea','00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000013');
 if (select count(*) from rotevo_workflow.editorial_designated_approvers where project_id=p and phase='idea')<>2
 or (select count(*) from rotevo_workflow.editorial_designated_approvers where project_id=p and phase='idea' and revoked_at is null)<>1
 then raise exception 'Approver reassignment lost history or produced extra active users';end if;
 raise notice 'UI3_APPROVER_DESIGNATION_SYNTHETIC_PASS';
end $approvers$;
