# Gestão de Usuários e Permissões — status de encerramento técnico

**Status: CÓDIGO PREPARADO / HOMOLOGAÇÃO DE AUTORIZAÇÃO INCOMPLETA / PRODUÇÃO NÃO ALTERADA.**

## Implementado na branch de desenvolvimento

- Diretório de equipe com consulta protegida no servidor.
- Visualização dos vínculos e permissões por colaborador.
- Operações administrativas preparadas e bloqueadas por flags: convite, ativação/inativação, concessão/revogação e vínculo/desvínculo de projeto.
- Rotas de projetos com verificações transitórias para acesso por projeto e permissões; parte do sistema ainda usa `profiles.role=strategist`.
- Testes automatizados do build, TypeScript, chamadas anônimas e concessões de banco.
- Testes em PostgreSQL descartável confirmando a migração de restrição de UPDATE em `profiles` e as configurações SQL propostas para tabelas de equipe.
- Convite reforçado com verificação do perfil legado `strategist` além de administrador ativo.

## Ações pendentes antes de declarar conclusão

1. **Segurança crítica:** o banco hospedado ainda tem `authenticated` com UPDATE nas colunas `profiles.role` e `profiles.client_id`; bloqueio aprovado em banco sintético, mas **não aplicado em produção**.
2. Testar RLS em banco isolado com identidades distintas (admin, estrategista, produtor, financeiro, cliente) e acessos cruzados por projeto.
3. Integrar enforcement completo por função em todas as rotas de clientes, documentos, calendário, publicações e demais serviços. As flags, sozinhas, não criam isolamento global.
4. Validar provisionamento inicial do administrador, fluxo de convite inconsistente, expiração de acesso, inativação e recuperação; garantir auditoria e controle de sessões.
5. Confirmar que não é possível alterar o último administrador; resolver papéis legados antes de liberar os novos perfis.
6. Validar com contas artificiais e projeto isolado; não executar testes mutáveis com o cliente real nem com o Supabase de produção.
7. Após homologação e autorização específica, planejar a migração, backup, reversão e ativação gradual das flags.

## Decisão sobre avanço

É viável **iniciar em paralelo a revisão do código legado**, mas não declarar concluída a Gestão de Usuários nem habilitar convites/mutações enquanto estes bloqueios persistirem.

## Evidências de referência

- `docs/security/production-readonly-authorization-audit-20261016.md`
- `docs/security/team-authorization-test-matrix.md`
- `docs/security/team-permissions-rollout-checklist.md`
- `supabase/tests/database/team_authorization_hardening_test.sql`
