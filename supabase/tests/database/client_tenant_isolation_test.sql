-- ROTEVO - Local-only RLS tenant isolation regression.
-- Requires two fictitious local Auth users:
--   cliente.teste@rotevo.invalid (already created manually)
--   cliente.b@rotevo.invalid (to be created in LOCAL Studio before running).
-- No production data, no remote connection and no auth.users writes.
-- Entire test runs in a transaction rolled back by the Supabase CLI.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);

-- Stop rather than silently testing a missing user.
DO $guard$
BEGIN
  IF (SELECT count(*) FROM auth.users
      WHERE email IN ('cliente.teste@rotevo.invalid','cliente.b@rotevo.invalid')) <> 2 THEN
    RAISE EXCEPTION 'LAB ONLY: create both fictitious Auth users in the local Studio before running tenant isolation tests';
  END IF;
END;
$guard$;

-- Fixed synthetic tenant IDs for this transaction only.
INSERT INTO public.clients(id,name,slug,status)
VALUES
  ('a0000000-0000-4000-8000-000000000001','Empresa Ficticia A','lab-tenant-a','active'),
  ('b0000000-0000-4000-8000-000000000002','Empresa Ficticia B','lab-tenant-b','active');

INSERT INTO public.profiles(id,full_name,email,role,client_id)
SELECT id, 'Teste A', email, 'client','a0000000-0000-4000-8000-000000000001'::uuid
FROM auth.users WHERE email='cliente.teste@rotevo.invalid'
ON CONFLICT (id) DO UPDATE SET client_id=excluded.client_id,role='client';

INSERT INTO public.profiles(id,full_name,email,role,client_id)
SELECT id, 'Teste B', email, 'client','b0000000-0000-4000-8000-000000000002'::uuid
FROM auth.users WHERE email='cliente.b@rotevo.invalid'
ON CONFLICT (id) DO UPDATE SET client_id=excluded.client_id,role='client';

INSERT INTO public.client_users(client_id,user_id)
SELECT 'a0000000-0000-4000-8000-000000000001'::uuid,id
FROM auth.users WHERE email='cliente.teste@rotevo.invalid'
ON CONFLICT (client_id,user_id) DO NOTHING;

INSERT INTO public.client_users(client_id,user_id)
SELECT 'b0000000-0000-4000-8000-000000000002'::uuid,id
FROM auth.users WHERE email='cliente.b@rotevo.invalid'
ON CONFLICT (client_id,user_id) DO NOTHING;

INSERT INTO public.planning_projects(client_id,title,slug,status,data)
VALUES
 ('a0000000-0000-4000-8000-000000000001','Planejamento A','lab-plan-a','published','{"tenant":"A"}'::jsonb),
 ('b0000000-0000-4000-8000-000000000002','Planejamento B','lab-plan-b','published','{"tenant":"B"}'::jsonb);

SELECT set_config('request.jwt.claim.sub',
 (SELECT id::text FROM auth.users WHERE email='cliente.teste@rotevo.invalid'),true);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*) FROM public.clients WHERE slug='lab-tenant-a'),1::bigint,'A sees own client');
SELECT is((SELECT count(*) FROM public.clients WHERE slug='lab-tenant-b'),0::bigint,'A cannot see client B');
SELECT is((SELECT count(*) FROM public.client_users WHERE client_id='a0000000-0000-4000-8000-000000000001'),1::bigint,'A sees own membership');
SELECT is((SELECT count(*) FROM public.client_users WHERE client_id='b0000000-0000-4000-8000-000000000002'),0::bigint,'A cannot see B membership');
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-plan-a'),1::bigint,'A sees own project');
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-plan-b'),0::bigint,'A cannot see B project');

RESET ROLE;
SELECT set_config('request.jwt.claim.sub',
 (SELECT id::text FROM auth.users WHERE email='cliente.b@rotevo.invalid'),true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.clients WHERE slug='lab-tenant-b'),1::bigint,'B sees own client');
SELECT is((SELECT count(*) FROM public.planning_projects WHERE slug='lab-plan-a'),0::bigint,'B cannot see project A');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
