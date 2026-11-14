# Rotevo UI3 | Liberação controlada de notificações
**Estado em 13/11/2026:** preparado, **NÃO autorizado para produção**. PR #11 permanece draft; a versão atual no domínio oficial não tem as novas funções.

## Escopo protegido
Liberar SOMENTE notificações de mensagens de **conteúdo** e **tarefas** aos usuários expressamente autorizados, em uma janela de piloto. Não habilitar novas aprovações, não fazer migração do fluxo editorial novo, não abrir automaticamente outros módulos e não tratar o release da UI3 inteira como aceito.

## Gates obrigatórios, todos com evidências
- [ ] **Backup do Supabase de produção comprovado:** registrar data, integridade, tabelas e Storage; confirmar política do plano e retenção. O histórico de backup do Dashboard não foi validado por este agente.
- [ ] **Restauração isolada comprovada:** restaurar artefato privado em ambiente apropriado, verificar contagens, RLS, funções e anexos, mantendo dados reais fora de logs e fora do acesso não autorizado. O teste anterior de restauração permanece inconclusivo.
- [ ] **Compatibilidade e risco SQL:** revisar esquema atual de produção, dependências, privilégios e gatilhos de rate limit; preparar plano idempotente, transação quando possível e reversão SQL separada do rollback Vercel.
- [ ] **Piloto por UUIDs autorizados:** lista mínima de contas explicitamente aprovadas pelo proprietário, sem usar e-mails/senhas no código. Autorizar nas **duas camadas**: `ROTEVO_NOTIFICATIONS_PILOT_USER_IDS` (server Vercel) e `rotevo_workflow.notification_pilot_users` (Postgres). Ambas são *deny by default*.
- [ ] **Flags de produção:** `ROTEVO_NOTIFICATIONS_ENABLED=true` e `NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED=true` só na janela de piloto; `ROTEVO_WORKFLOW_APPROVALS_ENABLED=false` e `NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED=false`; manter política de colaboração previamente aprovada. Variáveis `NEXT_PUBLIC_` exigem novo build.
- [ ] **E2E autenticado, Preview do HEAD:** múltiplas sessões/abas, mensagens cliente↔equipe, visibilidade revogada, G2 ativo/inativo, links para tarefas e conteúdos, navegação móvel, ausência de vazamento de tenants, notificações de conta não autorizada.
- [ ] **Consentimento de implantação:** aprovação específica do proprietário para **cada migração em produção** e para **deployment de produção** em `app.rotevo.com.br`.

## Dependências SQL do piloto de notificações apenas
**Não executar automaticamente na produção.** O laboratório já validou os contratos em migrações separadas. Preparar uma migração de release única, revisada, a partir destes **arquivos de proposta**, nesta ordem:
1. `ui3-gate-b-workflow-PROPOSAL-ONLY.sql`: esquema privado e quatro tabelas. O arquivo originalmente declara explicitamente PROPOSAL ONLY e contém `BEGIN/COMMIT`.
2. `ui3-content-message-event-PROPOSAL-ONLY.sql`: trigger atômico de `message_sent` na tabela existente de mensagens para conteúdo/tarefas. Preservar rate limit e não colocar texto da mensagem em evento.
3. `ui3-notifications-read-PROPOSAL-ONLY.sql`: leituras e marcação de notificações dependentes de identidade e G2 atuais.
4. `ui3-notification-pilot-db-guard-PROPOSAL-ONLY.sql`: cadastro privado de usuários piloto e bloqueio na função de visibilidade mesmo para chamadas REST RPC diretas.
Os demais scripts de decisões editoriais (workflow request/decide e ajustes) NÃO fazem parte deste primeiro piloto. O release precisa ser homologado e consistente com a versão atual do backend; caso contrário, **NO-GO**.

## Falha / interrupção do piloto
1. Desabilitar `ROTEVO_NOTIFICATIONS_ENABLED` na configuração de produção e retirar usuários da allowlist/DB quando aplicável. **ATENÇÃO:** variáveis alteradas na Vercel não impactam builds já publicados até nova implantação; portanto, NÃO tratar essa ação isolada como kill-switch instantâneo.
2. Para corte imediato do acesso aos dados, desabilitar os vínculos de piloto no banco por operação autorizada com auditoria, sem mexer em clientes/projetos.
3. Analisar logs de erro sem copiar dados pessoais; não executar inversão de DDL com mensagens/eventos recebidos após o piloto sem avaliar perda e integridade.
4. O rollback de deployment reverte código publicado, não substitui recuperação de banco.

## Evidências disponíveis
- PR #11: consolidação da UI3 em branch isolada.
- CI em GitHub Actions: suites de PostgreSQL sintético, autenticação negativa, TypeScript/build.
- Teste de banco em `rotevo-ui3-homologacao`: `STAGING_DB_PILOT_ALLOWLIST_REVOCATION_ROLLBACK_PASS`, sem registros sintéticos persistidos.
- Bloqueios ainda externos: cota de deployments Vercel e backup/restauração da produção não confirmados.

**Critério de liberação:** todos os gates checados com evidência, Preview do commit consolidado testada, risco aprovado e liberação explícita do proprietário.
