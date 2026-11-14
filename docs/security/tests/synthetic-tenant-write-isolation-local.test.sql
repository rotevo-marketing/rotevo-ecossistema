-- ROTEVO: local-only RLS write checks using synthetic JWT context.
-- Expects isolated baseline migration, no production connection.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);

INSERT INTO auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
VALUES
('c1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','write-a@rotevo.invalid','',now(),now(),now()),
('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','write-b@rotevo.invalid','',now(),now(),now());
INSERT INTO public.clients(id,name,slug) VALUES
('c2000000-0000-4000-8000-000000000001','Fictitious A','write-test-a'),
('d2000000-0000-4000-8000-000000000002','Fictitious B','write-test-b');
INSERT INTO public.profiles(id,role,client_id) VALUES
('c1000000-0000-4000-8000-000000000001','client','c2000000-0000-4000-8000-000000000001'),
('d1000000-0000-4000-8000-000000000002','client','d2000000-0000-4000-8000-000000000002');
INSERT INTO public.planning_projects(id,client_id,title,slug,data) VALUES
('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Synthetic project A','write-proj-a','{"baseline":"A"}'),
('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','Synthetic project B','write-proj-b','{"baseline":"B"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);

-- Switch to the synthetic client's JWT context for each attempt,
-- then check the unchanged records using the test owner to avoid
-- confusing RLS-hidden rows with successful write isolation.
UPDATE public.planning_projects SET title='tampered'
  WHERE id='d3000000-0000-4000-8000-000000000002';
RESET ROLE;
SELECT is((SELECT title FROM public.planning_projects
  WHERE id='d3000000-0000-4000-8000-000000000002'), 'Synthetic project B',
  'client A cannot update client B project');
SET LOCAL ROLE authenticated;

DELETE FROM public.planning_projects
  WHERE id='d3000000-0000-4000-8000-000000000002';
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.planning_projects
  WHERE id='d3000000-0000-4000-8000-000000000002'), 1,
  'client A cannot delete client B project');
SET LOCAL ROLE authenticated;

UPDATE public.planning_projects SET title='tampered own'
  WHERE id='c3000000-0000-4000-8000-000000000001';
RESET ROLE;
SELECT is((SELECT title FROM public.planning_projects
  WHERE id='c3000000-0000-4000-8000-000000000001'), 'Synthetic project A',
  'client A cannot update own project under baseline');
SET LOCAL ROLE authenticated;

UPDATE public.clients SET name='tampered'
  WHERE id='d2000000-0000-4000-8000-000000000002';
RESET ROLE;
SELECT is((SELECT name FROM public.clients
  WHERE id='d2000000-0000-4000-8000-000000000002'), 'Fictitious B',
  'client A cannot update other client organization');
SET LOCAL ROLE authenticated;

UPDATE public.profiles SET full_name='Wrong person'
  WHERE id='d1000000-0000-4000-8000-000000000002';
RESET ROLE;
SELECT is((SELECT full_name FROM public.profiles
  WHERE id='d1000000-0000-4000-8000-000000000002'), NULL::text,
  'client A cannot update client B profile');
SET LOCAL ROLE authenticated;

SELECT * FROM finish();
ROLLBACK;
