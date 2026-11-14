# UI 3.0 | Gate 0/1 — Reconciliação e contratos operacionais
Data: 13/11/2026. Estado: **branch isolada; não publicado; não é aceite E2E**.

## Evidências recuperadas
- `main` e as duas branches têm `vercel.json` com `git.deploymentEnabled=false`.
- Branch de integração: `feat/ui3-operational-integration-20261113`, derivada de `feat/ui3-editorial-decision-transaction-isolated-20261112` (PR #11), preservando a implementação de eventos/notificações e controles de sessão.
- `feat/editorial-idea-approval-flow-20261113` (PR #14) diverge do PR #11: 25 commits exclusivos no PR #14 e 100 no PR #11 desde `10fcf43025ed0ed2e3eee9819381eb499389b7f2`.
- Produção: `rotevo_workflow` ausente, 0 funções públicas `rotevo_workflow_%`; homologação: 5 tabelas no schema e 2 funções públicas de notificação (consultas somente leitura, 13/11).
- Domínio da Vercel permanece associado ao deployment Production READY `dpl_De18doqJuWQRFHBnn5jZgg3hUghU`, SHA `8cd22a88`.

## Matriz de conflito e decisão de integração
| Área | PR #11 | PR #14 | Direção e gate |
| --- | --- | --- | --- |
| `EditorialCalendar.tsx` | `ProjectConversation` aceita `approval`, flags de workflow e decisões; `idea_pending` | Acrescenta `idea_changes`, `EditorialIdeaDecision` e tela publicada mais completa | **Não copiar arquivo integral de um PR sobre o outro**. Integrar campos e novo status sobre layout publicado preservado, com uma fonte de decisão |
| `ProjectConversation.tsx` | Composer de conversa + decisões por etapa | Componente de conversa sem `approval` | Manter a implementação de mensagens/autorização do PR #11; eliminar caminhos formais paralelos após reconciliação |
| `EditorialIdeaDecision.tsx` | Requer `idea_pending` legado | Decisão em `idea`, correção em `idea_changes` | Migrar interface para `idea` com compatibilidade de leitura de `idea_pending`; definir único acionador |
| `src/app/api/admin/project/update/route.ts` | Estado protegido conforme implementação anterior | Bloqueia saltos `idea → production` e decisões manuais | Portar guardas do PR #14 e verificar CAS, versão, permissão antes do merge |
| SQL editorial | Fluxo transacional de eventos/notificações PROPOSAL-ONLY | RPC de aprovação de ideia com rollback e bloqueio multiusuário | Reconciliar transação e autorização do aprovador; laboratório primeiro; nunca aplicar SQL do PR #14 isoladamente em produção |
| `EditorialManager.tsx` | Fluxo/status anterior | Adapta status/edição | Aplicar mudanças incrementais sem perder detalhes aprovados em produção |

## Contratos aprovados e pontos que ainda dependem de implementação
1. Editorial: `idea → idea_approved → production → review → awaiting_client → approved → scheduled → published`. Ajustes da ideia retornam para `idea` numa **nova versão**; ajustes finais retornam à produção/revisão e à aprovação final numa nova versão.
2. `idea_pending` é legado legível, mas não opção de novo estado na UI. Uma ideia compartilhada com decisão pendente pode ser aprovada mesmo quando o estado é `idea`.
3. `deadlineDate` é prazo de conclusão do conteúdo, independente de `publishDate`. `launchDate` é lançamento opcional da tarefa, independente de `dueDate`.
4. Atribuição exige `auth.uid()` de usuário cliente efetivamente associado a projeto e recurso. `visibleToClient` não autoriza entrega, edição ou aprovação.
5. Participação: `pending → in_progress → submitted → validated`; correção: `submitted → correction_requested → pending/in_progress → submitted`. Submissão **não** aprova/publica o conteúdo.
6. Decisão formal contém fase, recurso, versão, aprovador designado, timestamp e motivo obrigatório ao solicitar ajustes; eventos e notificações são distintos de mensagens.
7. Ações e alertas: destinatário explícito, autorização revalidada por evento, idempotência, não enviar ao autor, revogação/tenant/G2 e proteção de sessão.
8. Visão Geral cliente: cartões Para hoje, Atrasadas, Aprovações, Agenda; listas 5/5/5/3, contadores totais; calendário só em Conteúdo; nenhuma duplicação de aprovação.
9. Não remover ou reconstruir o chat bilateral publicado. Não reativar placeholders de conversa em produção.
10. Identidade e tema: menu ativo com barra reta, perfil avatar/seta, Claro/Escuro/Sistema com preferência isolada por usuário e testes WCAG.

## Limites dos contratos puros introduzidos neste bloco
Arquivo `src/lib/workflow/ui3OperationalContracts.ts` e teste `scripts/security/ui3-operational-contracts.test.mjs` estabelecem regras testáveis de nomenclatura, transição, atribuição e datas, **sem alterar rotas existentes, banco, flags ou dados reais**. Estas funções não constituem uma política de autorização, nem integração de UI. Os avisos de data posterior são regras de validação propostas; registros legados não devem ser regravados.

## Próximos gates
- Comparar código completo, manter o novo layout publicado e construir interface única de aprovação com testes de regressão.
- Auditar `planning_projects` JSON, projeções, RLS/GRANT, índices, APIs, storage e mecanismo de eventos antes de criar as entidades `client_action_assignments` e `client_action_submissions`.
- Criar dados sintéticos e ensaiar concorrência, permissões multiusuário e rollback no Supabase isolado. Definir aprovador designado antes de desbloquear múltiplos logins.
- Rodar TypeScript, Next build, testes de contrato, HTTP e testes E2E; homologação visual autenticada exige Preview separadamente autorizada.
- Verificar backup/restauração isolada antes de qualquer release. **NO-GO para produção**.

## Segurança e publicação
Nenhum deploy, Preview, merge, alteração de plano, execução de migração em produção ou mudança de dados reais foi autorizado por este documento. O registro não deve ser interpretado como aprovação de release.

## Auditoria adicional de laboratório (somente leitura, 13/11)
- `planning_projects.data` permanece `jsonb`. Os dados de conteúdo e tarefas devem ser alterados por rotas compatíveis com CAS; não introduzir atualização concorrente que substitua todo o JSON indiscriminadamente.
- `user_preferences` contém `user_id`, `display_name`, `avatar_asset_id` e `updated_at`; **não existe coluna de tema no esquema inspecionado**, portanto Claro/Escuro/Sistema exige migração isolada e testes de autorização antes de integração.
- `editorial_approvals` e `editorial_idea_approvals` registram recurso/versão, decisão, comentário e `decided_by`; `rotevo_collaboration_messages` conserva histórico separado de conversa.
- Cinco tabelas internas do schema `rotevo_workflow` estão com RLS habilitada e **nenhuma política retornada por `pg_policies`**. Os GRANTs explícitos inspecionados mostram somente `postgres` nessas tabelas; o acesso externo deve permanecer via RPCs autorizadas, com revisão integral de `SECURITY DEFINER` e `search_path`. Não criar permissões abertas de tabela para contornar isso.
- As duas RPCs públicas de notificação existem no laboratório; funções de solicitações/decisões também existem, mas não substituem os testes autenticados de GoTrue/PostgREST, nem comprovam autorização multiusuário.
- Nenhuma estrutura `client_action_assignments`/`client_action_submissions` foi criada neste bloco.

## Atualização de interface incremental
- `EditorialCalendar.tsx`: `idea_pending` agora recebe rótulo de exibição "Ideia" (compatibilidade legada); `idea_changes` recebe "Ajustes na ideia", incluindo cores de lista/calendário.
- Estados de decisão e correção de ideia foram excluídos da seleção manual de situações. A projeção de decisão existente passa a diferenciar correção de ideia (`idea_changes`) de correção final (`changes_requested`).
- **Ainda não é a integração completa de aprovação**: os acionadores e transações do PR #11 devem ser conciliados com o PR #14. Não ativar workflow por esta alteração isolada.

## Bloco de implementação incremental e regressão posterior
- Conteúdo: `deadlineDate` opcional separado de `publishDate` no cadastro, detalhes e colunas da lista (Prazo / Publicação). API protege mudança de prazo em versão já aprovada, valida ordenação sem migrar registros antigos.
- Tarefas: `launchDate` opcional separado de `dueDate`; campos de criação, edição e detalhe do Portal do Cliente, colunas Prazo / Lançamento no painel interno. Atraso continua baseado em `dueDate`; API valida lançamento quando muda prazo ou lançamento, sem fabricar datas para registros anteriores.
- Aprovação: propostas SQL transacionais `ui3-editorial-workflow-request` e `ui3-editorial-workflow-rpc` foram reconciliadas para não criar `idea_pending` novo. A ideia compartilhada permanece `idea` enquanto `approval_requests` está pendente; resposta formal aprova (`idea_approved`) ou solicita ajuste (`idea_changes`). Legado `idea_pending` segue aceito para decisões antigas. Novas ideias sem request pendente não podem ser aprovadas apenas por estarem visíveis. Testes SQL isolados foram atualizados. **Não ativar flags nem publicar sem fluxo autenticado completo**.
- Participação do cliente: esquema privado fail-closed `docs/security/sql/ui3-client-actions-PROPOSAL-ONLY.sql` e teste PostgreSQL descartável. RLS habilitada sem políticas abertas; sem conceder acesso direto `anon`/`authenticated`. Ainda faltam RPCs de autorização e operações reais.
- Cabeçalhos: disparadores de perfil de estrategista e cliente apresentam somente avatar e seta dinâmica; nome segue no menu expandido. Preservados fechamento por Escape e fora.
- A CI continua sem deployment Vercel. Verificar o job de build e testes da revisão final antes de qualquer afirmação de aceite.

## Continuidade — foco do Portal do Cliente e designação de aprovadores
- `ClientOverview.tsx`: quatro áreas de foco Para hoje, Atrasadas, Aprovações e Agenda. Limites por lista 5/5/5/3, botões para visualizar todos, sem duplicar o calendário editorial (permanece na seção Conteúdo). Contadores derivam de dados compartilhados permitidos, sem tratar toda tarefa visível como atribuição pessoal. Tarefas e conteúdos arquivados/excluídos não devem compor a visão ativa.
- Fase de aprovação de ideias: a UI **não** considera `idea` sozinha prova de aprovação pendente; enquanto não houver RPC de solicitações pendentes e aprovador designado autorizado, apenas os estados legados verificáveis compõem o indicador. Isso pode subcontar solicitações novas e exige integração posterior, mas evita ação formal inventada.
- `scripts/security/ui3-client-overview-contract.test.mjs`: testes estáticos das quatro seções, limites, visibilidade por módulo e ausência de calendário duplicado; integrado à suíte de segurança.
- `docs/security/sql/ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql`: tabela privada para aprovador ativo único por projeto/fase, com histórico de revogação. O arquivo **não** é migração; a escolha efetiva deve ser autorizada por RPC transacional, com prova de vínculo `client_users`, identidade ativa, tenant e G2. Teste SQL adicionado ao laboratório PostgreSQL descartável.
- A conclusão técnica permanece subordinada a resultados de CI, homologação com identidades sintéticas, a designação real autorizada e aceite visual. Sem deployment, sem alteração hosted, sem ativar flags.

## Bloco de serviço de atribuições e submissão (13/11 à noite)
- `src/lib/workflow/clientActionsContract.ts`: validação estrita de payloads (UUID, projeto, usuário designado, recurso, versão, instruções, prazo e chave de idempotência), rejeitando propriedades desconhecidas.
- `src/app/api/workflow/client-actions/route.ts`: criação e leitura de atribuições via RPC, com token autenticado do usuário, proteção contra mudança de sessão e `ROTEVO_CLIENT_ACTIONS_ENABLED` **desligado por padrão**.
- `src/app/api/workflow/client-actions/submit/route.ts`: entrega em texto, sem upload e sem aprovações editoriais automáticas; usa autenticação e RPC de submissão com chave de idempotência.
- `docs/security/sql/ui3-client-action-rpc-PROPOSAL-ONLY.sql`: `rotevo_client_action_create` confirma usuário da equipe autorizado, projeto/cliente, `client_users`, recurso compartilhado válido e versão, sem inventar responsabilidade; `rotevo_client_action_list` lista SOMENTE atribuições da identidade cliente, revalidando visibilidade e versão em cada leitura.
- `docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql`: submissão em texto somente por usuário designado e ainda vinculado; bloqueia item oculto, cancelado, versão alterada, duplicação ou nova submissão enquanto aguarda revisão. Ainda falta revisão/aprovação de entregas pela equipe.
- `scripts/security/db-ui3-client-action-rpc-isolated.sql` e `db-ui3-client-action-submission-isolated.sql`: ensaios PostgreSQL descartáveis de tenant, G2, recurso oculto, revogação, duplicação, submissão e replay.
- `scripts/security/ui3-client-action-contract.test.mjs`: testes de contrato HTTP e payload. O primeiro run detectou regex UUID incompleta, corrigida antes da próxima verificação.
- **Gates restantes:** migração somente no laboratório autorizado, fixtures de usuários sintéticos reais no Auth, upload privado e revisão de entrega, eventos/notificações, integração visual e testes E2E; não habilitar flag antes desses passos.

## Continuidade da revisão operacional — revisão, reenvio e fila (13/11)
- `docs/security/sql/ui3-client-action-review-PROPOSAL-ONLY.sql`: revisão transacional de submissão atribuída por integrante autorizado da equipe. A função exige identidade válida, G2, vínculo vigente do cliente, recurso visível e versão correspondente. Validação conclui a atribuição; pedido de ajuste exige justificativa e devolve a atribuição para reenvio. Decisões reaplicadas literalmente são idempotentes, decisões contraditórias geram conflito, revisões antigas são bloqueadas. **Não altera o status editorial nem publica conteúdos.**
- `docs/security/sql/ui3-client-action-review-queue-PROPOSAL-ONLY.sql`: fila interna das entregas pendentes, restrita por projeto/permissão G2, com limite de 100 por leitura e revalidação de vínculo do cliente, versão e visibilidade. O cliente não tem acesso à fila interna.
- Rotas `/api/workflow/client-actions/review` e `/api/workflow/client-actions/review-queue`: exigem token e identidade corrente, não usam service-role e permanecem desligadas por `ROTEVO_CLIENT_ACTIONS_ENABLED`.
- `ClientActionReviewPanel.tsx`: painel compacto de revisão integrado à Central de Tarefas **somente** com `NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED=true`. O botão validar mantém decisão formal separada da aprovação editorial. Solicitar ajustes requer justificativa. As duas flags continuam desligadas nesta branch e na produção.
- Testes SQL descartáveis `db-ui3-client-action-review-isolated.sql` e `db-ui3-client-action-review-queue-isolated.sql`: revisor autorizado, cliente impedido de validar, colaborador inativo, pedido de ajustes, idempotência, reenvio, validação, histórico, tenant e revogação de recurso. Contratos de frontend/API também adicionados.
- **Ainda faltam**: revisão autenticada via navegador com contas sintéticas, notificação transacional da decisão, upload privado, designação do aprovador e preferência por usuário. Não executar os SQLs em bancos hospedados nem ativar flags.

## Continuidade — revisão operacional autenticada e preferência (13/11)
- `ClientActionReviewPanel.tsx`: superfície de revisão incluída na Central de Tarefas somente quando `NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED=true`. A fila recebe entregas do RPC interno, verifica identidade via sessão, exibe justificativa e permite validação ou pedido de ajustes. Em troca de conta ou logout os dados em memória são eliminados e consultas anteriores não podem repovoá-los.
- `ui3-client-action-review-PROPOSAL-ONLY.sql`: RPC G2 de revisão transacional, bloqueia autoaprovação pelo cliente, inativos, versões revogadas, inconsistências de submissão, duplicação contraditória e reavaliação obsoleta. Correção exige feedback, submissões históricas continuam registradas.
- `ui3-client-action-review-queue-PROPOSAL-ONLY.sql`: fila privada com checagem por projeto e G2, somente registros pendentes, limite de 100, versionamento e visibilidade revalidados. `/api/workflow/client-actions/review-queue` exige identidade e flag desligada por padrão.
- SQL descartável `db-ui3-client-action-review-isolated.sql` e `db-ui3-client-action-review-queue-isolated.sql`: verificações de revogação, correção/reenvio, decisão validada, tenant, G2 e retenção do histórico.
- **Preferência por usuário**: `docs/security/sql/ui3-account-appearance-PROPOSAL-ONLY.sql` cria coluna `appearance` em `user_preferences`, limitada a `light`, `dark`, `system`, e RPCs de leitura/gravação usando `auth.uid()` sem alterar nome/avatar. Rota `/api/account/appearance` fica inativa por `ROTEVO_APPEARANCE_ENABLED`, sem UI de escolha e sem CSS de modo escuro ativado. Testes em PostgreSQL descartável e contratos HTTP.
- **NO-GO**: nenhuma proposta SQL foi aplicada em Supabase hospedado; nenhuma flag foi ativada; sem deploy, Preview, merge ou alterações em clientes. Ainda faltam uploads privados, notificações transacionais, configuração visual integral Claro/Escuro/Sistema, E2E autenticado e recuperação de backup.


## Bloco integrado — armazenamento, notificações, aprovadores e aparência (13/11)
### Privacidade de anexos
- `ui3-client-action-storage-PROPOSAL-ONLY.sql`: bucket privado `rotevo-client-deliveries`, limites de 25 MiB/MIME, upload autenticado imutável por caminho `assignmentId/userId/assetUUID.ext`, revalidação de vínculo cliente, projeto, versão, recurso visível e revogação. Sem URL pública, upload assinado ou permissão de atualizar/deletar o objeto.
- `ui3-client-action-submit-asset-PROPOSAL-ONLY.sql`: associa arquivo existente à submissão transacional, respeitando a validação do RPC de entrega textual, o dono do arquivo e idempotência. Arquivo não substitui aprovação editorial.
- Endpoint `/api/workflow/client-actions/submit-asset`, protegido por `ROTEVO_CLIENT_ACTIONS_ENABLED` e `ROTEVO_PRIVATE_DELIVERIES_ENABLED`. A interface `ClientActionDeliveryPanel` no dashboard utiliza upload autenticado, `upsert:false`, nome aleatório, validação de tamanho/MIME e nunca solicita service-role; fica oculta por flags públicas. Anexos podem ficar órfãos se a submissão falhar após o upload, portanto ainda será necessário procedimento seguro de limpeza/retenção.

### Notificações operacionais
- `ui3-client-action-notifications-PROPOSAL-ONLY.sql`: extensão dos eventos/notificações privados já existentes, por gatilhos transacionais de atribuição, submissão e revisão. Destinatário é a identidade designada e/ou responsável interno autorizado, sem enviar ao autor; eventos idempotentes. O read RPC existente deve continuar revalidando acesso ao projeto e recurso.
- `WorkflowNotificationBell`: rótulos de atividade atribuída, entrega para validação e entrega validada; navegação por tipo do recurso (tarefa/conteúdo).
- Não há disparo externo de e-mails, WhatsApp ou push nesta implementação.

### Aprovadores
- `ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql` preserva cada ciclo de nomeação e revogação, um único aprovador ativo por projeto e etapa.
- `ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql`: somente estrategista admin ativo pode designar conta cliente vinculada ao projeto, com motivo e histórico. API `/api/workflow/editorial/designate-approver` segue inativa por `ROTEVO_DESIGNATED_APPROVAL_ENABLED`.
- Transações propostas de **solicitação e decisão editorial** agora usam o aprovador designado por projeto/fase. Caso não haja designação, somente um usuário cliente efetivamente vinculado pode agir; com dois ou mais, bloqueiam por padrão. Teste multiusuário com destinatário e decisão explícitos está no PostgreSQL descartável.

### Aparência
- `AccountAppearancePreference` nos dois menus; `AccountAppearanceBootstrap` persistente nos shells para reabrir menus, mudanças do sistema operacional e troca de conta, sem localStorage.
- `rotevo-ui3.css` contém somente fundação de tokens de contraste da estrutura; preservar editores/documentos. **Tema escuro integral ainda NÃO homologado.** Ambas as flags `ROTEVO_APPEARANCE_ENABLED` e `NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED` desligadas por padrão.

### Evidências e liberação
- Todas as alterações permanecem no PR #15 Draft, sem merge, Preview ou deploy. Os novos SQLs continuam propostas e foram exercitados exclusivamente em PostgreSQL descartável; nem produção nem projeto Supabase hospedado de homologação receberam migração.
- Gate de saída: CI 9/9 do último commit, E2E autenticado com usuários e arquivos sintéticos, UX/acessibilidade no navegador, teste de Storage privado real em homologação, revisão de retenção/limpeza, registro do backup e prova de restauração isolada, só então autorização específica.
