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
