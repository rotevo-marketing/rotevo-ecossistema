-- ROTEVO | Auditoria somente leitura para Supabase LOCAL
-- Não contém DDL/DML, credenciais, nem operações administrativas.
-- Execute exclusivamente em laboratório Supabase local reproduzido.
-- Saída destinada à comparação com o inventário observado, NÃO é prova de segurança.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       l.lanname AS language,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       pg_get_userbyid(p.proowner) AS function_owner,
       has_function_privilege('PUBLIC',p.oid,'EXECUTE') AS public_can_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.proname='is_strategist';

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       has_table_privilege('authenticated',c.oid,'UPDATE') AS authenticated_can_update_table,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_can_select_table
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('profiles','clients','client_users','planning_projects')
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

SELECT a.attname AS column_name,
       has_column_privilege('authenticated','public.profiles',a.attname,'UPDATE') AS authenticated_can_update
FROM pg_attribute a
WHERE a.attrelid=to_regclass('public.profiles') AND a.attnum>0 AND NOT a.attisdropped
ORDER BY a.attnum;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
AND tablename IN ('profiles','clients','client_users','planning_projects')
ORDER BY tablename,policyname;
