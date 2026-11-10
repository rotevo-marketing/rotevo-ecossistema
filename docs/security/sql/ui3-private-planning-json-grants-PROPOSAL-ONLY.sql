-- PROPOSAL ONLY. DO NOT RUN AGAINST PRODUCTION WITHOUT SEPARATE APPROVAL.
-- Staged SQL for review and rehearsal on disposable Supabase matching hosted schema.
-- Not a migration. Do not run via db push/merge, and do not restore unsafe grants as an automatic rollback.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.planning_projects') IS NULL
 OR NOT EXISTS (SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='planning_projects'
   AND column_name='data' AND data_type='jsonb')
 THEN RAISE EXCEPTION 'Unexpected schema: abort JSON privilege restriction'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class
   WHERE oid='public.planning_projects'::regclass AND relrowsecurity
 ) THEN RAISE EXCEPTION 'RLS must remain enabled for exposed project metadata'; END IF;
 IF (
   SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='planning_projects'
     AND column_name IN ('id','client_id','title','slug','description','status','published_at','created_at','updated_at')
 ) <> 9 THEN RAISE EXCEPTION 'Project metadata schema drift: do not change grants'; END IF;
 IF NOT has_column_privilege('service_role','public.planning_projects','data','SELECT')
 THEN RAISE EXCEPTION 'Privileged server cannot read private JSON'; END IF;
END;
$preflight$;
-- PostgreSQL table grants override per-column REVOKE. Remove whole-table privileges first.
REVOKE SELECT, UPDATE ON TABLE public.planning_projects FROM anon,authenticated;
-- PUBLIC and explicit column grants are independent sources of effective privilege.
REVOKE SELECT, UPDATE ON TABLE public.planning_projects FROM PUBLIC;
REVOKE SELECT (data), UPDATE (data) ON TABLE public.planning_projects FROM PUBLIC,anon,authenticated;
-- Only non-sensitive metadata remains selectable via authenticated clients, still subject to RLS.
GRANT SELECT (id,client_id,title,slug,description,status,published_at,created_at,updated_at)
 ON TABLE public.planning_projects TO authenticated;
-- No UPDATE privilege is granted to authenticated. All privileged writes must go through
-- audited server endpoints using the service role after JWT and project authorization.
DO $postflight$
BEGIN
 IF has_column_privilege('anon','public.planning_projects','data','SELECT')
 OR has_column_privilege('authenticated','public.planning_projects','data','SELECT')
 OR has_column_privilege('authenticated','public.planning_projects','data','UPDATE')
 OR has_column_privilege('anon','public.planning_projects','data','UPDATE')
 THEN RAISE EXCEPTION 'Private project JSON still accessible to browser roles'; END IF;
 IF NOT has_column_privilege('service_role','public.planning_projects','data','UPDATE')
 OR NOT has_column_privilege('authenticated','public.planning_projects','title','SELECT')
 OR NOT has_column_privilege('service_role','public.planning_projects','data','SELECT')
 THEN RAISE EXCEPTION 'Critical legitimate access lost'; END IF;
END;
$postflight$;
COMMIT;
