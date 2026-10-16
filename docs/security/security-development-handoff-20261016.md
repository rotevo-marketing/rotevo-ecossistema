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


## Continuidade adicional desta conversa

- Criação de planejamentos passou para `POST /api/admin/project/create`, com autenticação Supabase, papel de estrategista, cliente-alvo existente, validação do payload e tratamento de duplicação.
- Publicação/retorno ao rascunho passaram para `PATCH /api/admin/project/status`, com comparação de `updated_at`.
- Exclusão na interface administrativa passou para `DELETE /api/admin/project/delete`, com confirmação explícita na UI, JWT, perfil de estrategista e comparação de versão. O teste integrado de exclusão ainda está sob investigação até que o último CI conclua.
- `CentralTarefas` passou a atualizar tarefas pela API administrativa versionada, eliminando sua escrita direta do JSON.
- A apresentação `/apresentacao/[slug]` passou a consultar `GET /api/presentation/project`, com restrição por perfil/vínculo empresarial. Clientes recebem apenas módulos selecionados e, na estrutura 2027, códigos apresentados; estrategistas podem consultar o conjunto administrativo. **Pendente:** revisão campo a campo do conteúdo legado selecionado antes de declarar a projeção totalmente segura em produção.
- `scripts/security/planning-project-consumer-inventory.mjs` foi adicionado à CI para detectar acessos brutos ao JSON a partir de componentes de navegador. O workflow `38892508296` concluiu com sucesso (11 referências diretas remanescentes, todas inspecionadas pela regra atual, sem violação reportada).
- Testes HTTP locais ampliados: criação de planejamento, publicação, exclusão, autorização por papel, isolamento de apresentação entre empresas, conteúdo publicado e comportamento de rascunho.

### Validações deste complemento

- `38892508296`: segurança/TypeScript/contratos, sucesso.
- `38892730897`: segurança/TypeScript/contratos, sucesso.
- `38892730909`: laboratório HTTP Supabase mais recente, **em execução na última consulta**; não declarar aprovação antes de conferir conclusão. Execuções intermediárias anteriores identificaram falhas nos fixtures e no cenário de exclusão, corrigidas ou sob investigação.

### Gate ainda obrigatório

Não implantar em produção até: laboratório mais recente passar, testes funcionais do fluxo legado de apresentação, revisão de conteúdo legado campo a campo, triagem/resolução de dependências vulneráveis, ensaio de reversão e autorização específica de migrações/grants e deploy. O Supabase hospedado permanece sem as novas restrições.


## Atualização: dependências protegidas e build validado

- Candidato Tiptap 3.32.0 coordenado passou em `38894000688` (instalação, TypeScript, auditoria 0).
- Manifesto e lockfile foram efetivamente incorporados na branch de desenvolvimento pelo workflow `38894325744`; `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, extensões Link/Underline foram alinhados a `^3.32.0`.
- A auditoria `npm audit --omit=dev` passou de informativa para bloqueante, via `security-checks.yml`.
- `38894517055`: CI de segurança após atualização do lockfile, **sucesso** (incluindo auditoria sem falhas, TypeScript e regras de autorização).
- `38894546393`: build Next.js com variáveis fictícias, TypeScript e auditoria de dependências em ambiente isolado, **sucesso**.
- **Importante:** ausência de vulnerabilidades reportadas na auditoria não substitui a análise de segurança e testes funcionais do editor. Nenhuma publicação, alteração do Supabase hospedado ou usuário real foi realizada nesta rodada.

### Pendente para produção
1. Rever a projeção de conteúdo legado da apresentação **campo a campo**. Atualmente os módulos marcados para exibição podem conter subcampos não revisados; não classificar o endpoint como totalmente seguro para público externo.
2. Verificar compatibilidade da revogação de leitura de `planning_projects.data` para todos os consumidores, incluindo páginas de metadados.
3. Reexecutar testes e rollback dos grants restritivos de `profiles`, do JSON e da função `is_strategist()` em laboratório, antes de preparar proposta de migração.
4. Aprovação específica para alterações em banco hospedado, Vercel e configurações Supabase Auth.
