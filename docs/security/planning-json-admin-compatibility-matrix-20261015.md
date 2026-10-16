# ROTEVO — Matriz de compatibilidade da proteção de planning_projects.data
**Status:** revisão de código, sem migração autorizada; branch `feature/admin-v2-redesign`.

## Evidência
Teste em execução para restrição experimental de SELECT em `planning_projects.data`: GitHub Actions `38838962185`, verificar conclusão. O teste de caracterização de exposição do JSON já passou em `38837752526`. Esses testes são de laboratório.

## Leitores e escritores observados na branch
| Arquivo | Dependência observada | Risco com REVOKE SELECT(data) de authenticated |
| --- | --- | --- |
| `src/app/admin/page.tsx` | Consulta/atualiza projetos | Avaliar SELECT real e retornos de update |
| `src/app/admin/planejamentos/[clientSlug]/page.tsx` | Atualiza projetos, incluindo documento estratégico | Quebra provável se leitura de data é necessária |
| `src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx` | SELECT(data), UPDATE(data) em múltiplas operações | **Quebra direta** de edição/merge dos módulos |
| `src/Components/admin/EditorialManager.tsx` | UPDATE(data).select(data,updated_at) | **Quebra direta** de retorno após salvar |
| `src/Components/admin/ProjectOnboarding.tsx` | UPDATE(data).select(data,updated_at) | **Quebra direta** de retorno após salvar |
| `src/Components/admin/ExecutionTimelineEditor.tsx` | UPDATE(data).select(data,updated_at) | **Quebra direta** de retorno após salvar |
| `src/app/cliente/page.tsx` | Agora chama `/api/client/projects` na branch | Proteção no frontend em desenvolvimento, mas permissão direta antiga ainda expõe data |
| `src/app/api/client/projects/route.ts` | Serviço obtém JSON com `service_role`, valida JWT e vinculação do cliente e retorna projeção permitida | Poderia substituir leitura do portal, mas não oferece edição/admin e requer teste completo |

A lista resulta dos arquivos inspecionados e não afirma esgotar todos os consumidores do repositório.

## Restrições arquiteturais
1. Não confundir papel de negócio em `public.profiles.role` com `authenticated` do PostgreSQL.
2. Apenas retirar SELECT(data) de `authenticated` afeta tanto clientes quanto estrategistas, inclusive consultas `UPDATE ... RETURNING data`.
3. Não autorizar uso da service-role em navegador. Proxies de escrita devem validar JWT, perfil de estrategista, recurso-alvo e autorização **antes** da alteração; preservar concorrência otimista `updated_at`.
4. Criar testes de integração que cubram salvar módulo, calendário, cronograma e onboarding; validar tanto retorno quanto persistência.
5. Depois de migrar TODOS os consumidores autorizados para rotas seguras, aplicar em laboratório grants revisados; confirmar que o cliente não consegue ler JSON bruto via PostgREST.
6. Plano de rollback não pode reabrir a exposição sem aceitação e mitigação explícitas.

## Plano técnico por portas
- **P1 (agora):** confirmar teste experimental e inventariar todos os pontos de leitura/escrita com uso de data.
- **P2:** desenhar contrato administrativo de leitura e escrita com autorização e versionamento; implementar e testar num fluxo de cada vez.
- **P3:** executar regressão integrada do portal, módulos, onboarding, cronograma e editorial com usuários fictícios.
- **P4:** somente após aprovação específica para produção, aplicar grants/restrições planejados, observabilidade e rollback.

**Decisão:** sem go-live neste estado. Nenhuma execução em produção é autorizada por este documento.
