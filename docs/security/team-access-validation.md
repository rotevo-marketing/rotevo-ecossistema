# Rotevo — validação isolada de permissões (pendente)

Status: **não executar em produção**. Auditoria de leitura realizada em 15/10/2026.

## Ambiente
- Supabase de produção: `kadvzjelkyfwouqmlxaa`.
- O projeto **não possui branch isolada** no momento da consulta.
- Nenhuma migração desta fase foi aplicada. Nenhum convite foi enviado.
- Desenvolver os testes em ambiente local isolado com Supabase CLI ou em projeto de homologação explicitamente autorizado. Não usar dados reais de clientes.

## Achados confirmados por leitura de pg_policies
1. `profiles` permite `UPDATE` do próprio registro sob `id = auth.uid()`, sem restrição de coluna por RLS. Verificar os grants efetivos antes de concluir explorabilidade.
2. `profiles` possui política `Strategists can manage profiles` para `ALL`, vinculada à função `is_strategist()`.
3. `planning_projects` possui políticas amplas `Strategists can manage planning projects` e políticas de leitura por cliente. Não usar essas políticas para colaboradores com privilégios limitados.
4. `planning_projects.data` agrega informações estratégicas, conteúdo interno, execução e onboarding: **filtrar propriedades no front-end não equivale a isolamento de dados**.
5. `client_users` e `clients` também têm políticas para `is_strategist()`; revisar antes de atribuir novas funções.
6. Migração de `team_members`, `team_project_assignments`, `team_member_permissions` e convites são apenas código preparado, não instalado.

## Cenários obrigatórios
| Identidade | Operação | Esperado |
|---|---|---|
| Anônimo | Ler perfis, equipe, projetos ou decisões | Negado |
| Cliente A | Ler cliente/projeto B | Negado |
| Cliente A | Atualizar `profiles.role` e `profiles.client_id` | Negado |
| Cliente A | Editar `profiles.full_name` | Permitido só em seu registro |
| Cliente A | Ler conteúdos/onboarding internos do projeto A via API | Negado (exige separar dados ou API de leitura controlada) |
| Cliente A | Aprovar conteúdo próprio visível, versão solicitada | Permitido uma única vez |
| Cliente A | Aprovar conteúdo interno ou de outro cliente | Negado |
| Produção atribuído ao projeto A | Atualizar tarefa autorizada do projeto A | Permitido após política específica |
| Produção atribuído ao projeto A | Ler projeto B ou Financeiro | Negado |
| Financeiro | Consultar dados financeiros autorizados | Permitido após política específica |
| Financeiro | Editar método/planejamento estratégico sem permissão | Negado |
| Administrador ativo | Enviar convite de colaborador | Permitido e auditado |
| Usuário não administrador | Chamar endpoint de convites | Negado |
| Convite recém enviado | Acessar operação antes de ativação | Negado |

## Portões para ativação
1. Inventariar todos os fluxos de escrita em `profiles` e serviços dependentes; não aplicar a migração `20261015_harden_profile_authorization.sql` sem testes.
2. Separar papéis administrativos de `profiles.role` e documentar bootstrap do primeiro administrador.
3. Implementar política de acesso às tabelas efetivamente usadas pela plataforma; autorização não pode depender de esconder menu.
4. Remover material interno do JSON acessível via `planning_projects` ao cliente, usando tabelas/visões/APIs adequadas.
5. Garantir que convites não enviem e-mail real em ambiente de teste e que a ativação fique controlada.
6. Executar testes de RLS/GRANT e regressão de login, criação de projeto, publicação e portal.
7. Compilar e validar preview antes de autorizar alterações no banco de produção.

## Observações
- A documentação oficial do Supabase recomenda testar migrações e segurança localmente e ressalta a distinção entre RLS por linha e privilégios por coluna.
- Não considerar o fluxo validado até que todos os testes tenham resultados registrados.
