# Rotevo UI 3.0 — PR #17 | Auditoria de prontidão das notificações
**Data:** 14/11/2026  
**Escopo:** auditoria read-only dos dois bancos; migração aditiva de homologação executada e validada; nenhum objeto de produção alterado.  
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

## 3.1. Reconciliação da homologação executada e verificada (14/11/2026)
**Alvo exclusivo:** projeto Supabase `tqedxahsqbskninjenfg`, nome `rotevo-ui3-homologacao`. Migração registrada como `20261114202706_ui3_homologation_private_actions_notification_v2` pelo Supabase.

**Resultado:** execução bem-sucedida. Verificação posterior dos catálogos confirmou `client_action_assignments`, `client_action_submissions`, os três gatilhos de eventos e as novas RPCs `rotevo_workflow_list_notifications_v2` (11 campos), `rotevo_workflow_mark_notification_read_v2`, `can_view_event_v2`. As RPCs originais v1 e seu helper permanecem preservados.

**Preservação de dados:** após a migração, zero eventos, notificações, atribuições ou entregas registrados; continua **uma** conta previamente habilitada na tabela de piloto, inalterada. Nenhum cliente real foi usado em testes ou mutado.

**Segurança:** `anon` não tem `EXECUTE` em listagem v2; `authenticated` pode executar somente a RPC pública, cujo corpo verifica `auth.uid()`, destinatário e acesso atual; `anon` e `authenticated` não podem executar o helper `can_view_event_v2` diretamente. RLS está ativado nas tabelas privadas de atribuição e entrega, sem políticas diretas. O Security Advisor apresentou o aviso esperado de `SECURITY DEFINER` executável por usuários autenticados nas RPCs públicas, exigindo validação contínua da autorização por identidade e destinatário antes de ativar o piloto.

**Ainda não concluído:** teste ponta a ponta **hospedado** com duas contas de teste autorizadas, configuração controlada de piloto, verificação das flags e qualquer migração/publicação de produção. CI e testes do laboratório descartável não substituem esse aceite.


## 3.2. Pré-homologação hospedada e corte de produção (14/11/2026)

### Teste de negação na homologação hospedada, sem alteração de dados
Foi usada uma transação explicitamente revertida com a role `authenticated` e JWT simulado para um UUID sintético sem cadastro. A RPC `public.rotevo_workflow_list_notifications_v2(30,false)` retornou **0 notificações**, e `auth.uid()` apontou o UUID simulado. Nenhuma conta Auth ou notificação foi criada.

**Limitação importante:** essa verificação negativa não substitui um E2E positivo hospedado, com login Auth real, contas sintéticas autorizadas, atribuição, entrega, destinatário e marcação como lida. O banco hospedado de homologação possui uma única conta Auth preexistente, que será preservada e não utilizada como fixture.

### Auditoria Vercel READ-ONLY
Projeto: `rotevo-ecossistema` (`prj_tWUAryuFidBJhhPPwlW3J8rSt6xH`). Inventário feito listando nomes e escopos de variáveis, **sem descriptografar segredos**.

| Variável / grupo | Situação constatada |
|---|---|
| `ROTEVO_CLIENT_ACTIONS_ENABLED` | Presente apenas em Production |
| `NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED` | **Ausente** |
| `ROTEVO_APPEARANCE_ENABLED` e `NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED` | **Ausentes** |
| `ROTEVO_NOTIFICATIONS_ENABLED` e `NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED` | Somente branch Preview antiga; **ausentes em Production** |
| `ROTEVO_NOTIFICATIONS_PILOT_USER_IDS` | Somente branch Preview antiga; **ausente em Production** |
| `ROTEVO_WORKFLOW_APPROVALS_ENABLED` e `NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED` | Presentes em Production, sem validar valores |
| `ROTEVO_PR17_COLLABORATION_RELEASE_MODE` | **Ausente** |

Não alterar essas variáveis antes da revisão de destinatários e da autorização de release. Valores `NEXT_PUBLIC_` são incorporados no build e exigem build/deployment novo para mudar a UI. O gate do release `scripts/security/ui3-pr17-release-env-check.mjs` exige consistência e piloto não vazio, sem imprimir identificadores.

### Produção: proposta exclusivamente documental
Arquivo: `docs/security/sql/ui3-production-notification-v2-PROPOSAL-ONLY.sql`. Guardas verificam os pré-requisitos existentes do banco de produção, os três triggers originais e a ausência das RPCs `v2`. A migração criaria apenas o controle privado do piloto e as RPCs `v2`, **sem refazer as atribuições/gatilhos existentes**. É aditiva e não altera os valores de clientes, eventos nem as flags.

**Não executada.** Antes de qualquer aplicação em produção, verificar backup atual e restaurabilidade, assinatura dos objetos, privacidade dos dados, autorização formal do proprietário e procedimentos de rollback, de acordo com a documentação do Supabase. Ver https://supabase.com/docs/guides/platform/backups e https://supabase.com/docs/guides/database/functions.

## 3.3. Verificações hospedadas adicionais após o CI concluído (14/11/2026)

- A execução final do commit `a871aac26bbc0e29440a9d2f7b7aef6f95b11490` terminou em **11/11 SUCCESS**: https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/43638420817.
- Duas consultas adicionais foram executadas **somente na homologação hospedada**, cada uma em transação revertida: (1) role `authenticated` e JWT sintético sem usuário cadastrado: a listagem v2 retornou **0** e o `mark_notification_read_v2` para ID alheio retornou **false**; (2) role `anon`: a chamada à listagem v2 foi negada pelo banco.
- Nenhuma conta de autenticação, evento ou notificação foi criada; os testes positivos hospedados de login real seguem pendentes.
- Método autorizado para gerar contas reais de ensaio: **Supabase Auth Admin `createUser` apenas do lado do servidor, com credenciais de serviço protegidas**, criação delimitada no projeto de homologação, com registro e posterior limpeza controlada. Não inserir linhas diretamente em `auth.users` ou manipular dados da única conta piloto existente. Referência: https://supabase.com/docs/reference/javascript/auth-admin-createuser.
- `SECURITY DEFINER` das RPCs v2 permanece com `search_path` fechado, grants mínimos e checagem de identidade/destinatário; recomendações oficiais em https://supabase.com/docs/guides/database/functions.
- As variáveis `NEXT_PUBLIC_` precisam estar definidas **antes do build final**; atualizações posteriores de variáveis não modificam deployments existentes: https://vercel.com/docs/environment-variables.

**Conclusão:** testes locais e negativas hospedadas aprovados; **não** afirmar aprovação de E2E positivo hospedado, nem que backups atuais de produção foram restaurados/validados. Produção permanece NO-GO.

## 3.4. Inventário de recuperação de produção, somente leitura (14/11/2026)

**Banco Rotevo produção `kadvzjelkyfwouqmlxaa`**, consultado apenas com agregações em catálogos e tabelas de metadados: **3 buckets de Storage, 50 objetos de Storage, 18 contas Auth, 5 projetos de planejamento, 32 tabelas nos schemas principais e 23 funções nos schemas públicos/operacionais**. Homologação `tqedxahsqbskninjenfg`: **1 bucket, 0 objetos, 1 conta Auth, 2 projetos, 32 tabelas e 22 funções**. Os totais são uma fotografia da consulta e podem mudar; não são indicadores de integridade ou equivalência entre projetos. Não foram lidos arquivos nem dados pessoais.

**Consequência operacional:** o backup do PostgreSQL não inclui os bytes dos objetos do Storage; o clone/restauração do banco sozinho tampouco restaura as configurações externas e arquivos do Storage. Documentação atual:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/deployment/going-into-prod

**Checklist obrigatório antes de qualquer migração de produção:**
1. Determinar, sem presumir a assinatura do plano, se o projeto de produção tem backups diários/PITR disponíveis; registrar hora do último ponto e janela de retenção. Projetos Free não têm backup automático do Supabase.
2. Produzir/verificar backup atualizado, protegido e com checksum, e executar **restauração de teste fora da produção**. Um backup listado ou exportado sem restore ensaiado não fecha o gate.
3. Inventariar os 3 buckets e confirmar cópia íntegra dos **50 objetos atuais** ou quantidade atualizada na hora do cutover, com controles de acesso e integridade. Não copiar dados reais a um ambiente de teste aberto ou vincular dados reais à homologação sem aprovação separada.
4. Conferir Auth, roles, grants, RLS, migrações, funções, triggers, Edge Functions, segredos e integrações externas; um clone de banco não restaura automaticamente as configurações do serviço.
5. Registrar snapshots antes/depois, hash da versão do código, janela e responsável por rollback, e validar o protocolo de resposta a falha e restauração de Storage.
6. Não executar operação de restore no projeto produtivo para ensaiar recuperação; usar destino isolado autorizado e considerar custos/plano.

**Estado desta etapa:** inventário e plano conferidos, mas a existência de backup recente e seu **teste de restauração continuam não comprovados**. Não autorizar migração/merge/deployment com esse gate aberto.

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
- [x] Migração de homologação executada com resultado verificável e sem alteração de usuários existentes.
- [x] Ambiente hospedado de homologação reconciliado e teste negativo com identidade sintética sem registros aprovado.
- [ ] Testes positivos autenticados de piloto/G2 com usuários sintéticos em homologação hospedada.
- [x] Nomes e escopos das flags Vercel inventariados, sem revelar valores sensíveis.
- [ ] Usuários autorizados do piloto e flags de Production aprovados e configurados.
- [x] Inventário de produção read-only de banco, Auth, projetos e objetos de Storage documentado.
- [ ] Backup atual + Storage recuperável + ensaio de restauração isolado comprovados.
- [ ] Auditoria final de release e autorização específica de merge/deployment.

**Restrição permanente desta etapa:** não houve merge em `main`, Vercel Preview/Production deployment, DDL/DML **no banco de produção** ou alteração de dados reais de clientes. A migração aditiva registrada na seção 3.1 foi aplicada **somente ao Supabase hospedado de homologação**, com verificação posterior.
