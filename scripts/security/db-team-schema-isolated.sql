\set ON_ERROR_STOP on
-- Disposable PostgreSQL CI fixture. Never connect to a hosted Supabase database.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id), role text NOT NULL);
CREATE TABLE public.planning_projects (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
\i supabase/migrations/20261015_team_roles.sql
DO $assert$
DECLARE
 table_name text;
 policy_count int;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['team_members','team_project_assignments','team_member_permissions'] LOOP
  IF NOT (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=table_name) THEN
   RAISE EXCEPTION 'RLS not enabled for %',table_name;
  END IF;
  SELECT count(*) INTO policy_count FROM pg_policies
   WHERE schemaname='public' AND tablename=table_name AND cmd='SELECT'
    AND 'authenticated'=ANY(roles);
  IF policy_count<>1 THEN
   RAISE EXCEPTION 'Unexpected SELECT policy count for %: %',table_name,policy_count;
  END IF;
  IF has_table_privilege('anon',format('public.%I',table_name),'SELECT') THEN
   RAISE EXCEPTION 'Anonymous has team table SELECT privilege: %',table_name;
  END IF;
  IF has_table_privilege('authenticated',format('public.%I',table_name),'INSERT')
   OR has_table_privilege('authenticated',format('public.%I',table_name),'UPDATE')
   OR has_table_privilege('authenticated',format('public.%I',table_name),'DELETE') THEN
   RAISE EXCEPTION 'Authenticated browser role retains team write privileges: %',table_name;
  END IF;
END LOOP;
END $assert$;
