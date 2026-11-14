# ROTEVO — Matriz do laboratório de autorização
Status: preparação documental, sem executar migrações nem acessar produção.

## Dependências confirmadas
- Baseline estrutural: docs/security/verified-schema-baseline-draft.sql (quatro tabelas; não é esquema completo).
- Políticas e concessões: docs/security/observed-rls-policies-review-only.sql e docs/security/observed-rls-and-grants-20261015.md.
- Plano de montagem: docs/security/lab-migration-assembly-plan.md (não executável).
- Migrações propostas: 20261015_harden_profile_authorization.sql e 20261015_team_roles.sql.
- Migração editorial: 20261015_editorial_approvals.sql (não necessária ao primeiro ciclo de convites).

## Sequência segura
1. Conferir definições completas de RLS, GRANTs, função is_strategist, índices, owners e dependências contra o inventário histórico.
2. Preparar baseline exclusivamente de laboratório com Supabase CLI isolado e sem vínculo remoto.
3. Executar caracterização de permissões antes de corrigir o baseline; aplicar endurecimento somente no banco sintético.
4. Incorporar tabelas de equipe locais após validar referências a auth.users, profiles e planning_projects.
5. Criar identidades fictícias client A, client B, strategist, admin ativo e admin inativo, sem emails reais.
6. Testar HTTP com autenticação verdadeira local: clientes negados, strategist habilitado na rota de clientes, admin ativo autorizado a convidar, admin inativo negado.
7. Introduzir falhas sintéticas entre criação Auth e registro relacional; exigir consistência e reconciliação.
8. Documentar HTTP status, mutações efetivas e ausência de vazamento por caso. Não declarar aprovação sem execução.

## Barreiras
- Não executar db push, db reset --linked nem publicar migrações remotas.
- O db reset local é destrutivo para o banco local; somente em instância descartável previamente preparada.
- Os testes anônimos em CI não validam permissões autenticadas nem RLS.
- Não adicionar credenciais reais ao GitHub Actions ou ao código.

Fontes oficiais: https://supabase.com/docs/guides/local-development/testing/overview e https://supabase.com/docs/guides/local-development/cli-workflows