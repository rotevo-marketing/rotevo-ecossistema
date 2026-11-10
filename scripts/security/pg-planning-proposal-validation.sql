-- CI EXCLUSIVELY: intentionally synthetic PostgreSQL database; NEVER hosted Rotevo.
\set ON_ERROR_STOP on
-- Ensure baseline has the exact ten-column table that the proposal expects.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE public.planning_projects(
 id uuid PRIMARY KEY,
 client_id uuid NOT NULL,
 title text NOT NULL,
 slug text NOT NULL,
 description text,
 status text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 published_at timestamptz,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY synthetic_clients ON public.planning_projects FOR SELECT TO authenticated USING (true);
GRANT ALL ON TABLE public.planning_projects TO anon,authenticated,service_role;
-- Source under test; this file is staged only, never a hosted migration.
\i docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql
-- Check effective privileges after the exact proposal executes.
DO $$
BEGIN
 IF has_column_privilege('authenticated','public.planning_projects','data','SELECT')
 OR has_column_privilege('authenticated','public.planning_projects','data','UPDATE')
 OR has_column_privilege('anon','public.planning_projects','data','SELECT')
 THEN RAISE EXCEPTION 'Release proposal left private JSON visible'; END IF;
 IF NOT has_column_privilege('authenticated','public.planning_projects','title','SELECT')
 OR NOT has_column_privilege('service_role','public.planning_projects','data','SELECT')
 OR NOT has_column_privilege('service_role','public.planning_projects','data','UPDATE')
 THEN RAISE EXCEPTION 'Release proposal damaged required metadata/service access'; END IF;
END;
$$;
SELECT 'PASS: exact release proposal SQL guarded by RLS, schema and effective privilege assertions' AS result;
