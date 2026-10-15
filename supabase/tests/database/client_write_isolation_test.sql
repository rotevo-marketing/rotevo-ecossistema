-- ROTEVO | Laboratory-only tenant WRITE isolation (pgTAP).
-- Requires local baseline and two fictional Auth users. No production connection.
-- Each file is rolled back by supabase test db --local.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(10);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM auth.users WHERE email IN ('cliente.teste@rotevo.invalid','cliente.b@rotevo.invalid')) <> 2
 THEN RAISE EXCEPTION 'Missing two fictional users in local Auth';
 END IF;
END $guard$;

INSERT INTO public.clients(id,name,slug,status) VALUES
('a1000000-0000-4000-8000-000000000001','Teste Escrita A','lab-write-a','active'),
('b1000000-0000-4000-8000-000000000002','Teste Escrita B','lab-write-b','active');

INSERT INTO public.profiles(id,email,full_name,role,client_id)
SELECT id,email,'Teste Escrita A','client','a1000000-0000-4000-8000-000000000001'::uuid
FROM auth.users WHERE email='cliente.teste@rotevo.invalid'
ON CONFLICT(id) DO UPDATE SET role='client',client_id=excluded.client_id;
INSERT INTO public.profiles(id,email,full_name,role,client_id)
SELECT id,email,'Teste Escrita B','client','b1000000-0000-4000-8000-000000000002'::uuid
FROM auth.users WHERE email='cliente.b@rotevo.invalid'
ON CONFLICT(id) DO UPDATE SET role='client',client_id=excluded.client_id;

INSERT INTO public.client_users(client_id,user_id)
SELECT 'a1000000-0000-4000-8000-000000000001',id FROM auth.users WHERE email='cliente.teste@rotevo.invalid'
ON CONFLICT(client_id,user_id) DO NOTHING;
INSERT INTO public.client_users(client_id,user_id)
SELECT 'b1000000-0000-4000-8000-000000000002',id FROM auth.users WHERE email='cliente.b@rotevo.invalid'
ON CONFLICT(client_id,user_id) DO NOTHING;

INSERT INTO public.planning_projects(client_id,title,slug,status,data) VALUES
('a1000000-0000-4000-8000-000000000001','Plano Escrita A','lab-write-plan-a','published','{"tenant":"A"}'),
('b1000000-0000-4000-8000-000000000002','Plano Escrita B','lab-write-plan-b','published','{"tenant":"B"}');

SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM auth.users WHERE email='cliente.teste@rotevo.invalid'),true);
SET LOCAL ROLE authenticated;

-- UPDATE/DELETE on another tenant's rows affect no rows, even though grants may be broad.
SELECT is_empty($$UPDATE public.clients SET name='Invasao A' WHERE slug='lab-write-b' RETURNING id$$,'A cannot update client B');
SELECT is_empty($$DELETE FROM public.clients WHERE slug='lab-write-b' RETURNING id$$,'A cannot delete client B');
SELECT is_empty($$UPDATE public.planning_projects SET title='Invasao A' WHERE slug='lab-write-plan-b' RETURNING id$$,'A cannot update plan B');
SELECT is_empty($$DELETE FROM public.planning_projects WHERE slug='lab-write-plan-b' RETURNING id$$,'A cannot delete plan B');
SELECT is_empty($$UPDATE public.client_users SET client_id='a1000000-0000-4000-8000-000000000001' WHERE client_id='b1000000-0000-4000-8000-000000000002' RETURNING id$$,'A cannot transfer B membership');

-- INSERT is forbidden for clients; assert privilege-denied SQLSTATE.
SELECT throws_ok($$INSERT INTO public.clients(name,slug) VALUES ('Invasao','lab-write-injection')$$,'42501',NULL,'A cannot insert client');
SELECT throws_ok($$INSERT INTO public.planning_projects(client_id,title,slug)
 VALUES ('b1000000-0000-4000-8000-000000000002','Invasao','lab-write-injection')$$,'42501',NULL,'A cannot insert project for B');

RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM auth.users WHERE email='cliente.b@rotevo.invalid'),true);
SET LOCAL ROLE authenticated;
SELECT is_empty($$UPDATE public.planning_projects SET title='Invasao B' WHERE slug='lab-write-plan-a' RETURNING id$$,'B cannot update plan A');
SELECT is_empty($$DELETE FROM public.clients WHERE slug='lab-write-a' RETURNING id$$,'B cannot delete client A');

RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
SELECT is_empty($$UPDATE public.clients SET name='Anonimo' WHERE slug='lab-write-a' RETURNING id$$,'Anonymous cannot update clients');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
