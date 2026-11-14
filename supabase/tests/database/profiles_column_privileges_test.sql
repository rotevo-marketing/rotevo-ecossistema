-- ROTEVO | pgTAP: profile privileges, isolated local database only.
-- Requires the four-table local baseline AND the local hardening fix.
-- No users are created and no production credentials are used.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass),'profiles has RLS enabled');
SELECT ok(has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),'authenticated may edit full_name');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','role','UPDATE'),'authenticated cannot edit role');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','client_id','UPDATE'),'authenticated cannot edit client_id');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','email','UPDATE'),'authenticated cannot edit email');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','updated_at','UPDATE'),'authenticated cannot edit updated_at');
SELECT ok(NOT has_column_privilege('anon','public.profiles','full_name','UPDATE'),'anon cannot edit full_name');
SELECT ok(NOT has_table_privilege('authenticated','public.profiles','UPDATE'),'authenticated has no blanket table UPDATE');
SELECT * FROM finish();
ROLLBACK;
