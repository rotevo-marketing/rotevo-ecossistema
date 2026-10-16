-- Experimental verification only. Run against a disposable Supabase instance.
-- Do not apply this transaction to the hosted Supabase project.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);
SELECT ok(has_function_privilege('anon','public.is_strategist()','EXECUTE'),'fixture confirms original anonymous permission');
SELECT ok(has_function_privilege('authenticated','public.is_strategist()','EXECUTE'),'fixture confirms authenticated permission');
REVOKE EXECUTE ON FUNCTION public.is_strategist() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_strategist() TO authenticated;
SELECT ok(NOT has_function_privilege('anon','public.is_strategist()','EXECUTE'),'anonymous function execution revoked');
SELECT ok(has_function_privilege('authenticated','public.is_strategist()','EXECUTE'),'authenticated RLS caller retains function execution');
SELECT ok(NOT has_function_privilege('PUBLIC','public.is_strategist()','EXECUTE'),'public pseudo-role has no EXECUTE after revocation');
SELECT * FROM finish();
ROLLBACK;
