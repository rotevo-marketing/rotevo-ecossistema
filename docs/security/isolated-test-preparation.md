# Rotevo — preparação dos testes isolados de autorização

Status: **preparação documental**. Nenhum teste foi executado, nenhuma migration aplicada e nenhum ambiente de produção alterado.
Referência inicial: `9074f744` e `docs/security/team-access-validation.md`.
Escopo: branch `feature/admin-v2-redesign`. Não executar testes com as credenciais ou a URL do Supabase de produção.

## 1. Condições obrigatórias de isolamento
1. Usar Supabase CLI local **sem vínculo remoto**, ou projeto de homologação autorizado em separado.
2. Confirmar que a CLI não está conectada a projeto remoto antes de qualquer comando que aplique migrations. Não executar `db push`, `db reset --linked`, nem comandos remotos equivalentes.
3. Usar apenas esquema e usuários/dados fictícios. Não importar dumps com dados de clientes.
4. Desabilitar/enviesar para captura local todo envio de e-mails; não chamar endpoints de convite contra ambientes com remetente real.
5. Criar variáveis de ambiente locais específicas para teste e conferir que nenhuma chave de serviço de produção está presente.
6. Reconstituir primeiro o **schema base**. Este repositório contém apenas três migrations datadas de 2026-10-15, insuficientes isoladamente para recriar tabelas preexistentes como `profiles`, `clients` e `planning_projects`.
7. Registrar versão da CLI/Postgres, origem do schema de testes e hash/versão das migrations executadas.
8. Interromper em caso de divergência entre estrutura local e estrutura de referência; nunca ajustar a produção para fazer o teste funcionar.

## 2. Inventário mínimo antes da execução
- Tabelas e colunas: `profiles`, `clients`, `client_users`, `planning_projects`; novas tabelas `team_members`, `team_project_assignments`, `team_member_permissions` e `editorial_approvals`.
- RLS ativo por tabela, políticas `USING`/`WITH CHECK`, `GRANT`s de tabela/coluna/sequência, funções `SECURITY DEFINER` e definição de `is_strategist()`.
- Triggers de criação/atualização de perfil; dependências de `profiles.updated_at`, `role`, `client_id` e `email`.
- Rotas e fluxos: `src/app/api/admin/create-client-access/route.ts`, `src/app/api/team/invite/route.ts`, login estrategista/cliente, leitura/gravação do projeto, calendário e aprovações.
- Origem do bootstrap do primeiro administrador e do ciclo `inactive -> active`; nunca depender de permissão da interface como controle final.

## 3. Fatos encontrados no código
- `20261015_harden_profile_authorization.sql`: revoga UPDATE amplo em `profiles` para `anon` e `authenticated`; concede UPDATE apenas de `full_name` a `authenticated`. **Ainda não aplicar**, antes de inventariar os escritores.
- `20261015_team_roles.sql`: cria três tabelas de equipe; políticas SELECT atualmente dependem de `profiles.role='strategist'`. Isso não estabelece uma autorização independente por função da equipe.
- `20261015_editorial_approvals.sql`: decisões imutáveis, unicidade por `project_id/content_id/content_version` e política de INSERT que examina `planning_projects.data.editorialCalendar`.
- Endpoint `/api/team/invite`: exige membro ativo com `team_members.role='admin'`; chama `inviteUserByEmail` **antes** de inserir `team_members(active=false)`. Testar falha parcial e impedir e-mail real.
- Endpoint `/api/admin/create-client-access`: verifica JWT e `profiles.role='strategist'` com service role, cria usuário de cliente e faz upsert do perfil. Testar regressão e transição para modelo administrativo futuro.
- O JSON `planning_projects.data` pode conter informações internas; ocultação por componente não é isolamento de API.

## 4. Massa de teste sintética
Identidades distintas: anônimo; cliente A; cliente B; estrategista legado; administrador ativo; administrador inativo; gestor de projetos; produção atribuída ao projeto A; produção não atribuída; financeiro; convidado inativo. Projetos A e B devem possuir conteúdos públicos e internos diferenciáveis. Nenhuma identidade será baseada em conta real.

## 5. Casos e evidências esperados
| Caso | Tentativa | Resultado esperado |
|---|---|---|
| AUTH-01 | Anônimo lê tabelas protegidas | Negado |
| AUTH-02 | Cliente A lê dados de B | Negado |
| AUTH-03 | Cliente A atualiza `profiles.role` ou `client_id` | Negado, inclusive por REST |
| AUTH-04 | Cliente A atualiza o próprio `full_name` | Permitido; outro perfil negado |
| AUTH-05 | Cliente A acessa campos internos em `planning_projects.data` via API | Negado; bloquear liberação enquanto houver exposição |
| AUTH-06 | Cliente A decide conteúdo visível e aguardando aprovação | Permitido uma vez por versão |
| AUTH-07 | Cliente A aprova conteúdo interno, de B ou repete decisão | Negado |
| AUTH-08 | Produtor atribuído edita tarefa autorizada de A | Permitido somente após política específica |
| AUTH-09 | Produtor acessa B/financeiro | Negado |
| AUTH-10 | Financeiro lê domínio financeiro autorizado | Permitido somente após política específica |
| AUTH-11 | Financeiro altera planejamento sem direito | Negado |
| AUTH-12 | Administrador ativo chama convite | Permitido e auditado, sem e-mail externo no teste |
| AUTH-13 | Não administrador/inativo chama convite | Negado |
| AUTH-14 | Convidado inativo tenta acesso antes da ativação | Negado |
| AUTH-15 | Inserção no cadastro falha após convite | Falha controlada, sem acesso ativo; exigir reconciliação/auditoria |
| AUTH-16 | Criação de acesso de cliente pelo estrategista legado | Regressão funcional documentada |
| AUTH-17 | Tentativas com `service_role` ausente/credenciais inválidas | Falha controlada |
| AUTH-18 | Diretórios, APIs e JSON com dados internos | Não podem ser acessíveis por papel inadequado |

Testar `SELECT`, `INSERT`, `UPDATE`, `DELETE` e acesso por coluna conforme apropriado. Executar requisições com JWTs **não privilegiados** e confirmar resultado no banco; mocks apenas não validam RLS.

## 6. Portões de execução
**P0 — schema reproduzível:** schema base e funções reais disponíveis, sem dados sensíveis.
**P1 — execução segura:** CLI local, URL e chaves locais, envio de e-mail bloqueado.
**P2 — testes vermelhos:** documentar o comportamento atual e as exposições que falham, sem normalizá-las.
**P3 — correções locais:** aplicar propostas revisadas apenas localmente e repetir toda a matriz.
**P4 — regressão:** login, criação de cliente, projeto, edição, publicação e portal continuam funcionais.
**P5 — revisão:** registrar evidência por teste, resultado real, SQL/política utilizada e risco residual.
**P6 — autorização independente:** migrations de produção, usuários reais, merge em `main` e deploy de produção exigem autorização explícita.

## 7. Estado e próxima ação
Até obter uma cópia segura e verificável do schema base, os testes RLS executáveis permanecem **bloqueados**. A próxima atividade técnica é inventariar de forma somente leitura as dependências do schema e preparar o ambiente local. Esta documentação não implica que quaisquer testes passaram.

Governança: alterações autorizadas podem ser commitadas nesta branch; previews agrupados; nunca publicar em `main` ou `app.rotevo.com.br` sem autorização. Preservar identidade visual V2 e Tabler Icons.
