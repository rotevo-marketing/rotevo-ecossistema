-- ROTEVO | LAB ONLY: characterize visibility of planning_projects.data (JSONB).
-- IMPORTANT: PASS means CURRENT EXPOSURE WAS REPRODUCED, NOT THAT IT IS SECURE.
-- No production credentials; fictitious records only; transaction rollback.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);

DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email='cliente.teste@rotevo.invalid')
 THEN RAISE EXCEPTION 'Missing fictitious client A in local Auth'; END IF;
END
$guard$;

INSERT INTO public.clients(id,name,slug,status)
VALUES
 ('a2000000-0000-4000-8000-000000000001','Empresa Ficticia A','lab-json-a','active'),
 ('b2000000-0000-4000-8000-000000000002','Empresa Ficticia B','lab-json-b','active');

UPDATE public.profiles
SET role='client',client_id='a2000000-0000-4000-8000-000000000001'
WHERE id=(SELECT id FROM auth.users WHERE email='cliente.teste@rotevo.invalid');

INSERT INTO public.client_users(client_id,user_id)
SELECT 'a2000000-0000-4000-8000-000000000001',id FROM auth.users
WHERE email='cliente.teste@rotevo.invalid'
ON CONFLICT(client_id,user_id) DO NOTHING;

INSERT INTO public.planning_projects(client_id,title,slug,status,data)
VALUES
 ('a2000000-0000-4000-8000-000000000001','Planejamento A em Rascunho','lab-json-draft-a','draft',
  '{"visibleToClient":true,"internalNote":"SYNTHETIC-PRIVATE-REVIEW","moduleContent":{"internalDraft":"SYNTHETIC-WORK-IN-PROGRESS"}}'::jsonb),
 ('a2000000-0000-4000-8000-000000000001','Planejamento A publicado','lab-json-published-a','published',
  '{"visibleToClient":true}'::jsonb),
 ('b2000000-0000-4000-8000-000000000002','Planejamento B','lab-json-draft-b','draft',
  '{"internalNote":"SYNTHETIC-B-PRIVATE"}'::jsonb);

SELECT set_config('request.jwt.claim.sub',
 (SELECT id::text FROM auth.users WHERE email='cliente.teste@rotevo.invalid'),true);
SET LOCAL ROLE authenticated;

-- Baseline characterization: these assertions intentionally confirm exposure.
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-json-draft-a'),
 1::bigint,'OBSERVED: client can read own draft project row');
SELECT is((SELECT data->>'internalNote' FROM public.planning_projects WHERE slug='lab-json-draft-a'),
 'SYNTHETIC-PRIVATE-REVIEW'::text,'OBSERVED EXPOSURE: internal JSON key visible via SQL');
SELECT is((SELECT data#>>'{moduleContent,internalDraft}' FROM public.planning_projects WHERE slug='lab-json-draft-a'),
 'SYNTHETIC-WORK-IN-PROGRESS'::text,'OBSERVED EXPOSURE: internal draft JSON visible');
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-json-published-a'),
 1::bigint,'Client can read own published project');
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-json-draft-b'),
 0::bigint,'Client cannot read other tenant draft');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
