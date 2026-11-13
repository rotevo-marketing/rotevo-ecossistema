-- Characterization ONLY: proves tenant isolation does not hide internal JSON
-- in the legacy planning_projects.data column. Disposable local CI only.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(4);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
VALUES ('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','internal-json-test@rotevo.invalid','',now(),now(),now());
INSERT INTO public.clients(id,name,slug)
VALUES ('f2000000-0000-4000-8000-000000000001','Synthetic confidentiality tenant','internal-json-tenant');
INSERT INTO public.profiles(id,role,client_id)
VALUES ('f1000000-0000-4000-8000-000000000001','client','f2000000-0000-4000-8000-000000000001');
INSERT INTO public.planning_projects(id,client_id,title,slug,data)
VALUES ('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','Confidentiality fixture','internal-json-proj',
  '{"publicHeadline":"Visible title","internalNotes":"PRIVATE_SYNTHETIC_VALUE_DO_NOT_EXPOSE"}'::jsonb);

SELECT ok(has_column_privilege('authenticated','public.planning_projects','data','SELECT'),
  'Legacy grants expose the complete data column to authenticated');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT is((SELECT count(*)::integer FROM public.planning_projects
  WHERE id='f3000000-0000-4000-8000-000000000001'),1,
  'Client can read its project row');
SELECT is((SELECT data->>'internalNotes' FROM public.planning_projects
  WHERE id='f3000000-0000-4000-8000-000000000001'),'PRIVATE_SYNTHETIC_VALUE_DO_NOT_EXPOSE',
  'Known vulnerability: client can read internal JSON of own project');
SELECT is((SELECT data->>'publicHeadline' FROM public.planning_projects
  WHERE id='f3000000-0000-4000-8000-000000000001'),'Visible title',
  'Public field is accessible too');
SELECT * FROM finish();
ROLLBACK;
