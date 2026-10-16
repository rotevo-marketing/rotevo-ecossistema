# ROTEVO — Fechamento técnico da rodada de segurança — 16/10/2026

**Escopo:** autenticação, acesso de clientes, isolamento de informações, APIs e escrita administrativa. Branch `feature/admin-v2-redesign`. Nenhuma alteração em produção ou deploy Vercel autorizado/executado.

## Implementado nesta continuidade

- `ExecutionTimelineEditor`, `ProjectOnboarding`, `EditorialManager`: escritas de `planning_projects.data` migradas para `PATCH /api/admin/project/update`.
- Página de gerenciamento `/admin/planejamentos/[clientSlug]`: gravações de seleção de módulos e escopo de documentos via API versionada; leitura do JSON por `GET /api/admin/project`.
- Editor `/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]`: leitura de JSON pela API administrativa e escritas de módulos/personas/jornadas pela API versionada.
- Painel `/admin`: listagem administrativa de projetos por `GET /api/admin/projects` em vez de SELECT de JSON direto.
- Testes estáticos dos contratos dos editores e API de projetos, incorporados à CI.
- Testes HTTP positivos para criação de cliente fictício, associação a `profiles`, verificação de duplicação e isolamento; testes HTTP do novo endpoint de listagem administrativa.
- Inventário somente leitura do Supabase hospedado; experimento local de revogação de EXECUTE de `public.is_strategist()`; relatório de dependências e plano de implantação/rollback.

## Evidência de validação

- `38888180238` — Security checks (development), concluído com sucesso: contrato das APIs, anonimato, TypeScript e auditoria apenas informativa.
- `38888108892` — Supabase local, sucesso (testes HTTP do endpoint de listagem administrativa).
- `38887832036` — Supabase local, sucesso (criação de usuário fictício e rejeição de duplicação).
- `38888478191` — Supabase isolated baseline, sucesso (inclui experimento de EXECUTE de `is_strategist()`).

Resultados de CI confirmam apenas versões verificadas; mudanças posteriores precisam de nova verificação proporcional. Não substituem QA completo da interface nem testes de produção.

## Riscos ainda abertos

1. `planning_projects.data` permanece legível diretamente a `authenticated` no banco hospedado, condicionado por RLS. A restrição definitiva aguarda ensaio final de compatibilidade e autorização de produção.
2. A migração de grants de `profiles` permanece proposta, não implantada em produção.
3. `is_strategist()` é SECURITY DEFINER executável por `anon` e `authenticated` no Supabase hospedado. Revogação para `anon` foi ensaiada localmente, mas não aplicada.
4. Proteção contra senhas vazadas está desativada no Supabase hospedado.
5. Auditoria de dependências anterior: 31 apontamentos, 4 altos e 27 moderados, sem críticos. Atualização de lockfile e testes próprios de editor/Next.js permanecem pendentes.
6. Persistem operações administrativas diretas de status e exclusão de projeto que precisam ser validadas contra os grants definitivos, além do inventário de consumidores fora dos cinco componentes migrados.
7. Nenhum ensaio de restauração/rollback de produção foi executado, pois requer ambiente, plano e aprovação específicos.

## Gate de passagem

**Desenvolvimento e testes de segurança desta rodada: concluídos nos cenários registrados.**
**Implantação / autorização / fechamento de segurança de produção: NÃO CONCLUÍDOS.**

Antes de recomendar GO, completar a regressão funcional dos consumidores remanescentes, rever dependências vulneráveis, preparar SHA candidato e realizar aprovação específica para alterações do Supabase e Vercel.

Fontes internas: `production-security-gate-20261015.md`, `planning-json-admin-compatibility-matrix-20261015.md`, `hosted-database-readonly-inventory-20261016.md`, `dependency-audit-review-20261016.md`, `production-security-rollout-plan-20261016.md`.
