# Inventário somente leitura — Supabase de produção (15/10/2026)

**Status:** metadados verificados; nenhuma operação de escrita, migration, usuário ou dado de cliente alterado. Não executar os testes de autorização contra este banco.
**Fonte:** consultas de catálogo via conector Supabase; branch de código `feature/admin-v2-redesign`.

## Estrutura confirmada
Quatro tabelas em `public`, todas com RLS habilitado:
- `clients`: PK `id uuid`; `name`, `slug` (unique), `contact_name`, `contact_email`, `whatsapp`, `status`, `cover_image_url`, `created_at`, `updated_at`.
- `profiles`: PK `id uuid` → `auth.users.id`; `client_id uuid` → `clients.id`; `full_name`, `email` (unique), `role` (client/strategist), `created_at`, `updated_at`.
- `client_users`: PK `id uuid`; `client_id` → `clients.id`, `user_id` → `auth.users.id`, `created_at`.
- `planning_projects`: PK `id uuid`; `client_id` → `clients.id`; `title`, `slug`, `description`, `status`, `data jsonb`, `published_at`, `created_at`, `updated_at`.

Esquema futuro em migrations **somente no repositório, não instalado**: `team_members`, `team_project_assignments`, `team_member_permissions`, `editorial_approvals`.

## Políticas reais (resumo por operação)
- `profiles`: próprio perfil SELECT e UPDATE; estrategista ALL via `is_strategist()`.
- `clients`: políticas SELECT por vínculo `client_users` ou `profiles.client_id`, além de SELECT/ALL estrategista; várias políticas de SELECT parcialmente redundantes.
- `client_users`: SELECT do próprio vínculo; ALL estrategista.
- `planning_projects`: SELECT cliente por vínculo `client_users` e por `profiles.client_id`; ALL, SELECT, UPDATE e DELETE estrategista com sobreposição.

Função confirmada: `public.is_strategist()` retorna EXISTS em `public.profiles` para `id=auth.uid()` e `role='strategist'`; `LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'`. As permissões EXECUTE da função ainda exigem verificação.

Gatilhos de usuário encontrados via consulta a `pg_trigger` nos esquemas `public` e `auth`: nenhum trigger não interno retornado. A criação de perfis é realizada por fluxo de aplicação conhecido e requer auditoria de todos os escritores.

## Achado crítico de privilégios
`anon` e `authenticated` possuem atualmente privilégios de tabela amplos (incluindo UPDATE) sobre as quatro tabelas. O RLS restringe linhas, **não colunas**: em `profiles`, um usuário autenticado pode, em tese, atualizar `role` e `client_id` do próprio registro conforme as políticas e grants observados. **Não reproduzir ataque em contas reais.** Verificar exploração em banco local com JWT e usuário fictício.

`planning_projects.data` contém um JSON multifuncional, e as políticas de SELECT do cliente não filtram as chaves desse JSON. Priorizar API/tabela de apresentação com autorização server-side antes de disponibilizar material interno.

## Integridade de ambientes
- O conector retornou lista de migrations **vazia** para o projeto de produção; isso não prova ausência de alterações históricas manuais.
- O conector retornou lista de branches de banco **vazia**.
- O repositório contém apenas três migrations de 15/10/2026; nenhuma fornece o baseline das quatro tabelas. Não reconstruí-las por inferência.

## Próximos passos antes de executar testes
1. Capturar **apenas esquema** (DDL, índices, constraints, RLS, grants, funções, extensões necessárias e objetos correlatos), por método de exportação que não acesse dados, sem aplicar alterações remotas. Conferir exportação e eliminar segredos/metadados sensíveis antes de versionar.
2. Reconciliar esquema exportado e histórico de migrations sem marcar nada como aplicado na produção.
3. Verificar `EXECUTE` em `is_strategist()`, grants herdados e mecanismos de acesso a `auth.users` no clone local.
4. Inicializar Supabase CLI local, sem vínculo remoto, com usuários e projetos sintéticos; bloquear o envio real de e-mail.
5. Criar testes pgTAP e API para autorização de perfil/coluna, isolamento entre clientes, JSON interno, equipe, convites e aprovações. Executar somente localmente, registrar falhas e repetir após correção local.
6. Analisar regressão de `/api/admin/create-client-access` e `/api/team/invite`.
7. Não ativar migrations reais, usuários ou permissões na produção sem autorização explícita.

Documentação consultada: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/database/postgres/column-level-security ; https://supabase.com/docs/guides/local-development/cli-workflows
