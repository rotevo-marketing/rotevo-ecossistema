# Rotevo UI 3.0 — Decisões de preservação e verificação de acesso (10/11/2026)

**Escopo:** inventário somente leitura do projeto Supabase hospedado; sem dados de autenticação, e-mails, UUIDs ou conteúdo de clientes neste arquivo.

## Decisão do responsável

- Preservar obrigatoriamente o acesso de estrategista utilizado para administrar a Rotevo.
- Não eliminar nenhum dos dois perfis classificados como `strategist` até validar qual é a identidade principal e seu fluxo completo de login.
- Tentar preservar os cinco acessos de clientes vinculados aos cinco clientes/projetos existentes.
- Aceitar eventual perda de contas classificadas como `client` sem vínculo com empresa/projeto, desde que não sejam necessárias a outros fluxos. A autorização **não determina exclusão imediata**.
- Dados de teste são descartáveis, porém a segurança dos dados existentes, contas administrativas, configuração de autenticação e compatibilidade da aplicação permanecem obrigatórias.

## Inventário consultado, sem dados sensíveis

- `auth.users`: 18; `public.profiles`: 18; 2 estrategistas e 16 perfis `client`.
- 5 perfis `client` vinculados a empresas, 11 sem `client_id`; 5 clientes e 5 projetos.
- Nenhum perfil órfão de Auth e nenhum e-mail normalizado duplicado entre contas ativas no momento da consulta.
- 2 estrategistas com e-mail confirmado e login histórico. Um perfil é membro de `team_members` e teve último acesso em 10/11; o outro teve acesso em 14/10. Isso não prova qual identidade pertence ao responsável.
- `client_users` possui zero linhas; nenhum dos 11 perfis sem empresa aparece vinculado a projeto por essa relação específica. Verificar dependências adicionais antes de eliminar contas.
- As seis tabelas consultadas (`client_users`, `client_workspaces`, `clients`, `planning_projects`, `profiles`, `team_members`) possuem RLS habilitado.
- `anon` e `authenticated` continuam com grants de tabela `SELECT/UPDATE` em `planning_projects`; o JSON `data` permanece acessível por privilégio efetivo, de acordo com os testes documentados.
- `rotevo_collaboration_messages` não existe no projeto hospedado.
- Security Advisor sinaliza 3 funções `SECURITY DEFINER` executáveis por `authenticated`: `is_strategist`, `rotevo_editorial_decide`, `rotevo_editorial_idea_decide`. Não revogar indiscriminadamente: verificar uso legítimo e predicados.
- Security Advisor também informa proteção de senhas vazadas desativada e 14 tabelas com RLS habilitado sem políticas (verificar se são tabelas deliberadamente inacessíveis à API, não abrir políticas genéricas).

## Sequência segura, sem autorização implícita de produção

1. Confirmar o login do estrategista via interface com sua sessão autorizada, sem solicitar ou registrar senha.
2. Definir artefato de contingência compatível com grants restritos de `planning_projects.data`, mantendo backup privado e capacidade mínima de recuperação administrativa; descartar testes não exige abrir mão dessa proteção.
3. Validar preflight de todos os grants efetivos, corpos das funções, políticas e comportamento de Auth/PostgREST em ambiente isolado. Preservar os testes já aprovados.
4. Ensaiar operação coordenada SQL + versão de aplicação, garantindo que V2 não permaneça ativa depois da revogação. Verificar resposta em erro e rollback **sem reabrir grants inseguros**.
5. Concluir testes assistivos e de perfil Equipe; congelar SHA, CI e prévia READY no mesmo commit.
6. Somente após gates e aprovação de janela: promover a UI3, executar pós-verificações, validar os cinco tenants e monitorar.
7. Limpar contas de teste apenas após inventário de dependências e preservação de estrategista, Auth, sessões e clientes.

**Estado:** NO-GO para alteração de grants/DDL e publicação; estas decisões alteram o tratamento de dados de teste, não comprovam uma recuperação de banco nem encerram a compatibilidade operacional.

**Operações nesta rodada:** consultas de catálogo e agregações sem alterações de produção.