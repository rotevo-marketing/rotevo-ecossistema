-- Synthetic PostgreSQL 17-only conversation schema test. No hosted Supabase access.
\set ON_ERROR_STOP on
DO $roles$
BEGIN
 IF NOT EXISTS (select 1 from pg_roles where rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (select 1 from pg_roles where rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (select 1 from pg_roles where rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END;
$roles$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.planning_projects(id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES ('123e4567-e89b-42d3-a456-426614174001');
INSERT INTO public.planning_projects(id) VALUES ('123e4567-e89b-42d3-a456-426614174000');
\ir ../../docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql
DO $verify$
BEGIN
 IF has_table_privilege('authenticated','public.rotevo_collaboration_messages','SELECT')
 OR has_table_privilege('authenticated','public.rotevo_collaboration_messages','INSERT')
 OR has_table_privilege('anon','public.rotevo_collaboration_messages','SELECT')
 THEN RAISE EXCEPTION 'Browser role gained conversation table access'; END IF;
 IF NOT (select relrowsecurity from pg_class where oid='public.rotevo_collaboration_messages'::regclass)
 THEN RAISE EXCEPTION 'RLS disabled'; END IF;
END;
$verify$;
SET ROLE service_role;
INSERT INTO public.rotevo_collaboration_messages(project_id,resource_type,resource_id,author_user_id,author_role,body)
 VALUES ('123e4567-e89b-42d3-a456-426614174000','task','t1','123e4567-e89b-42d3-a456-426614174001','client','Mensagem fictícia');
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END AS result FROM public.rotevo_collaboration_messages;
RESET ROLE;
