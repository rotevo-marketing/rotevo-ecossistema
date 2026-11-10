\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17, with no connection to Supabase hosted data.
create schema auth;
create table auth.users(id uuid primary key);
create table public.planning_projects(id uuid primary key);
do $collaboration$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin;end if;
end$collaboration$;
\i docs/security/sql/ui3-project-collaboration-PROPOSAL-ONLY.sql
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001');
insert into public.planning_projects(id) values('00000000-0000-0000-0000-000000000002');
insert into public.project_collaboration_messages(project_id,item_type,item_id,content_version,message_type,body,author_id,author_kind)
values ('00000000-0000-0000-0000-000000000002','task','task-1','','task_approved','Aprovada','00000000-0000-0000-0000-000000000001','client');
do $$
begin
 if not (select relrowsecurity from pg_class where oid='public.project_collaboration_messages'::regclass) then raise exception 'Missing RLS';end if;
 if has_table_privilege('authenticated','public.project_collaboration_messages','SELECT') then raise exception 'Unexpected authenticated table SELECT';end if;
 if has_table_privilege('authenticated','public.project_collaboration_messages','INSERT') then raise exception 'Unexpected authenticated INSERT';end if;
 if has_table_privilege('anon','public.project_collaboration_messages','SELECT') then raise exception 'Unexpected anon SELECT';end if;
 if not has_table_privilege('service_role','public.project_collaboration_messages','INSERT') then raise exception 'Missing server INSERT';end if;
 begin
  insert into public.project_collaboration_messages(project_id,item_type,item_id,content_version,message_type,body,author_id,author_kind)
  values ('00000000-0000-0000-0000-000000000002','content','post-1','01','task_approved','Aprovada','00000000-0000-0000-0000-000000000001','client');
  raise exception 'Invalid content approval unexpectedly accepted';
 exception when check_violation then null;
 end;
 begin
  insert into public.project_collaboration_messages(project_id,item_type,item_id,content_version,message_type,body,author_id,author_kind)
  values ('00000000-0000-0000-0000-000000000002','task','task-1','','comment','','00000000-0000-0000-0000-000000000001','client');
  raise exception 'Empty message unexpectedly accepted';
 exception when check_violation then null;
 end;
 if (select count(*) from public.project_collaboration_messages)<>1 then raise exception 'Append-only test row damaged';end if;
end;$$;
select 'PASS isolated collaboration constraints and privileges' as result;
