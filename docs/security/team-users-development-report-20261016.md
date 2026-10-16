# ROTEVO 2027 — Relatório consolidado de autorização (16/10/2026)

Branch: `feature/admin-v2-redesign`
Implantação em produção: **não realizada**.
Último pipeline de código: [Actions #38935480724](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38935480724) — 5/5 jobs concluídos com sucesso.

## Entregas deste lote

1. `src/lib/security/teamProjectAuthorization.ts`: verificação compartilhada, ativável exclusivamente por `ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED=true`, de membro ativo, papel de administrador, vínculo ao projeto e permissão de escrita.
2. `src/app/api/admin/project/status/route.ts` e `delete/route.ts`: autorização pelo módulo compartilhado antes das mutações; preservadas validações de confirmação e versão existente.
3. `scripts/security/admin-route-contract.test.mjs`: regressão da ordem de autorização, negação para membro inativo, sem vínculo e sem permissão.
4. `docs/security/team-authorization-test-matrix.md`: matriz de perfis e operações para homologação em banco separado.

## Escopo anteriormente desenvolvido e validado

- Consulta administrativa de diretório, projetos e permissões da equipe.
- Formulário de convites e controles de membro, vínculos e permissões, condicionados às capacidades liberadas pelo servidor.
- Endpoints de convites, concessão/revogação de permissões, atribuições de projetos e situação ativa/inativa com flags desabilitadas por padrão.
- Controle staged para listagem e atualização de projetos.
- Pipelines de TypeScript, build, auditoria de dependências e testes isolados.

## Limitações ainda existentes

- O controle staged ainda exige o papel legado `profiles.role=strategist`: os novos papéis não estão plenamente habilitados.
- As migrações `20261015_team_roles.sql` e `20261015_harden_profile_authorization.sql` permanecem propostas; não foram aplicadas ao banco.
- RLS em projeto descartável com pgTAP, testes com usuários autenticados, integração entre todas as demais rotas (documentos/agenda/editorial/financeiro), auditoria de contas e ciclo de inativação ainda precisam de homologação.
- Uma bateria verde do GitHub confirma apenas os jobs nela definidos; **não equivale à homologação completa de todas as permissões**.
- As rotas protegidas por service role exigem checagens de autorização explícitas; a política RLS de tabelas isoladamente não substitui esse controle.

## Gate para avançar

Antes de habilitar qualquer flag em produção:
- revisar RLS e grants em banco isolado;
- testar negação e autorização por usuário, projeto e papel;
- validar o bootstrap administrativo, a revogação e as integrações;
- obter autorização específica para migração/deploy.

**Estado: desenvolvimento e testes automatizados do lote concluídos; homologação funcional de segurança e ativação permanecem pendentes.**


## Complemento: homologação PostgreSQL sintética

Foi acrescentado o job `Profile privilege isolation (synthetic PostgreSQL)` ao workflow `security-checks.yml`, executado exclusivamente em PostgreSQL 17 descartável (porta local 55432, credenciais artificiais, sem secrets hospedados). O arquivo `scripts/security/db-profile-grants-isolated.sql` reproduz os grants vulneráveis em um perfil sintético, aplica `20261015_harden_profile_authorization.sql` e valida a revogação de UPDATE de `role`, `client_id`, `email` e a manutenção de UPDATE de `full_name`. A execução [#38937259033](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38937259033) confirmou sucesso nesse novo job. Este teste **não cobre RLS real, sessões nem a aplicação em produção**, que permanecem pendentes.
