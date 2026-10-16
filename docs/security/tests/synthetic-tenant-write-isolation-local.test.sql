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

SELECT is((WITH changed AS (UPDATE public.planning_projects SET title='tampered' WHERE id='d3000000-0000-4000-8000-000000000002' RETURNING id) SELECT count(*)::integer FROM changed),0,'client A cannot update client B project');
SELECT is((WITH removed AS (DELETE FROM public.planning_projects WHERE id='d3000000-0000-4000-8000-000000000002' RETURNING id) SELECT count(*)::integer FROM removed),0,'client A cannot delete client B project');
SELECT is((WITH changed AS (UPDATE public.planning_projects SET title='tampered own' WHERE id='c3000000-0000-4000-8000-000000000001' RETURNING id) SELECT count(*)::integer FROM changed),0,'client A cannot update own project under baseline');
SELECT is((WITH changed AS (UPDATE public.clients SET name='tampered' WHERE id='d2000000-0000-4000-8000-000000000002' RETURNING id) SELECT count(*)::integer FROM changed),0,'client A cannot update other client organization');
SELECT is((WITH changed AS (UPDATE public.profiles SET full_name='Wrong person' WHERE id='d1000000-0000-4000-8000-000000000002' RETURNING id) SELECT count(*)::integer FROM changed),0,'client A cannot update client B profile');
SELECT * FROM finish();
ROLLBACK;
