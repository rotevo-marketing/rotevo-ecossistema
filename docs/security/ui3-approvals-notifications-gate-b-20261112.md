# Gate B — contratos de aprovação, eventos e notificações (PROPOSTA)
Data: 12/11/2026. Base: Gate A do PR #9. Estado: somente especificação, SQL **NÃO APLICADO**.

## Migração candidata
Arquivo `docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql` propõe esquema privado `rotevo_workflow` com `approval_requests`, `approval_decisions`, `operational_events` e `user_notifications`. **Não adicionar à pasta `supabase/migrations` antes de autorização e testes.**

### Dependências verificadas
- Editorial: uma decisão por `(project_id, content_id, content_version)` em cada uma das tabelas `editorial_idea_approvals` e `editorial_approvals`; preservar essas constraints e consultas existentes.
- Cliente: `client_users` relaciona `client_id` e `user_id`, mas **não contém indicação explícita de aprovador principal**. Não tratar contato empresarial como aprovador universal.
- G2: `team_members.active`, `team_project_assignments`, `team_member_permissions` e `rotevo_operations.can_read_project/can_read_editorial`.
- Conversa: `rotevo_collaboration_messages` possui `id` UUID e `content_version` apenas para conteúdo. `message_kind` fica para migration separada, após desenhar o envio atômico.
- PR #8 (sessão entre guias) ainda separado; sua integração é pré-requisito de interface/identidade.

### Decisões conservadoras para compatibilidade
1. Não migrar nem copiar decisões editoriais históricas para `approval_decisions` agora. O serviço novo deverá consultar legado + novos registros com projeção explícita, evitando duplicidade.
2. O `approval_request` deve ter `request_key` idempotente, `phase`, versão e condição de uma solicitação pendente por item+fase+versão.
3. `approval_decisions` usa unicidade por `request_id`, e ajustes referenciam mensagem registrada, não texto paralelo.
4. `operational_events` é outbox durável com chave única; `user_notifications` é deduplicada por destinatário/evento. Não persistir texto da mensagem em `metadata`.
5. `read_at` altera somente leitura do alerta. A resolução de `Meu Foco` depende da fonte de estado.
6. A versão final aprovada permanece `approved`; **não** transforma automaticamente em `published`. Aceite de tarefa não muda o estado operacional.
7. Módulos documentos e campanhas só geram aprovações quando um artefato versionado e a autorização correspondente forem comprovados.
8. Novas tabelas ficam em esquema privado, sem acesso para `anon`/`authenticated` até projeto específico de API/RPC com verificação de acesso a cada item.

## Fluxo transacional planejado (ainda NÃO codificado)
1. Autenticar JWT e validar conta atual, não apenas cookie/localStorage. Verificar role, tenant, módulo, visibilidade, G2 e versão.
2. Serializar operações concorrentes por projeto + recurso (row lock ou mutex transacional). Falha de versão causa rejeição sem efeitos.
3. Inserir pedido/decisão, atualizar situação editorial no JSON e registrar evento **na mesma transação**. Idempotency key evita replays.
4. Materializar notificações para destinatários derivados de IDs e permissões atuais, excluindo autor, sem inventar destinatários por texto.
5. Fazer broadcast privado apenas após commit; clientes refazem GET seguro, sem payload sensível.
6. Ao remover atribuição/permissão, GET do alerta e deep link negam acesso mesmo para notificações previamente emitidas.

## G2 e aprovação em empresas com múltiplos usuários
**Ponto pendente de definição funcional:** todos os membros cliente podem aprovar ou somente os aprovadores formalmente designados? A estrutura `client_users` atual não distingue essas funções. Proposta provisória: manter o comportamento legado de aprovação para o perfil cliente conforme RPC atual, e não expandir automaticamente poder de decisão. Antes de liberar múltiplos usuários, definir delegação explícita e teste de substituição/revogação.

## Plano de testes de aceitação
- DDL isolado: tabelas RLS habilitadas, `anon`/`authenticated` sem grants, constraints, índices e FKs válidas.
- Tenant A/B: nenhuma notificação de A é legível por B; IDs de projeto/versão externos rejeitados.
- Equipe G2: ativo/atribuído/com permissão recebe; removido, desativado ou sem módulo não vê; strategist não aprova no lugar do cliente.
- Editorial: ideia aprovada/ajuste, final aprovada/ajuste, nova versão, retry simultâneo; contagem exata de decisão, evento e notificação.
- Chat: mensagem comum ≠ ajuste formal; ajuste formal sempre aponta para mensagem persistida, com autoria/versão válidas.
- UX: sino, badge, marcar lida, foco, deep link, responsivo e a11y; não criar duplicação de interface.
- PR #8: troca de identidade bloqueia listagem prévia e envio em outra conta; não mistura notificações.
- Realtime: tópico privado, refresh/reconnect e revogação de sessão, conforme documentação vigente.

## Limites atuais
Este Gate **não** executou SQL; não criou usuários, apps ou funções, não acionou deploy, não adicionou rotas e não atestou homologação de ponta a ponta. O SQL é deliberadamente sem políticas, grants ou APIs. Para tornar funcional, precisamos implementar as operações autorizadas e testá-las com dados sintéticos antes de qualquer release.
