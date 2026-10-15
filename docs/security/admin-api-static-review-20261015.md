# ROTEVO | Revisão estática de endpoints administrativos — 2026-10-15

Status: revisão somente leitura de implementação, sem chamadas a APIs reais nem testes de integração. Branch feature/admin-v2-redesign.

## Endpoints examinados
1. src/app/api/admin/create-client-access/route.ts
- Exige Bearer token e verifica usuário por auth.getUser(token).
- Inicializa Supabase service-role exclusivamente no servidor.
- Consulta role do solicitante em profiles e exige strategist.
- Cria usuário com auth.admin.createUser e grava profiles com upsert administrativo.
- Risco de inconsistência: Auth criado, upsert do profile falha; endpoint retorna erro e deixa conta sem perfil.
- Valida apenas presença de email/password/fullName/clientId, sem conferir no trecho examinado a existência e legitimidade do clientId associado ao projeto pretendido.
- Requer teste de autenticação, autorização de role, parâmetros inválidos, clientId inexistente e falha parcial.

2. src/app/api/team/invite/route.ts
- Exige JWT válido e consulta team_members com role=admin e active=true usando service-role.
- Lista de roles permitidos é limitada; não aceita concessão de projeto/cliente no payload.
- Convite é enviado antes do insert na tabela team_members; falha no insert deixa convite com cadastro interno pendente.
- Falha fechada quando dependências de ambiente ou esquema não existem.
- Requer teste de JWT ausente/inválido, client, membro inativo, admin ativo, papel inválido, falha parcial e reenvio idempotente.

## Recomendação de prioridade
A. Criar plano de testes de API isolados com Supabase local e e-mails fictícios (não chamar fluxos de convite para caixas reais).
B. Garantir operação de criação com compensação, reconciliacão e rastreamento de erros.
C. Auditar associação de cliente/projeto no endpoint de acesso.
D. Revisar entrega de credenciais provisórias e geração previsível na UI, separadamente.
E. Só propor alteração funcional após testes e revisão de contrato com interfaces existentes.

## Segurança
A chave de serviço contorna RLS; restringir ao servidor, validar a identidade e autorização antes de qualquer escrita privilegiada. Conferir grants e RLS no ambiente final.
Fontes:
https://supabase.com/docs/guides/auth/users
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/reference/javascript/auth-admin-createuser

Nenhuma migração, alteração de usuários, deployment, merge ou teste remoto nesta revisão.
