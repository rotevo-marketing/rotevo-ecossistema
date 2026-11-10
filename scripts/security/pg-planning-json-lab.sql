-- POSTGRES EPHEMERAL LAB ONLY. Synthetic data. NEVER run against hosted Rotevo.
-- Transaction rolls back all changes. Runner must be disposable.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,client_id uuid NOT NULL);
CREATE TABLE public.planning_projects(
 id uuid PRIMARY KEY,client_id uuid NOT NULL,title text,slug text,description text,status text,
 data jsonb,published_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.planning_projects TO anon,authenticated,service_role;
CREATE POLICY client_project_isolation ON public.planning_projects FOR SELECT TO authenticated
 USING(client_id=(SELECT client_id FROM public.profiles WHERE user_id=auth.uid()));
INSERT INTO public.profiles(user_id,client_id) VALUES
 ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002');
INSERT INTO public.planning_projects(id,client_id,title,slug,status,data) VALUES
 ('aa000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Project A','a','draft','{"internalNotes":"SYNTHETIC-PRIVATE-A"}'),
 ('bb000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Project B','b','draft','{"internalNotes":"SYNTHETIC-PRIVATE-B"}');
-- Existing permission problem: own-tenant raw JSON is readable.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
SET ROLE authenticated;
DO $$
 DECLARE n bigint; raw text;
 BEGIN
 SELECT count(*) INTO n FROM public.planning_projects;
 IF n<>1 THEN RAISE EXCEPTION 'baseline RLS leaked another tenant'; END IF;
 SELECT data->>'internalNotes' INTO raw FROM public.planning_projects WHERE slug='a';
 IF raw<>'SYNTHETIC-PRIVATE-A' THEN RAISE EXCEPTION 'baseline fixture invalid'; END IF;
 END;
$$;
RESET ROLE;
-- Proposed grant isolation: remove table-wide privileges before column-specific grants.
REVOKE SELECT, UPDATE ON public.planning_projects FROM anon, authenticated;
GRANT SELECT (id,client_id,title,slug,description,status,published_at,created_at,updated_at)
 ON public.planning_projects TO authenticated;
DO $$
BEGIN
 IF has_column_privilege('authenticated','public.planning_projects','data','SELECT')
 OR has_column_privilege('authenticated','public.planning_projects','data','UPDATE')
 THEN RAISE EXCEPTION 'JSON remains accessible after grant restriction'; END IF;
 IF NOT has_column_privilege('authenticated','public.planning_projects','title','SELECT')
 THEN RAISE EXCEPTION 'project metadata no longer readable'; END IF;
 IF NOT has_column_privilege('service_role','public.planning_projects','data','SELECT')
 THEN RAISE EXCEPTION 'trusted server role lost JSON access'; END IF;
END;
$$;
SET ROLE authenticated;
DO $$
 DECLARE n bigint; denied boolean:=false;
 BEGIN
 SELECT count(*) INTO n FROM public.planning_projects WHERE slug='a';
 IF n<>1 THEN RAISE EXCEPTION 'authorized metadata missing'; END IF;
 SELECT count(*) INTO n FROM public.planning_projects WHERE slug='b';
 IF n<>0 THEN RAISE EXCEPTION 'other-tenant metadata exposed'; END IF;
 BEGIN
 PERFORM data FROM public.planning_projects WHERE slug='a';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'raw private JSON still readable'; END IF;
 denied:=false;
 BEGIN
 UPDATE public.planning_projects SET data='{}' WHERE slug='a';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'direct JSON update still allowed'; END IF;
 END;
$$;
RESET ROLE;
-- Independently verify the second tenant after the grants change.
SELECT set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
SET ROLE authenticated;
DO $
 DECLARE n bigint; denied boolean:=false;
 BEGIN
 SELECT count(*) INTO n FROM public.planning_projects WHERE slug='b';
 IF n<>1 THEN RAISE EXCEPTION 'tenant B cannot read its permitted metadata'; END IF;
 SELECT count(*) INTO n FROM public.planning_projects WHERE slug='a';
 IF n<>0 THEN RAISE EXCEPTION 'tenant B can read tenant A project'; END IF;
 BEGIN
 PERFORM data FROM public.planning_projects WHERE slug='b';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'tenant B can read its private JSON'; END IF;
 END;
$;
RESET ROLE;
-- Anonymous sessions must not acquire metadata or JSON when RLS is enforced.
SELECT set_config('request.jwt.claim.sub','',true);
SET ROLE anon;
DO $
 DECLARE n bigint; denied boolean:=false;
 BEGIN
 SELECT count(*) INTO n FROM public.planning_projects;
 IF n<>0 THEN RAISE EXCEPTION 'anonymous project metadata exposed'; END IF;
 BEGIN
 PERFORM data FROM public.planning_projects;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'anonymous direct JSON read permitted'; END IF;
 END;
$;
RESET ROLE;
SET ROLE service_role;
DO $
 DECLARE n bigint;
 BEGIN
 SELECT count(*) INTO n FROM public.planning_projects WHERE data ? 'internalNotes';
 IF n<>2 THEN RAISE EXCEPTION 'trusted server role cannot read both fixture projects'; END IF;
 END;
$$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: synthetic tenant RLS, private JSON grant revocation, metadata and service role' AS result;
