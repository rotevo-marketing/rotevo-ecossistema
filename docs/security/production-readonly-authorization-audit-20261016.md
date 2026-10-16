# Segurança — achado de auditoria de leitura (16/10/2026)

**Status: AÇÃO DE CORREÇÃO REQUER APROVAÇÃO. Nada foi alterado no Supabase hospedado.**

## Evidência observada em consultas sem escrita

- No projeto Supabase `kadvzjelkyfwouqmlxaa` foram encontradas somente as quatro tabelas públicas legadas `profiles`, `clients`, `client_users`, `planning_projects`, com RLS habilitado. As tabelas de equipe propostas ainda não existem.
- O catálogo de políticas `pg_policies` apresentou **16 políticas**, inclusive `Users can update own profile` com `USING (id = auth.uid())` e `WITH CHECK (id = auth.uid())`. Essa política restringe a linha, **não as colunas** que podem ser atualizadas.
- O catálogo `information_schema.role_table_grants` apresentou `UPDATE` em `public.profiles` para `authenticated`. O campo `profiles.role` permite `strategist` ou `client` no esquema observado.
- **Risco crítico a investigar/corrigir**: com os grants de coluna atuais, um cliente autenticado pode em princípio tentar modificar `role` e `client_id` de seu próprio profile. Como as APIs legadas autorizam estrategistas via `profiles.role`, isso constitui um caminho potencial de escalonamento de privilégios. Não foi feito teste de exploração, nem atualização de dados reais.
- A migração proposta `20261015_harden_profile_authorization.sql` já pretendia restringir atualizações às colunas benignas. Precisa de avaliação de compatibilidade antes de aprovação.

## Decisões e contenção

1. **Prioridade alta:** revisar imediatamente código consumidor de atualizações de perfil, funções trigger de signup e procedimento de recuperação. Aplicar bloqueio a `role`, `client_id` e identidade no banco somente após autorização explícita e plano de reversão.
2. Validar as permissões coluna a coluna; grants genéricos UPDATE podem sobrepor grants restritos se não revogados.
3. Revisar outras permissões excessivas em `profiles`: INSERT/DELETE/TRUNCATE para `authenticated` e `anon` existem no catálogo, mas RLS e comportamento de operações ainda devem ser avaliados.
4. Não inferir que `team_members` já pode ser consultada em produção: essas tabelas ainda não existem.
5. Não ativar `ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED`, `ROTEVO_TEAM_INVITES_ENABLED` nem as demais flags até migrar/validar o esquema com dados fictícios em ambiente isolado.
6. Construir casos pgTAP para recusar mudança de função de um usuário autenticado, troca de `client_id` e acesso indevido a projetos.

A presente auditoria consistiu exclusivamente em leitura dos catálogos e metadados, sem escrita/DDL ou alteração de clientes.
