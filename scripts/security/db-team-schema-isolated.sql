\set ON_ERROR_STOP on
-- Disposable PostgreSQL CI fixture. Never connect to a hosted Supabase database.
CREATE DATABASE rotevo_team_security_test;
\connect rotevo_team_security_test
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

-- Audit migration in the same disposable database; no hosted connections.
CREATE ROLE service_role NOLOGIN;
\i supabase/migrations/20261016_team_access_audit.sql
DO $assert$
BEGIN
 IF has_function_privilege('authenticated','public.rotevo_change_team_access(uuid,uuid,text,text,uuid,boolean,boolean)','EXECUTE') THEN
  RAISE EXCEPTION 'Browser role can execute team mutation function';
 END IF;
 IF has_table_privilege('authenticated','public.team_audit_events','SELECT') THEN
  RAISE EXCEPTION 'Browser role can read restricted audit trail';
 END IF;
END $assert$;
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.team_members(user_id,display_name,role,active) VALUES
 ('11111111-1111-4111-8111-111111111111','Audit Admin','admin',true),
 ('22222222-2222-4222-8222-222222222222','Audit Target','producer',true);
INSERT INTO public.planning_projects(id) VALUES ('33333333-3333-4333-8333-333333333333');
SELECT public.rotevo_change_team_access(
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222','permission','projects.read',null,true,null
);
SELECT public.rotevo_change_team_access(
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222','assignment',null,
 '33333333-3333-4333-8333-333333333333',true,null
);
SELECT public.rotevo_change_team_access(
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222','status',null,null,false,true
);
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.team_audit_events)<>3 THEN
  RAISE EXCEPTION 'Missing transactional audit records';
 END IF;
 IF EXISTS(SELECT 1 FROM public.team_members WHERE display_name='Audit Target' AND active=true) THEN
  RAISE EXCEPTION 'Member deactivation failed';
 END IF;
 IF (SELECT count(*) FROM public.team_member_permissions)<>1 OR (SELECT count(*) FROM public.team_project_assignments)<>1 THEN
  RAISE EXCEPTION 'Audited team mutations did not persist';
 END IF;
END $assert$;

-- Succession must be atomic and preserve an active administrator.
INSERT INTO public.profiles(id,role) VALUES
 ('11111111-1111-4111-8111-111111111111','strategist'),
 ('22222222-2222-4222-8222-222222222222','strategist');
SELECT public.rotevo_change_team_access(
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222','status',null,null,true,false
);
SELECT public.rotevo_transfer_team_admin(
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222'
);
DO $assert$
BEGIN
 IF has_function_privilege('authenticated','public.rotevo_transfer_team_admin(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Authenticated client can invoke admin succession directly';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE role='admin' and user_id='22222222-2222-4222-8222-222222222222' and active=true) THEN
  RAISE EXCEPTION 'Incoming administrator was not activated';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE role='strategist' and user_id='11111111-1111-4111-8111-111111111111') THEN
  RAISE EXCEPTION 'Outgoing administrator was not demoted';
 END IF;
 IF (SELECT count(*) FROM public.team_audit_events WHERE action='administrator_transferred')<>1 THEN
  RAISE EXCEPTION 'Missing administrative succession audit record';
 END IF;
END $assert$;

-- Negative security checks: reject privilege escalation, self-edit and stale status.
DO $assert$
DECLARE before_events bigint; before_permissions bigint;
BEGIN
 SELECT count(*) INTO before_events FROM public.team_audit_events;
 SELECT count(*) INTO before_permissions FROM public.team_member_permissions;
 BEGIN
  PERFORM public.rotevo_change_team_access(
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   'permission','finance.write',null,true,null
  );
  RAISE EXCEPTION 'Nonadmin changed administrator access';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.rotevo_change_team_access(
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'permission','finance.write',null,true,null
  );
  RAISE EXCEPTION 'Self-edit was permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.rotevo_change_team_access(
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   'status',null,null,false,false
  );
  RAISE EXCEPTION 'Former admin could alter an admin';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM public.team_audit_events)<>before_events
 OR (SELECT count(*) FROM public.team_member_permissions)<>before_permissions THEN
  RAISE EXCEPTION 'Denied team operation changed state or wrote an audit event';
 END IF;
END $assert$;
