-- EPHEMERAL POSTGRESQL LAB ONLY. Exercises an application-only rollback after grants are hardened.
-- Only a PREVALIDATED application artifact compatible with restricted grants may be restored.
-- Never roll back to legacy UI2: it requires direct planning_projects.data access.
-- This SQL checks privilege invariants; it does NOT certify a deployable recovery artifact.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF has_column_privilege('authenticated','public.planning_projects','data','SELECT')
 OR has_column_privilege('authenticated','public.planning_projects','data','UPDATE')
 OR has_column_privilege('anon','public.planning_projects','data','SELECT')
 OR has_column_privilege('anon','public.planning_projects','data','UPDATE')
 THEN RAISE EXCEPTION 'Unsafe grant restoration detected before app rollback'; END IF;
END;
$guard$;
-- Simulate a software-only rollback: no schema privilege changes, no reverse GRANT ALL.
SET LOCAL ROLE authenticated;
DO $client$
DECLARE denied_read boolean:=false;denied_write boolean:=false;metadata_ok boolean:=false;
BEGIN
 BEGIN
  PERFORM data FROM public.planning_projects;
 EXCEPTION WHEN insufficient_privilege THEN denied_read:=true;
 END;
 BEGIN
  UPDATE public.planning_projects SET data='{}'::jsonb WHERE false;
 EXCEPTION WHEN insufficient_privilege THEN denied_write:=true;
 END;
 BEGIN
  PERFORM title FROM public.planning_projects WHERE false;
  metadata_ok:=true;
 EXCEPTION WHEN insufficient_privilege THEN metadata_ok:=false;
 END;
 IF NOT (denied_read AND denied_write AND metadata_ok)
 THEN RAISE EXCEPTION 'Software rollback reopens JSON or breaks metadata'; END IF;
END;
$client$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $server$
BEGIN
 IF NOT has_column_privilege('service_role','public.planning_projects','data','SELECT')
 OR NOT has_column_privilege('service_role','public.planning_projects','data','UPDATE')
 THEN RAISE EXCEPTION 'Server access unavailable after software rollback'; END IF;
 PERFORM data FROM public.planning_projects WHERE false;
 UPDATE public.planning_projects SET data=data WHERE false;
END;
$server$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: application-only rollback retains denied raw JSON and trusted server/editor access' AS result;
