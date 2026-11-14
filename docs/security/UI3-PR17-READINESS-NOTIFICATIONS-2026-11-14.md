# Rotevo UI 3.0 — PR #17 | Auditoria de prontidão das notificações
**Data:** 14/11/2026  
**Escopo:** auditoria read-only dos dois bancos e preparação de migração aditiva exclusiva de homologação; nenhum dado real ou objeto de produção alterado.  
**Status de liberação:** **NO-GO para produção** até autorização específica da migração/flags/deployment.  
**PR:** https://github.com/rotevo-marketing/rotevo-ecossistema/pull/17  
**Última bateria autenticada aprovada:** https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/43635948501 (11/11 SUCCESS, laboratório descartável; não é validação do banco hospedado).

## 1. Fontes e evidência (consultas somente leitura)
Inspeção via catálogos `pg_class`, `pg_proc`, `pg_trigger`, `pg_get_function_result` em dois projetos Supabase conectados. Até esta revisão, nenhum DDL ou DML hospedado executado.

| Objeto / capacidade | Produção: Rotevo (`kadvzjelkyfwouqmlxaa`) | Homologação (`tqedxahsqbskninjenfg`) |
|---|---|---|
| `rotevo_workflow.operational_events` | existe | existe |
| `rotevo_workflow.user_notifications` | existe | existe |
| `rotevo_workflow.client_action_assignments` | existe | **ausente** |
| `rotevo_workflow.client_action_submissions` | existe | **ausente** |
| Triggers `ui3_client_action_assignment_notice`, `_submission_notice`, `_review_notice` | existem | **ausentes** |
| Função privada `rotevo_workflow.can_view_event(uuid,uuid)` | **ausente** | existe, regra anterior |
| Tabela privada `rotevo_workflow.notification_pilot_users` | **ausente** | existe |
| RPC `public.rotevo_workflow_list_notifications(integer,boolean)` | **ausente** | existe (10 colunas) |
| RPC `public.rotevo_workflow_mark_notification_read(uuid)` | **ausente** | existe |

Conclusão: os bancos têm configurações parciais e diferentes. A instalação de `ui3-notifications-read-pilot-PROPOSAL-ONLY.sql` **não** deve ser executada sem avaliação de compatibilidade por ambiente.

## 2. Código implementado exclusivamente no PR #17
- `docs/security/sql/ui3-notifications-read-pilot-PROPOSAL-ONLY.sql`: autorização de leitura pela própria identidade `auth.uid()`, receptor do alerta, vínculo de cliente/projeto, visibilidade atual e G2; piloto **desativado por padrão** na tabela privada; RPCs para listar e marcar como lida; coluna `action_id` para distinguir notificação de atribuição.
- `src/Components/shared/WorkflowNotificationBell.tsx` e entradas dos dois portais: eventos com `action_id` navegam para a área de atribuições, sem abrir o cronograma completo; alertas editoriais/tarefas sem atribuição seguem rotas originais.
- `scripts/security/ui3-operational-local-install.sh`: aplicação **somente** ao PostgreSQL descartável de loopback; execução hospedada não autorizada.
- `scripts/security/ui3-portal-browser-local.mjs`: cliente designado e outra conta do mesmo cliente, marcação como lida, revogação do piloto, submissão Drive e notificação da equipe; cenário autenticado release e contingência passou na execução indicada.

### Testes demonstrados no laboratório
1. Atribuição de conteúdo e de tarefa privada: alertas apenas para o cliente destinatário, inclusive sem compartilhar `execution`.
2. Segunda conta do mesmo cliente: sem alerta, sem permissão de marcar a notificação alheia.
3. Marcar como lida diminui a contagem de não lidas sem apagar o evento.
4. Revogação do piloto oculta imediatamente as notificações.
5. Entrega Drive: alerta privado de revisão ao responsável interno; sem duplicação; entrega persiste após refresh.
6. API fechada quando a flag de notificações está desabilitada.
**Limite:** não se trata de teste do binário publicado com flags habilitadas contra um banco hospedado.

## 3. Reconciliação sem destruir RPCs anteriores
Na homologação, `public.rotevo_workflow_list_notifications(integer,boolean)` retorna 10 campos; o novo `action_id` exige 11. O PostgreSQL não permite alterar a assinatura de retorno por `CREATE OR REPLACE`. **A solução adotada é aditiva, sem DROP:** a nova API chama `public.rotevo_workflow_list_notifications_v2`, a leitura de recibos chama `public.rotevo_workflow_mark_notification_read_v2` e o helper privado se chama `rotevo_workflow.can_view_event_v2`. Todas as funções existentes permanecem preservadas.

### Evidência adicional de homologação (read-only)
- O banco de homologação possui **zero eventos e zero notificações** antes da intervenção, duas entradas de projetos e uma conta Auth.
- Existe **uma conta de piloto habilitada**; preservar integralmente esse registro, inclusive seu status de habilitação. Não converter, apagar ou usar como usuário de teste.
- A RPC original possui grants para `authenticated`, `service_role` e `postgres` e retorna dez campos.
- A consulta de dependências SQL de views/funções não identificou dependentes declarados, mas consumidores HTTP de PostgREST não aparecem em `pg_depend`.

### Migração separada, exclusivamente para homologação
Arquivo de proposta: `docs/security/sql/ui3-homologation-notification-v2-MIGRATION-REVIEW.sql`. Contém guarda transacional que **aborta** se as tabelas de atribuições ou RPC v2 já existirem, ou se eventos/notificações estiverem preenchidos. Adiciona tabelas privadas de atribuições/entregas, funções de emissão e gatilhos, além das RPCs v2 e seu helper. **Não modifica as RPCs v1** nem os registros de `notification_pilot_users`.

**Sequência de controle:**
1. Verificar novamente o catálogo, estado das tabelas, grants, triggers, migrações e dependências imediatamente antes da aplicação.
2. Confirmar backup/snapshot de homologação e autorização delimitada a esse banco; interromper se houver divergência.
3. Aplicar apenas a migração aditiva em transação; checar contagem de objetos, RLS, privilégios e compatibilidade das RPCs v1/v2.
4. Criar contas e dados **sintéticos** explicitamente delimitados para testes de autenticação/G2. Sem utilizar o usuário do piloto preexistente nem clientes reais.
5. Testar consulta, marcação como lida, revogação, destinatário e isolamentos; preservar a flag do servidor desligada.
6. Para produção: preparar migração própria, backup e plano de reversão com novo aceite; não reutilizar a migração de homologação em produção.

**Até a verificação de segurança e a liberação específica, NO-GO para ativação de notificações em produção.**

## 4. Segurança e aceitação
- `SECURITY DEFINER` não equivale a acesso livre: a RPC pública deve exigir `auth.uid()`; helper privado sem `EXECUTE` para `anon`/`authenticated`; nenhuma leitura direta das tabelas de workflow; `search_path` fechado e objetos qualificados.
- Confirmação de `app_metadata` para reset de senha; jamais confiar em `user_metadata` para autorização.
- Revogação de permissões G2, vínculo de cliente, compartilhamento do item, arquivamento/exclusão, fase/versão e status de atribuição devem impedir acesso em leituras subsequentes.
- O endpoint Next.js deve permanecer **deny-by-default** com `ROTEVO_NOTIFICATIONS_ENABLED` e `ROTEVO_NOTIFICATIONS_PILOT_USER_IDS`, além da autorização da RPC.
- Não ativar toda a colaboração ou o módulo `execution` para resolver a atribuição pessoal.
- Testar se outros eventos (mensagens e aprovações) mantêm semântica e não vazam notificações.
- Confirmar que a UI mantém a experiência aprovada Claro/Escuro, os quatro quadros e o sino no cabeçalho.

## 5. Estratégia de reversão
**Antes de qualquer migração:** capturar definições `pg_get_functiondef`, ACL/grants, triggers, políticas RLS, versão do deploy e snapshot do banco.

**Se a camada de notificações falhar após autorização e implantação futura:**
1. Desativar a flag server-side do piloto e impedir novos acessos; se necessário, neutralizar imediatamente o allowlist. Atenção: mudanças `NEXT_PUBLIC_` exigem nova build/deploy para refletir no navegador; o backend server flag é o bloqueio efetivo.
2. Impedir merge/deploy adicionais e verificar saúde de ações, projetos, autenticação e entregas. Não apagar eventos reais para “limpar” o teste.
3. Restaurar **somente objetos novos ou alterados**, segundo o backup e o plano de migração específicos do ambiente; não executar `DROP ... CASCADE`, não derrubar `operational_events`, `user_notifications` ou atribuições reais.
4. Reexecutar verificações read-only de ACL, assinatura, RLS, triggers e estabilidade da API; documentar evidências antes de reativar qualquer flag.

## 6. Gate de saída
- [x] Modificações visuais do PR aceitas pelo responsável.
- [x] CI isolado de UI e notificações, release e contingência, 11/11.
- [x] Divergência estrutural entre os dois Supabase levantada por consultas read-only.
- [x] Proposta SQL e navegação por `action_id` implementadas em branch, não nos bancos hospedados.
- [x] Proposta de migração aditiva de homologação preparada, preservando assinatura v1 e piloto existente.
- [ ] Migração de homologação executada com resultado verificável e sem alteração de usuários existentes.
- [ ] Ambiente hospedado autorizado e reconciliado com a proposta, com testes de piloto/G2.
- [ ] Usuários autorizados do piloto e flags aprovados.
- [ ] Auditoria final de release e autorização específica de merge/deployment.

**Restrição permanente desta etapa:** não houve merge em `main`, Vercel Preview/Production deployment, DDL/DML hospedado ou alteração dos dados reais dos clientes.
