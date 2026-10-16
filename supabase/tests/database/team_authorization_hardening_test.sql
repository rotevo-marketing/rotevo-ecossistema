-- ROTEVO 2027 security preflight, read-only assertions.
-- Run ONLY on an isolated database after explicitly applying reviewed migrations.
-- Expected to fail before profile grant hardening; NEVER use --linked.
begin;
select plan(10);
select has_table('public','profiles','profiles exists');
select has_table('public','team_members','team membership migration applied');
select has_table('public','team_project_assignments','team project assignments applied');
select has_table('public','team_member_permissions','team permissions applied');
select ok((select relrowsecurity from pg_class where oid='public.profiles'::regclass),'profile RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.team_members'::regclass),'team member RLS enabled');
select ok(not has_table_privilege('authenticated','public.profiles','UPDATE'),'authenticated has no unrestricted profile UPDATE table grant');
select ok(has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),'authenticated may update display name only');
select ok(not has_column_privilege('authenticated','public.profiles','role','UPDATE'),'authenticated cannot change their own role');
select ok(not has_column_privilege('authenticated','public.profiles','client_id','UPDATE'),'authenticated cannot switch clients');
select * from finish();
rollback;
