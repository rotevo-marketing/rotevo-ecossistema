# Matriz de homologação da autorização — ROTEVO 2027

**Somente planejamento de testes. Não executar SQL ou alterar contas em produção.**

## Revisão da estrutura existente

- `20261015_team_roles.sql` é proposta, não migração homologada. Define `team_members`, `team_project_assignments` e `team_member_permissions`; concede SELECT a `authenticated` condicionado a perfil legado `strategist`.
- A tabela de permissões **não** aplica automaticamente o controle às rotas antigas nem substitui RLS de `planning_projects`.
- `20261015_harden_profile_authorization.sql` é proposta: restringe UPDATE de `profiles` à coluna `full_name`; revisar compatibilidade antes de ativar.
- APIs administrativas usam uma chave de serviço e portanto devem impor autorização **antes** de consultar ou alterar dados. Uma política RLS isolada não protege consultas de service role.

## Matriz de autorização a executar com Supabase isolado

| Papel | Membro ativo | Projeto atribuído | Permissão | Listar projeto | Alterar projeto | Publicar/excluir |
|---|---|---|---|---|---|---|
| Administrador com perfil legado strategist | Sim | Não exigido | Acesso admin | Permitir | Permitir | Permitir |
| Estrategista não admin | Sim | Sim | projects.read | Permitir apenas atribuído | Negar | Negar |
| Estrategista não admin | Sim | Sim | projects.write | Negar se sem projects.read | Permitir atribuído | Permitir atribuído |
| Estrategista não admin | Sim | Não | read/write | Não expor projeto | Negar | Negar |
| Equipe inativa | Não | Sim | read/write | Negar | Negar | Negar |
| Cliente | Não aplicável | Não aplicável | Não aplicável | Negar API admin | Negar | Negar |
| Anônimo | Não aplicável | Não aplicável | Não aplicável | 401 | 401 | 401 |
| Novos papéis manager/producer/finance | Sim | Sim | variável | **Ainda negados pelo perfil legado; migrar e homologar primeiro** | Ainda negados | Ainda negados |

## Casos mínimos

1. Sessão inexistente, JWT vencido ou adulterado: 401.
2. Perfil de cliente autenticado: 403 sem vazamento de metadados.
3. Colaborador inativo: 403 mesmo com atribuições históricas.
4. Membro sem `projects.read`: 403 para listagem.
5. Membro com `projects.read` e projeto A: lista A e nunca B.
6. Membro com `projects.write` sem vínculo A: nenhuma mutação em A.
7. Atribuição removida em outra sessão: leitura e gravação devem refletir revogação.
8. Desativação deve bloquear todos os endpoints operacionais após aplicação do enforcement, não somente a tela de equipe.
9. Revogação de permissão não pode ser contornada por acesso direto à API.
10. Comparar resultados de RLS por `anon`, `authenticated`, admin e cliente para SELECT, INSERT, UPDATE, DELETE, inclusive acesso cruzado entre projetos.
11. Confirmação e versão (`updated_at`) continuam obrigatórias para exclusão e alterações.
12. O bootstrap do primeiro admin, prevenção de último admin inativo e trilha de auditoria precisam de procedimento revisado separadamente.

## Critério de habilitação

**Não habilitar `ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED` até padronizar todas as rotas relevantes e testar em ambiente descartável.**
As verificações atuais ainda exigem `profiles.role=strategist` e não constituem habilitação dos novos papéis.
Usar `supabase test db` e testes pgTAP por tabela em um banco de homologação, após revisar as migrações propostas.
Não utilizar o projeto remoto de produção nem dados do Cliente Teste para testes mutáveis.
