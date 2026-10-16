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

## Complemento de fechamento — rotas e testes da rodada

- Consulta de um projeto em `GET /api/admin/project`: verificação de equipe ativa, vínculo ao projeto e `projects.read`, por flag de rollout.
- Criação de planejamento em `POST /api/admin/project/create`: exige administrador ativo no novo modelo; somente quando a flag é habilitada.
- Apresentação de projeto para estrategista: autorização por projeto e permissão `projects.read` no modo novo, preservando a verificação separada do cliente.
- Criação de conta de cliente: exige administrador ativo após o rollout, antes de `auth.admin.createUser`.
- Simulação comportamental da função `mayMutateProject`: membro inativo, ausência de vínculo e permissão, erros de banco e administrador ativo, adicionada ao pipeline.
- [GitHub Actions #38940968231](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38940968231): seis jobs aprovados, incluindo TypeScript, build, banco PostgreSQL sintético e testes de autorização.

### Pendências que NÃO são resolvidas apenas por CI

1. A produção mantém grants de UPDATE para `profiles.role` e `profiles.client_id`. A correção está testada em PostgreSQL descartável, mas não implantada.
2. As tabelas de equipe propostas não existem no banco hospedado. O rollout permanece desabilitado.
3. As contas de novos papéis ainda dependem do filtro legado `profiles.role=strategist`. Migrar os fluxos de autenticação e navegação exige revisão de compatibilidade.
4. **Auditoria administrativa:** falta trilha de eventos persistida e transacional para concessão, revogação, ativação, convites e vínculos; não ativar mutações sem ela.
5. **Sessões revogadas:** `team_members.active=false` bloqueará as novas rotas sob enforcement, mas não encerra automaticamente sessões já abertas nem bloqueia caminhos legados sem migração.
6. **Último administrador:** as APIs atuais não permitem editar outros administradores nem a própria situação, portanto não há fluxo de transferência/remoção de administradores; definir procedimento seguro antes de liberar isso.
7. Identidades artificiais/RLS: o teste de esquema e grants foi executado; a matriz de políticas com diferentes usuários e projetos ainda não tem evidência de execução completa.
8. Revisão das demais superfícies de escrita/leitura no cliente, conteúdo, calendário, publicação e acesso direto ao Supabase permanece necessária.

**Não liberar produção:** apenas reavaliar quando migrations, atores administrativos, auditoria e suíte autenticada isolada estiverem testados e aprovados.
