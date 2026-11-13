> Registro histórico de preparação. Para o estado posterior à ativação do banco, ao rollback da publicação e à homologação local V2, consulte [a validação atual](team-v2-local-validation-20261016.md). As pendências abaixo descrevem a situação da rodada original.

# ROTEVO — Gestão de Usuários e Permissões: roteiro de homologação

Estado: **STAGED / NÃO ATIVADO**. Documento de revisão; não autoriza deploy, migração ou criação de usuários.

## Escopo preparado na branch de desenvolvimento

- Diretório administrativo: `GET /api/team/directory`, leitura de equipe, permissões explícitas e vínculos com projetos. Exige JWT validado, perfil `strategist` e membro `admin` ativo.
- Convites: `POST /api/team/invite`, controlado por `ROTEVO_TEAM_INVITES_ENABLED=true`. A interface só mostra o formulário após a capacidade ser autorizada pelo servidor.
- Permissões: `PATCH /api/team/permissions`, controlado por `ROTEVO_TEAM_PERMISSIONS_ENABLED=true`.
- Vínculos: `PATCH /api/team/assignments`, controlado por `ROTEVO_TEAM_ASSIGNMENTS_ENABLED=true`.
- Situação do membro: `PATCH /api/team/members/status`, controlado por `ROTEVO_TEAM_MEMBER_STATUS_ENABLED=true`; veda alteração da própria conta e de contas administradoras e usa proteção de concorrência.
- Os controles de edição da interface são exibidos apenas pelas capacidades fornecidas no diretório autenticado. Ocultação de botão não substitui validação do servidor.
- Nenhuma flag deve ser habilitada antes de confirmação das políticas RLS, consistência do esquema, mapeamento de funções e execução de testes funcionais com usuários de teste isolados.

## Bloqueios de aprovação

1. Revisar o SQL **proposto** `supabase/migrations/20261015_team_roles.sql`, inclusive grants, acesso da equipe, isolamento por cliente/projeto e efeitos sobre políticas antigas.
2. Revisar o SQL **proposto** `supabase/migrations/20261015_harden_profile_authorization.sql` e os fluxos atuais de edição de perfis. Confirmar que usuários não podem atribuir a si mesmos `role` ou `client_id`.
3. Validar quem cria o primeiro `team_members.admin` e como evitar lockout; não realizar bootstrap administrativo automático em produção.
4. Revisar todas as rotas de leitura/escrita de `planning_projects`, tarefas, calendário, agenda, documentos e publicação para efetivamente aplicar os papéis e vínculos; a existência de `team_member_permissions` não implica enforcement automático.
5. Implementar e revisar o processo seguro de ativação/desativação de membros (inclusive remoção de vínculos, sessões existentes, auditoria e prevenção de remoção do último administrador).
6. Testar fluxos completos com contas segregadas: admin, estrategista, gestor, produtor, financeiro, colaborador inativo e cliente. Conferir acesso cruzado entre projetos e clientes.
7. Fazer homologação com infraestrutura isolada e dados artificiais; não usar o Cliente Teste real nem o projeto Supabase de produção para testes mutáveis.

## Ordem de ativação controlada após aprovação explícita

1. Validar backup e plano de reversão das migrações; executar em ambiente de homologação.
2. Rodar verificações de esquema, RLS e testes autenticados em homologação; coletar evidências.
3. Homologar UI e fluxos de atribuição, concessão, revogação, convites e inativação.
4. Revisar permissões e logs antes de aplicar alterações autorizadas a ambientes reais.
5. Só habilitar cada flag no servidor quando os demais controles e integrações do respectivo recurso estiverem validados.

## Critério de conclusão

**Não considerar a Gestão de Usuários concluída** apenas porque TypeScript, build e testes de contrato passaram. É necessário comprovar enforcement em todas as rotas do projeto e homologação de operações autenticadas sem expansão indevida de privilégios.
