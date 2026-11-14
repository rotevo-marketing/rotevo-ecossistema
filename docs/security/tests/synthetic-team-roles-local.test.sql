-- Isolated CI only: team role and permissions fixture, transaction rolled back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(6);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) VALUES
('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','strategist-fixture@rotevo.invalid','',now(),now(),now()),
('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-fixture@rotevo.invalid','',now(),now(),now()),
('e1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inactive-fixture@rotevo.invalid','',now(),now(),now());
INSERT INTO public.profiles(id,role) VALUES
('e1000000-0000-4000-8000-000000000001','strategist'),
('e1000000-0000-4000-8000-000000000002','client'),
('e1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.team_members(user_id,display_name,role,active) VALUES
('e1000000-0000-4000-8000-000000000001','Test strategist','strategist',true),
('e1000000-0000-4000-8000-000000000002','Test admin','admin',true),
('e1000000-0000-4000-8000-000000000003','Test inactive admin','admin',false);

SELECT is((SELECT count(*)::integer FROM public.team_members WHERE role='admin' AND active=true),1,'one active admin');
SELECT is((SELECT count(*)::integer FROM public.team_members WHERE role='admin' AND active=false),1,'one inactive admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT is((SELECT count(*)::integer FROM public.team_members),3,'strategist can view team directory');
SELECT set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::integer FROM public.team_members),0,'admin without strategist profile has no direct directory SELECT under proposed RLS');
SELECT set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM public.team_members),0,'inactive admin has no direct directory SELECT');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.team_members WHERE active=false),1,'fixture remains intact');
SELECT * FROM finish();
ROLLBACK;
