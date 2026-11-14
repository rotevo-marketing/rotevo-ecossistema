-- Disposable-only design experiment: grant safe project columns but no JSONB.
-- This is NOT a production migration; current strategist browser reads may break.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(6);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
VALUES ('f4000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','safe-column-probe@rotevo.invalid','',now(),now(),now());
INSERT INTO public.clients(id,name,slug) VALUES
 ('f5000000-0000-4000-8000-000000000001','Safe-column tenant','safe-column-tenant');
INSERT INTO public.profiles(id,role,client_id) VALUES
 ('f4000000-0000-4000-8000-000000000001','client','f5000000-0000-4000-8000-000000000001');
INSERT INTO public.planning_projects(id,client_id,title,slug,data) VALUES
 ('f6000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','Visible metadata','safe-probe','{"internalNotes":"SECRET"}');
REVOKE SELECT ON public.planning_projects FROM anon,authenticated;
GRANT SELECT (id,client_id,title,slug,description,status,updated_at)
 ON public.planning_projects TO authenticated;
SELECT ok(NOT has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
 'authenticated cannot read internal JSONB data');
SELECT ok(has_column_privilege('authenticated','public.planning_projects','title','SELECT'),
 'authenticated may read safe project title');
SELECT ok(has_column_privilege('service_role','public.planning_projects','data','SELECT'),
 'service role retains internal read for audited server endpoint');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT is((SELECT count(*)::integer FROM public.planning_projects),1,
 'own project remains RLS-visible through safe columns');
SELECT is((SELECT title FROM public.planning_projects
 WHERE id='f6000000-0000-4000-8000-000000000001'),'Visible metadata',
 'safe metadata remains readable');
SELECT ok(NOT has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
 'JSONB remains inaccessible after switching to client role');
SELECT * FROM finish();
ROLLBACK;
