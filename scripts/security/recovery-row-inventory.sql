\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
set timezone='UTC';
select format(
 'select jsonb_build_object(''table'',%L,''rows'',count(*),''fingerprint'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),''''))) from %I.%I r;',
 n.nspname||'.'||c.relname,n.nspname,c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','auth','storage','vault') and c.relkind='r'
order by n.nspname,c.relname
\gexec
