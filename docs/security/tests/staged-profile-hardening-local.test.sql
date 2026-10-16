-- Security regression for the staged column-level profile hardening.
-- Runs only against a disposable Supabase database with the staged migration applied.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(7);
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','role','UPDATE'),
  'client JWT cannot update its authorization role');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','client_id','UPDATE'),
  'client JWT cannot move itself to another organization');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','email','UPDATE'),
  'client JWT cannot change profile email');
SELECT ok(has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),
  'client JWT can still update display name');
SELECT ok(NOT has_table_privilege('authenticated','public.profiles','UPDATE'),
  'no broad profile table UPDATE for authenticated');
SELECT ok(NOT has_column_privilege('anon','public.profiles','full_name','UPDATE'),
  'anonymous users cannot change display names');
SELECT ok(NOT has_column_privilege('anon','public.profiles','role','UPDATE'),
  'anonymous users cannot modify roles');
SELECT * FROM finish();
ROLLBACK;
