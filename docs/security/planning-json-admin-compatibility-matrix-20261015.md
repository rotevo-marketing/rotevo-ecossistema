# ROTEVO — Matriz de compatibilidade da proteção de planning_projects.data
**Status:** histórico de outubro preservado abaixo; atualização UI3 em 10/11/2026, branch `feat/rotevo-ui2-pilot-20261109`. Sem migração hospedada autorizada.

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


## Atualização UI3, 10/11/2026

Esta seção substitui a avaliação atual dos consumidores; a tabela anterior permanece como histórico do risco que motivou a migração para endpoints. Inventário estático atual: 19 chamadas diretas, zero acessos inseguros de JSON no navegador.

| Consumidor atual | Fronteira e compatibilidade | Evidência e limite |
| --- | --- | --- |
| Portal e editores administrativos | Metadados diretos sujeitos a RLS; JSON por endpoints autenticados com service role no servidor | Contratos e testes comportamentais existentes aprovados; não enviar service role ao navegador |
| Escrita documental administrativa | JWT/perfil/permissões antes do cliente privilegiado; CAS em updated_at | JSONB curto/extenso, HTML/CSS, RETURNING e concorrência aprovados no PostgreSQL isolado; HTTP/editor completo permanece pendente |
| rotevo_editorial_decide e rotevo_editorial_idea_decide | SECURITY DEFINER com auth.uid, client_id, visibilidade e versão | Funções originais aprovam fixtures legítimas após restrição; negam conteúdo oculto, versão antiga e outro tenant; fallback sem workspace exige revisão própria |
| Financeiro público/privado | Wrappers SECURITY INVOKER chamam funções privadas SECURITY DEFINER com autorização própria | SQL financeiro original passou após restrição; revisar fallback de workspace e troca inicial de senha de snapshot/RPC; não equivale à UI financeira conectada |
| Grants propostos | Revogar tabela e coluna, inclusive PUBLIC; permitir metadados e preservar servidor | Sete grupos SQL sintéticos aprovados; nenhum grant hospedado alterado |

Não transformar funções em SECURITY INVOKER nem revogar EXECUTE em bloco. O ensaio usa 14 arquivos selecionados, claims de Auth simuladas e Storage mínimo: não certifica o schema completo do Supabase hospedado. A homologação mínima de Auth/PostgREST real já aprovada no workflow 42744174264 é preservada, sem repetição. G2 continua bloqueando implantação.


## Evidência integrada adicional, 10/11/2026

O workflow [42750794070](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42750794070), commit `3912c2e`, passou em seis grupos com GoTrue, PostgREST, Storage e handlers Next.js originais, em runner temporário não vinculado e com identidades fictícias. O mesmo manifesto de 14 arquivos selecionados e a proposta de grants preservaram o fluxo documental HTTP de salvar/reabrir/CAS/revisar/aprovar/publicar e a projeção publicada; o cliente não conseguiu ler JSON bruto via Data API. O ensaio financeiro e os links de assets de planejamento, contrato e fatura também passaram.

A revisão fechou duas lacunas da apresentação HTTP (senha inicial e workspace ausente), sem modificar funções SQL hospedadas. Continuam pendentes a equivalência integral ao schema hospedado, a UI autenticada de Equipe, a matriz visual e a harmonização das RPCs diretamente expostas. A compatibilidade HTTP agora tem evidência integrada real; a homologação visual completa do editor e o retorno operacional seguro permanecem pendentes. Nenhum grant hospedado foi aplicado.
