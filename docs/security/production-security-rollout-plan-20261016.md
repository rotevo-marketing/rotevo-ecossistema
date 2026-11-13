# ROTEVO — Plano de implantação/reversão de segurança (proposta, 16/10/2026)

**NÃO EXECUTAR SEM APROVAÇÃO ESPECÍFICA.** Ambiente de destino: Supabase hospedado `kadvzjelkyfwouqmlxaa` e aplicação Vercel. O plano não representa um deploy, migração nem autorização de modificação do banco.

## Condições de entrada obrigatórias

- GitHub Actions verdes no SHA exato candidato, incluindo TypeScript, testes HTTP de criação de usuário, autorização de API administrativa, isolamento entre empresas, permissões por coluna e comportamento do portal.
- Inventário atualizado de grants, políticas RLS, funções de segurança e dependências; confirmação dos leitores/gravadores residuais de `planning_projects.data`.
- SQL de migração ensaiado integralmente contra a cópia descartável da configuração real, com scripts de verificação e reversão.
- Cópia recuperável e ensaio de restauração apropriados ao serviço Supabase (validar privilégios e limitações do plano).
- Janela, operador e autorização escritos para **cada** intervenção em produção. Separar produção de autenticação/perfis, JSON interno, função RPC e funcionalidades futuras de equipe/editorial.
- Plano de resposta a incidentes e rollback aprovado. **Nunca restaurar grants inseguros como rollback automático silencioso.**

## Ordem proposta

1. Congelar o SHA candidato e confirmar integrações client/admin; nenhuma migração enquanto houver cliente fazendo SELECT direto do JSON ou administrador fazendo `RETURNING data` sob `authenticated`.
2. Preparar implantação coordenada do código que usa `/api/client/projects`, `/api/admin/project`, `/api/admin/projects` e `/api/admin/project/update`.
3. Restringir UPDATE em `profiles`: `REVOKE UPDATE ON public.profiles FROM anon, authenticated;` e `GRANT UPDATE(full_name) ON public.profiles TO authenticated;` **após testar** os consumidores e a política self-update.
4. Restringir leitura do JSON: `REVOKE SELECT ON public.planning_projects FROM anon, authenticated;`, seguido de `GRANT SELECT(id,client_id,title,slug,description,status,updated_at,created_at,published_at) ON public.planning_projects TO authenticated;`. Rever antes de executar os metadados efetivamente usados e os privilégios herdados de outros papéis.
5. Revisar o EXECUTE de `public.is_strategist()` separadamente. Hipótese a ensaiar: `REVOKE EXECUTE ON FUNCTION public.is_strategist() FROM PUBLIC, anon;` mantendo EXECUTE para `authenticated` enquanto a função for usada em RLS. Não alterar `SECURITY DEFINER` ou `search_path` sem rever recursão de políticas.
6. Tratar proteção de senhas vazadas na configuração Supabase Auth em mudança separada, com aprovação.
7. Validar HTTP para todos os papéis fictícios permitidos e negados; conferir leitura de metadados e impossibilidade de ler JSON bruto fora do endpoint autorizado.
8. Confirmar status da aplicação e logs sem exposição de JSON, JWTs ou segredos.

## Testes pós-implantação — critérios mínimos

| Cenário | Resultado obrigatório |
|---|---|
| Cliente A tenta acessar B | bloqueado |
| Cliente A usa REST para ler `planning_projects.data` | acesso negado, sem valores privados |
| Cliente A solicita API administrativa | 403 |
| Anônimo solicita API de cliente/admin | 401 |
| Estrategista abre/edita módulos, onboarding, editorial e cronograma | leitura e escrita funcionam |
| Duas sessões editam mesma versão | a segunda recebe 409 |
| Cliente tenta alterar `profiles.role` / `client_id` | bloqueado |
| Usuário edita apenas seu `full_name` | permitido |
| Criar conta fictícia autorizada/duplicada | persistência íntegra / repetição segura |
| Auditoria de grants | confirma privilégios mínimos aprovados |

## Falha / reversão

- Se a aplicação falhar por cliente administrativo residual, interromper novos deploys, coletar evidências, restaurar **código compatível com grants seguros**, em vez de liberar o JSON a clientes.
- Se uma mudança de função RLS bloquear usuários autorizados, reverter exclusivamente a alteração da função/EXECUTE, após análise da exposição, mantendo a proteção de coluna.
- Se a correção de `profiles` impedir um fluxo legítimo, mover o fluxo ao serviço autorizado ou restaurar apenas a permissão estritamente necessária após análise e aprovação, nunca UPDATE indiscriminado.
- Repetir testes de regressão, auditar eventos e registrar evidência antes de reabrir o acesso.
- Escalonar situações que demandem backup/restore ou alterações de dados reais; nenhuma exclusão ou modificação de usuário real sem autorização.

## Estado atual

Documentos relacionados: `hosted-database-readonly-inventory-20261016.md`, `production-security-gate-20261015.md`, `planning-json-admin-compatibility-matrix-20261015.md` e `dependency-audit-review-20261016.md`.

Este é um **plano para revisão**, não comprovação de reversão ensaiada, nem autorização de implantação.
