-- Local-only characterization of legacy profile privilege escalation.
-- No auth users or real customer records. Transaction rolls back changes.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(6);
SELECT ok(has_column_privilege('authenticated','public.profiles','role','UPDATE'),
  'legacy authenticated role can update profiles.role (vulnerability characterized)');
SELECT ok(has_column_privilege('authenticated','public.profiles','client_id','UPDATE'),
  'legacy authenticated role can update profiles.client_id (vulnerability characterized)');
REVOKE UPDATE ON public.profiles FROM anon,authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','role','UPDATE'),
  'local hardening denies changes to role');
SELECT ok(NOT has_column_privilege('authenticated','public.profiles','client_id','UPDATE'),
  'local hardening denies changes to client_id');
SELECT ok(has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),
  'local hardening retains name editing');
SELECT ok(NOT has_table_privilege('authenticated','public.profiles','UPDATE'),
  'local hardening removes blanket table UPDATE');
SELECT * FROM finish();
ROLLBACK;
