# Rotevo UI 3.0 — Gate A: reconciliação de contratos, G2 e dependências
Data: 12/11/2026
Estado: auditoria e modelagem **proposta**; não é migration nem autorização de publicação.
Base verificada: produção Vercel commit `10fcf43025ed0ed2e3eee9819381eb499389b7f2`.
Origem funcional: Protocolo Rotevo UI 3.0 (Central de Aprovações, Comunicação Bilateral e Notificações, 12/11), complementado pelo relatório de auditoria da mesma data.
Fontes verificadas: componentes GitHub, SQL de metadados/funções/policies Supabase de produção, PRs abertos #5–#8, documentação oficial Supabase de Realtime Authorization, Broadcast e funções PostgreSQL.
Limitação: Documento Mestre atualizado especificamente para a UI 3.0 não localizado; conversa original Black November não revisada integralmente. Inventário abaixo abrange rotas/componentes conhecidos e inspecionados, não uma enumeração automática de todos os caminhos do repositório.

## A. Estado real e contratos existentes

| Domínio | Fonte existente | Contrato confirmado | Intervenção pendente |
| --- | --- | --- | --- |
| Decisão de ideia | `EditorialIdeaDecision.tsx` → `supabase.rpc("rotevo_editorial_idea_decide")` → `public.editorial_idea_approvals` | Cliente autenticado, tenant/módulo/item `idea_pending`, versão, registro de ator e instante | Transição persistida `idea_approved`, emissão transacional, não duplicar |
| Decisão final | `EditorialDecision.tsx` → `supabase.rpc("rotevo_editorial_decide")` → `public.editorial_approvals` | Cliente autorizado, item `awaiting_client`, versão, insert e alteração do `updated_at` do projeto | Transição persistida `approved`, evento e notificações atômicos |
| Conversa | `ProjectConversation.tsx` → `/api/collaboration/messages` → `public.rotevo_collaboration_messages` | GET/POST autorizado pelo servidor, `resource_type=task|content`, autoria, versão e histórico | Mensagem com intenção formal `adjustment_request`, uma única caixa de texto |
| Aprovação de tarefas | `ProjectTimeline.tsx`, `CentralTarefas.tsx` | Tarefas compartilhadas, estados próprios, chat | `requiresApproval` opt-in e decisão versionada que NÃO conclua a tarefa |
| Portal cliente | `ClientOverview.tsx` | Meu Foco parcial e leitura de duas tabelas de aprovações | Pendências unificadas e notificação autorizada |
| Campanhas | `CampaignsHub.tsx` | CRUD de campanhas no JSON do projeto, controle de `visibleToClient` | Integrar aprovação apenas para entrega versionável e explicitamente sujeita a aceite |
| Notificações | Nenhuma tabela `notification%` encontrada em `public` nem componente sino ligado a eventos identificado | Não há serviço transversal confirmado | Persistência por destinatário e evento idempotente, leitura e deep links |
| Controle G2 | `team_members`, `team_project_assignments`, `team_member_permissions`; `rotevo_operations.can_read_project`, `can_read_editorial` | Equipe ativa, admin ou atribuição + `editorial.read`/`projects.read` | Revalidar acesso para cada item e a cada leitura, inclusive após revogação |

### Políticas e RPCs
- `editorial_idea_approvals` e `editorial_approvals`: RLS ligado; leitura autorizada por `rotevo_operations.can_read_editorial(project_id,content_id)`; gravação ocorre via RPC `SECURITY DEFINER` que valida `auth.uid()`, role cliente, projeto, workspace e estado/versão.
- `rotevo_collaboration_messages`: RLS ligado; `SELECT`/`INSERT` apenas ao papel de serviço; a API deve validar acesso do ator em cada operação.
- `can_read_editorial`: cliente só quando módulo habilitado e item com `visibleToClient=true`; para equipe remete a `can_read_project`.
- `can_read_project`: equipe ativa, administrador ou atribuição + `editorial.read`/`projects.read`. Isto **não** autoriza automaticamente aprovar, mencionar ou notificar sobre outros módulos.
- `planning_projects` contém dados e listas em JSON; criar eventos sem payloads sensíveis, sem confiar apenas na visibilidade do frontend.

## B. PR #8 — integração obrigatória, ainda não publicada

PR #8 (`fix/ui3-cross-tab-session-guard-20261112`) altera:
- `src/hooks/useSessionBoundary.ts`
- `src/app/admin/page.tsx`
- `src/app/cliente/page.tsx`
- `src/Components/shared/ProjectConversation.tsx`
- `src/app/api/collaboration/messages/route.ts`
- teste `ui3-session-boundary.test.mjs` e workflow CI.

A solução de notificações deverá utilizar o usuário autenticado **atual**, nunca perfil congelado em outra guia. Se a sessão mudar, limpar o painel e as notificações da conta anterior sem deslogar globalmente a outra guia. Revalidar ator, projeto e item no servidor antes de notificar ou abrir um deep link.

**Regra de integração:** rebase/merge técnico da correção PR #8 para a branch de implementação somente após homologação do PR #8; não fazer merge automático neste Gate.

## C. Matriz de autoridade — desenho de permissão

| Operação | Estrategista autorizado | Equipe | Cliente | Anônimo |
| --- | --- | --- | --- | --- |
| Ler aprovações por projeto | Projetos geridos | Projeto atribuído e permissão adequada | Só projeto/itens liberados | Negar |
| Registrar aprovação de ideia/final | Não em nome do cliente | Não em nome do cliente | Cliente autorizado, versão/status válidos | Negar |
| Criar solicitação de aprovação | Sim | Se tiver escrita específica no módulo e atribuição | Não | Negar |
| Enviar mensagem comum | Itens sob gestão | Atribuição + permissão + item | Item compartilhado em projeto próprio | Negar |
| Solicitar ajuste formal | Se autorizado pelo fluxo | Se autorizado pelo fluxo | Cliente autorizado com entrega aguardando decisão | Negar |
| Aprovar entrega de tarefa | Não em nome do cliente | Não em nome do cliente | Apenas `requiresApproval` e versão vigente | Negar |
| Ler notificação | Apenas destinatário **e acesso atual ao item** | Idem, exigindo G2 ativo | Idem, exigindo tenant+módulo+item | Negar |
| Marcar notificação lida | Apenas destinatário autenticado | Idem | Idem | Negar |
| Navegar deep link | Revalidar projeto/módulo/item | Revalidar atribuição, permissão e módulo | Revalidar cliente, módulo e compartilhamento | Negar |

Confirmação pendente: mecanismo canônico para atribuição do **aprovador cliente** quando houver múltiplos usuários na empresa; nunca inferir permissão apenas do nome de contato ou cargo textual. Verificar `client_users` e política de responsável antes de implementar.

## D. Contrato funcional de estados e operações

| Intenção | Pré-condição | Efeito atomizado | Pós-condição |
| --- | --- | --- | --- |
| Aprovar ideia | `idea_pending`, versão V | Decisão V + transição `idea_approved` + evento único | Produção pode ser iniciada por equipe |
| Pedir ajuste da ideia | `idea_pending`, versão V | Mensagem formal + decisão ajuste + status `changes_requested` + pendência e evento | Aguardando correção; versão não aprovada |
| Enviar versão final | `review`, material/versão vigente | Criar solicitação + estado `awaiting_client` + evento | Cliente pode aprovar |
| Aprovar versão final | `awaiting_client`, versão V | Decisão V + estado `approved` + evento | Não publicar nem agendar automaticamente |
| Solicitar ajuste final | `awaiting_client`, versão V | Mensagem formal + estado `changes_requested` + evento | Nova versão deve retornar a `awaiting_client` |
| Aprovar entrega de tarefa | `requiresApproval=true`, versão V, solicitada | Decisão de aceite + evento | Estado operacional da tarefa inalterado |
| Mensagem comum | Item acessível | Mensagem persistida + evento único | Status/versões imutáveis |
| Ler notificação | Destinatário e acesso atual | `read_at` do destinatário | Pendência operacional permanece |
| Resolver pendência | Ação operacional concluída | Atualizar fonte de estado | Meu Foco deixa de exibir; histórico permanece |

## E. Modelo de dados proposto — não aplicado

Contratos lógicos separados: `approval_requests` (item/versão/aprovador/estado); `approval_decisions` (referência a RPCs atuais e histórico legado); `operational_events` (evento imutável, idempotency key e metadados mínimos); `user_notifications` (event_id, recipient_user_id, read_at, link lógico, `unique(event_id,recipient_user_id)`); `actionable_work` como projeção, não tabela inicialmente. Chat atual receberia `message_kind` e referência opcional ao pedido, se migration aprovada após testes.

Decidir migration apenas depois de mapear chaves e cardinalidade das duas tabelas editoriais; não copiar linhas existentes nem fundir aprovações de ideia e final sem contrato de compatibilidade.

### Consistência e idempotência
1. Confirmar usuário no backend, autorização atual e estado/versão; não confiar em papel passado pelo cliente.
2. Operar sob transação e bloqueio adequado no PostgreSQL. A decisão, a transição e o evento precisam confirmar ou reverter juntos.
3. Identificar evento com chave determinística por `event_type + actor + project + resource + version + request_id` e impor unicidade.
4. Materializar notificações por destinatário sem inserir corpo de conversa privada; deduplicar por `event_id,recipient_id`.
5. Broadcast privado apenas como sinal de invalidar/refazer consulta; banco é fonte da verdade.
6. Resolver replays e cliques simultâneos sem registrar segunda decisão nem segundo evento.

## F. Roteiro de homologação e gates

1. Laboratório G2 com usuários **sintéticos**: estrategista, cliente A, cliente B, equipe ativa atribuída, equipe sem permissão, equipe desativada.
2. Aprovação de ideia, ajuste, nova versão, aprovação final, publicação manual; verificar SQL e interface.
3. Aceite de tarefa opt-in; garantir que `completed` não mude automaticamente.
4. Repetição simultânea/idempotência: 1 decisão, 1 evento e 1 notificação por destinatário.
5. Revogação do acesso após notificação: leitura e deep links negados; nenhum texto sensível reaparece.
6. Realtime privado; sem acesso cross-tenant ou cross-module, sem perda do histórico ao reconectar.
7. Troca de conta entre guias conforme PR #8; cache/estado antigo não visível.
8. Mobile, teclado, foco, estados vazios/erro/loading, e regressão da UI 3.0.
9. Relatar comprovantes e riscos antes de qualquer migração ou promoção em produção.

**Não liberado neste Gate:** criar tabelas hospedadas, alterar RLS, acionar flags, publicar Vercel, utilizar clientes reais nos testes, ou implantar novos fluxos antes de validação.
