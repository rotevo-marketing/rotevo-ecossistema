-- ROTEVO 2027 — SOMENTE LEITURA. Seguro para consulta de prontidão.
-- Não executa DDL, DML, transações de escrita ou migrações.
select
 current_database() as banco,
 current_user as executor,
 to_regclass('public.profiles') is not null as perfil_existe,
 to_regclass('public.team_members') is not null as equipe_existe,
 to_regclass('public.team_project_assignments') is not null as vinculos_existem,
 to_regclass('public.team_member_permissions') is not null as permissoes_existem,
 to_regclass('public.team_audit_events') is not null as auditoria_existe,
 has_table_privilege('authenticated','public.profiles','UPDATE') as atualizacao_irrestrita_do_perfil,
 has_column_privilege('authenticated','public.profiles','role','UPDATE') as usuario_pode_atualizar_role,
 has_column_privilege('authenticated','public.profiles','client_id','UPDATE') as usuario_pode_atualizar_cliente,
 has_column_privilege('authenticated','public.profiles','full_name','UPDATE') as usuario_pode_atualizar_nome;

-- Confirmação de identidade do administrador, sem utilizar ou alterar senha.
select p.id,p.email,p.full_name,p.role,
       lower(u.email)=lower(p.email) as email_auth_confere
from public.profiles p
join auth.users u on u.id=p.id
where lower(p.email)='contato@rotevo.com.br';

-- Políticas antigas: qualquer regra ampla baseada apenas em strategist exige
-- revisão antes de ativar colaboradores com acesso por projeto.
select tablename,policyname,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename in
 ('profiles','clients','client_users','planning_projects')
order by tablename,policyname;

-- Não confundir archive_mode ON com backup comprovadamente restaurável:
-- a comprovação de recuperação depende do painel de backups do Supabase.
