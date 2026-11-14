-- Synthetic tenant authorization test. Runs only in disposable CI Supabase.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
 ('a1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','synthetic-a@rotevo.invalid','',now(),now(),now()),
 ('b1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','synthetic-b@rotevo.invalid','',now(),now(),now());

INSERT INTO public.clients (id,name,slug) VALUES
 ('a2000000-0000-4000-8000-000000000001','Tenant fictício A','test-a'),
 ('b2000000-0000-4000-8000-000000000002','Tenant fictício B','test-b');

INSERT INTO public.profiles (id,email,role,client_id) VALUES
 ('a1000000-0000-4000-8000-000000000001','synthetic-a@rotevo.invalid','client','a2000000-0000-4000-8000-000000000001'),
 ('b1000000-0000-4000-8000-000000000002','synthetic-b@rotevo.invalid','client','b2000000-0000-4000-8000-000000000002');
INSERT INTO public.client_users (client_id,user_id) VALUES
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002');
INSERT INTO public.planning_projects (client_id,title,slug,data) VALUES
 ('a2000000-0000-4000-8000-000000000001','Projeto de teste A','proj-test-a','{"tenant":"A"}'),
 ('b2000000-0000-4000-8000-000000000002','Projeto de teste B','proj-test-b','{"tenant":"B"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);

SELECT is((SELECT count(*)::integer FROM public.clients),1,'Client A reads only its own client');
SELECT is((SELECT count(*)::integer FROM public.planning_projects),1,'Client A reads only its own projects');
SELECT is((SELECT count(*)::integer FROM public.profiles),1,'Client A reads only its own profile');
SELECT is((SELECT count(*)::integer FROM public.client_users),1,'Client A reads only own tenant assignment');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::integer FROM public.planning_projects),1,'Client B reads only its own projects');

SELECT * FROM finish();
ROLLBACK;
