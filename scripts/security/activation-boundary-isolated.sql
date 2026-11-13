\set ON_ERROR_STOP on
-- Run only in a NEW database inside the local Docker Supabase PostgreSQL.
-- Synthetic fixture; never evidence of production recovery.
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
\i docs/security/lab-legacy-baseline-local-only.sql
-- Reproduce hosted default grants before creating proposed tables.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
\i supabase/migrations/20261015_harden_profile_authorization.sql
\i supabase/migrations/20261015_team_roles.sql
\i supabase/migrations/20261016_staff_role_legacy_boundary.sql
\i supabase/migrations/20261016_team_access_audit.sql
\i supabase/migrations/20261016210140_activation_privilege_boundary.sql
insert into auth.users values
 ('a1000000-0000-4000-8000-000000000001','contato@rotevo.com.br'),
 ('a1000000-0000-4000-8000-000000000002','staff@rotevo.invalid'),
 ('a1000000-0000-4000-8000-000000000003','client@rotevo.invalid');
insert into public.clients(id,name,slug) values
 ('b1000000-0000-4000-8000-000000000001','Synthetic A','synthetic-a'),
 ('b1000000-0000-4000-8000-000000000002','Synthetic B','synthetic-b');
insert into public.profiles(id,email,full_name,role,client_id) values
 ('a1000000-0000-4000-8000-000000000001','contato@rotevo.com.br','Otávio Silva','strategist',null),
 ('a1000000-0000-4000-8000-000000000002','staff@rotevo.invalid','Synthetic staff','staff',null),
 ('a1000000-0000-4000-8000-000000000003','client@rotevo.invalid','Synthetic client','client','b1000000-0000-4000-8000-000000000001');
insert into public.planning_projects(id,client_id,title,slug) values
 ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','A','project-a'),
 ('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','B','project-b');
\i supabase/migrations/20261016_bootstrap_rotevo_owner.sql
insert into public.team_members(user_id,display_name,role,active) values
 ('a1000000-0000-4000-8000-000000000002','Synthetic staff','producer',true);
select public.rotevo_change_team_access('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','assignment',null,'c1000000-0000-4000-8000-000000000001',true,null);
select public.rotevo_change_team_access('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','permission','projects.read',null,true,null);
do $$
declare t text; r text;
begin
 foreach t in array array['clients','profiles','planning_projects','client_users','team_members','team_project_assignments','team_member_permissions'] loop
  foreach r in array array['anon','authenticated'] loop
   if has_table_privilege(r,format('public.%I',t),'TRUNCATE') then raise exception 'TRUNCATE leaked: % %',r,t; end if;
  end loop;
 end loop;
 if has_column_privilege('authenticated','public.profiles','role','UPDATE') or has_column_privilege('authenticated','public.profiles','client_id','UPDATE') then raise exception 'Profile escalation possible'; end if;
 if not has_column_privilege('authenticated','public.profiles','full_name','UPDATE') then raise exception 'Name edit broken'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',false);
do $$ begin
 if (select count(*) from public.planning_projects)<>0 then raise exception 'Staff inherited raw project access'; end if;
 if (select count(*) from public.clients)<>0 then raise exception 'Staff inherited client access'; end if;
 if (select count(*) from public.team_members)<>0 then raise exception 'Staff can read team directory'; end if;
 begin
  update public.profiles set role='strategist' where id=auth.uid();
  raise exception 'Staff changed role';
 exception when insufficient_privilege then null; end;
 begin
  truncate public.planning_projects;
  raise exception 'Browser truncated projects';
 exception when insufficient_privilege then null; end;
 update public.profiles set full_name='Edited synthetic staff' where id=auth.uid();
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',false);
do $$ begin
 if (select count(*) from public.planning_projects)<>1 then raise exception 'Client isolation broken'; end if;
 if exists(select 1 from public.planning_projects where title='B') then raise exception 'Client sees other tenant'; end if;
end $$;
reset role;
select public.rotevo_change_team_access('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','status',null,null,false,true);
do $$ begin
 if (select count(*) from public.team_audit_events)<>3 then raise exception 'Audit incomplete'; end if;
 if exists(select 1 from public.team_members where role='producer' and active) then raise exception 'Deactivation failed'; end if;
 if (select count(*) from public.planning_projects)<>2 then raise exception 'Fixture data lost'; end if;
end $$;
select 'PASS: synthetic RLS, grants, bootstrap, assignment, permissions, deactivation, audit' as result;
