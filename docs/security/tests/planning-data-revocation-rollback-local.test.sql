-- Disposable Supabase fixture ONLY. No hosted database modifications.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);
SELECT ok(has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
 'fixture starts with direct JSON read enabled');
SELECT ok(has_column_privilege('authenticated','public.planning_projects','data','UPDATE'),
 'fixture starts with direct JSON write enabled');
-- Simulate a safely deployed restricted-column grant.
REVOKE SELECT, UPDATE ON public.planning_projects FROM anon, authenticated;
GRANT SELECT (id,client_id,title,slug,description,status,created_at,updated_at,published_at)
 ON public.planning_projects TO authenticated;
SELECT ok(NOT has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
 'restricted authenticated client cannot directly read private JSON');
SELECT ok(NOT has_column_privilege('authenticated','public.planning_projects','data','UPDATE'),
 'restricted authenticated client cannot directly write private JSON');
SELECT ok(has_column_privilege('authenticated','public.planning_projects','updated_at','SELECT'),
 'browser still sees safe optimistic-version metadata');
SELECT ok(has_column_privilege('service_role','public.planning_projects','data','SELECT'),
 'authenticated server API using service role retains JSON access');
-- Simulate emergency rollback in this local transaction; NEVER automatically revert
-- to insecure grants in production.
GRANT SELECT, UPDATE ON public.planning_projects TO authenticated;
SELECT ok(has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
 'local-only rollback can restore previous direct JSON read');
SELECT ok(has_column_privilege('authenticated','public.planning_projects','data','UPDATE'),
 'local-only rollback can restore previous direct JSON write');
SELECT * FROM finish();
ROLLBACK;
