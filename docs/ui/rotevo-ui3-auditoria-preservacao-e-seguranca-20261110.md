# Rotevo UI 3.0 — Auditoria somente leitura: preservação e segurança (10/11/2026)

**Escopo:** projeto Supabase hospedado da Rotevo e PR #5. Consultas agregadas, catálogo e documentação da branch `release/rotevo-ui3-rc-20261110`. Nenhum conteúdo de cliente, JSON privado, credencial, token ou arquivo de Storage foi extraído.

**Decisão de negócio comunicada pelo responsável:** tarefas, atividades e calendários provisórios podem ser refeitos, pois os materiais de referência estão preservados fora da plataforma. Essa tolerância à perda **não inclui** contas, login, vínculos cliente/projeto, configurações, arquivos não classificados, permissões nem serviços gerenciados Auth/Storage.

## Evidência hospedada, somente leitura

- `public.clients`: 5 registros.
- `public.client_workspaces`: 5 registros; 0 workspaces sem `clients.id` correspondente.
- `public.planning_projects`: 5 registros; 0 projetos sem `clients.id` correspondente.
- `public.client_users`: 0 registros; esse número isolado **não demonstra** ausência de acesso: conferir modelo real de associação via perfis/autenticação.
- `public.profiles`: 16 `client`, 2 `strategist`; nenhum `staff` observado nesta contagem.
- `public.team_members`: 1 registro. Não interpretar registro isolado como conta de equipe pronta para homologação.
- `public.project_assets`: 7 registros; não descartar sem classificar dados e metadados de Storage.
- `public.editorial_approvals`: 0 registros.
- `public.planning_projects`: RLS habilitado e seis políticas na tabela; o papel `authenticated` ainda tem `SELECT` e `UPDATE` efetivos na coluna privada `data`. RLS por linha não impede acesso ao conteúdo do JSON do próprio projeto quando a coluna está autorizada.

**Risco confirmado, gate G2:** revogar `SELECT/UPDATE` comuns do JSON privado, preservando metadados e edição de serviço, **somente após** compatibilidade e autorização específica. Existe proposta transacional `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`, já exercitada em laboratórios anteriores, mas não aplicada ao ambiente hospedado. As RPCs editoriais têm proposta de hardening separada e ainda não aplicada. Não aplicar SQL de proposta nem reabrir grants por rollback automático.

## Estado da integração

- PR [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5): aberto, `draft=true`, `mergeable=true`, `merged=false`, head observado `19492b6a788161c7af7c96199dfabb38d12546c8` antes desta atualização documental.
- A branch de preparação é diferente da `main`; nenhum merge, SQL hospedado, exclusão de dados nem promoção Vercel efetuados nesta auditoria.
- Testes sintéticos anteriores documentados no runbook não substituem testes de autorização hospedada por identidade apropriada nem ensaio de recuperação real.

## Matriz de preservação

| Classe | Decisão |
| --- | --- |
| Tarefas e calendários provisórios | Podem ser refeitos **após classificação e avaliação de dependências**. Não excluir preventivamente. |
| Planejamento e documentos | Preservar estrutura, seleção, versionamento, publicações e vínculos; cópia de conteúdo no Drive não prova backup integral do estado da aplicação. |
| Clientes, perfis, Auth, acessos, equipe, projetos, workspaces, preferências | Preservar; validar acessos por perfil e por projeto. |
| Contratos, financeiro, documentos/arquivos em Storage | Preservar; podem ter valor próprio mesmo quando atividades são fictícias. |
| Grants, RLS, funções privilegiadas | Corrigir apenas com preflight, pós-testes, rollback de aplicação compatível e autorização específica. |

## Próximas etapas

1. Confirmar todos os consumidores da coluna `planning_projects.data` no release candidate e na build realmente publicada, incluindo funções e APIs; comparar metadata e grants hospedados.
2. Preparar homologação sintética de dois clientes, estrategista e equipe com acesso mínimo; testar negações cruzadas, permissões, documentos, tarefas, calendário, aprovações e comentários quando efetivamente implementados.
3. Validar acessibilidade manual, versão exata do candidato e identidade real da Equipe. Não criar usuário de teste hospedado sem autorização explícita.
4. Reavaliar o requisito de contingência: existe relato de dump de novembro com SHA-256 verificado localmente, **mas a restauração não foi comprovada**. Preservar o dump e os arquivos privados de Storage; não atribuir ao backup capacidade de recuperação não testada.
5. Solicitar aprovação específica e separada para alteração hospedada de grants/RPCs e publicação. A tolerância de perda de dados provisórios não implica aprovação de risco de exposição de informações de clientes.

**Decisão desta auditoria: NO-GO para promoção de produção.** A autorização para prosseguir com auditoria e preparação não constitui autorização para alterar permissões ou publicar sem evidências.
