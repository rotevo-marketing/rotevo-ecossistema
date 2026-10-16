# ROTEVO | Pré-validação das migrações e laboratório de autorização

Data: 2026-10-15. Escopo: revisão estática da branch de desenvolvimento. Não foram realizadas migrações, testes de banco ou alterações remotas.

## Fontes examinadas
- supabase/migrations/20261015_team_roles.sql
- supabase/migrations/20261015_harden_profile_authorization.sql
- supabase/migrations/20261015_editorial_approvals.sql
- supabase/tests/database/client_tenant_isolation_test.sql
- supabase/tests/database/profiles_column_privileges_test.sql
- src/app/api/admin/create-client-access/route.ts
- src/app/api/team/invite/route.ts

## Dependências verificadas
1. A migration de equipe depende de auth.users, public.profiles e public.planning_projects. A definição de team_members inclui papel admin, e a API de convites exige admin ativo na tabela team_members.
2. A migration de privilégios de profiles pressupõe tabela e RLS já presentes, restringe UPDATE autenticado a full_name. É declaradamente proposta e requer revisão dos fluxos que atualizam campos de perfil.
3. A migration editorial depende de profiles e planning_projects, mais o formato editorialCalendar em JSONB; não deve ser aplicada apenas para testar convites.
4. O teste de isolamento entre clientes pressupõe duas contas Auth locais fictícias já existentes, além das tabelas clients, profiles, client_users e planning_projects.
5. O teste de privilégios de profiles pressupõe baseline de quatro tabelas e aplicação *local* do endurecimento.
6. O repositório possui apenas migrações parciais e não demonstra, por si, uma reprodução completa do esquema atual de produção. Não executar automaticamente as migrações sobre um banco vazio e declarar aprovação.

## Contratos de autorização a validar
- /api/admin/create-client-access: identifica estrategista via profiles.role='strategist', mas não verifica no código analisado a existência e legitimidade de clientId antes de auth.admin.createUser.
- /api/team/invite: exige team_members.role='admin' e active=true. Este papel não coincide com o estrategista permitido no endpoint de clientes; conferir decisão de negócio antes de harmonizar.
- Ambos possuem possibilidade de estado parcial entre operação Auth e cadastro relacional.
- Testes sem token foram realizados separadamente via CI; não substituem testes autenticados com banco local e identidades sintéticas.

## Bloqueadores
A. Garantir snapshot/esquema local reproduzível, sem credenciais ou dados reais.
B. Elaborar fixtures Auth locais e migrações ordenadas, com rollback de laboratório.
C. Confirmar modelo vigente de funções (admin vs strategist) com a arquitetura da plataforma.
D. Testar com identidades autenticadas diferentes e verificar ausência de operações service-role em acesso negado.
E. Testar falhas parciais e reconciliação antes de corrigir fluxos de produção.

## Decisão
Nenhuma migration aplicada. Nenhum deployment. Preparar primeiro o laboratório completo e independente, preservando produção e UI existentes.

Referências: https://supabase.com/docs/guides/local-development/cli-workflows ; https://supabase.com/docs/guides/local-development/testing/overview
