# Rotevo — evidências e revisão de regressões (15/10/2026)

Relatório de inspeção. Ambiente de laboratório local, sem execução de testes em produção.

## Testes manuais observados por capturas
- PostgreSQL local: quatro tabelas, dezesseis políticas RLS.
- Perfil fictício com função client.
- Antes do ajuste: tentativa de atualização de role retornou strategist dentro de transação; consulta após ROLLBACK mostrou client.
- Ajuste local: revogação de UPDATE de tabela para anon/authenticated; concessão de UPDATE(full_name) para authenticated.
- Conferência de privilégios: full_name=true, role=false, client_id=false, email=false.
- Reteste de role: PostgreSQL 42501, operação negada.
- Reteste de full_name: atualização permitida, role permaneceu client, transação encerrada com ROLLBACK.
- São resultados manuais e não equivalem a testes automatizados ou validação da aplicação integrada.

## Regressões revisadas estaticamente
- src/app/api/admin/create-client-access/route.ts: exige JWT e função strategist, utiliza service role no servidor ao criar usuário Auth e escrever profiles. Correção de UPDATE para authenticated parece compatível, mas faltam testes integrados. Em erro após criação no Auth, a identidade pode ficar sem profile.
- src/app/api/team/invite/route.ts: exige team_members admin e active; exige configuração de banco correspondente, não deve enviar mensagens reais durante teste.
- src/app/admin/planejamentos/[clientSlug]/acesso/page.tsx: interface gera senha provisória a partir de nome e ano, padrão previsível que precisa de plano próprio de remediação.

## Pendências
1. Automatizar RLS com identidades fictícias, pgTAP e testes de API.
2. Confirmar isolamento entre clientes e a exposição de planning_projects.data.
3. Testar cadastro administrativo em laboratório, incluindo falha parcial.
4. Revisar grants herdados, funções privilegiadas e atualizações de perfis realizadas por outros fluxos.
5. Não aplicar migrações remotas, modificar usuários reais, fazer deploy ou merge em main.

Fontes oficiais: https://supabase.com/docs/guides/local-development/testing/overview e https://supabase.com/docs/guides/database/postgres/column-level-security
