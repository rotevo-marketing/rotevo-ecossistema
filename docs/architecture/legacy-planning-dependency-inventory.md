# ROTEVO — Inventário inicial de dependências do planejamento legado

Data: 2026-10-15. Branch examinada: feature/admin-v2-redesign. Status: somente leitura e planejamento de limpeza. Não é autorização para alterar produção.

## Modelo legado
O catálogo src/data/modules.ts lista 36 módulos anteriores. O editor legado está em src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx e a apresentação antiga em src/app/apresentacao/[slug]/page.tsx. Há componentes especializados em src/Components/modulos e src/Components/apresentacao, além das rotas de demonstração em src/app/admin/planejamentos/demo/modulos.

## Dependências encontradas na branch
- src/app/admin/page.tsx cria links para /admin/planejamentos/{clientSlug}, /admin/planejamentos/{clientSlug}/acesso e /apresentacao/{project.slug}, e consulta planning_projects.
- src/Components/admin/ClientsDirectory.tsx liga projetos à rota /admin/planejamentos/{slug}.
- src/app/cliente/page.tsx consulta planning_projects incluindo data completo e oferece link /apresentacao/{project.slug}.
- src/app/admin/planejamentos/[clientSlug]/page.tsx importa moduleCategories e planningModules de src/data/modules.ts; também liga editor, apresentação e configuração de acesso.
- src/app/apresentacao/[slug]/page.tsx importa o catálogo antigo e múltiplos componentes de apresentação especializados.
- src/app/admin/planejamentos/[clientSlug]/acesso/page.tsx e src/app/api/admin/create-client-access/route.ts têm funcionalidades de acesso que não devem ser removidas automaticamente.

## Classificação
Remoção candidata, após desvinculação: catálogo dos 36 módulos, formulários e apresentações antigas, páginas demo específicas.
Refatoração exigida: links nos dashboards, visão de projetos, portal e roteamento de apresentação.
Preservação exigida: dashboard, gestão de clientes, autenticação, permissões, operações, tarefas, onboarding, editoriais, equipe, reuniões e financeiro quando existentes, além dos testes de segurança.
Banco de dados: não apagar planning_projects ou dados sem plano de migração e validação de dependências. Testes anteriores eram relativos ao schema local legado.

## Faseamento recomendado
1. Confirmar rotas e modelos vigentes do Ecossistema de Crescimento 2027 e Sistema de Crescimento 2027 no código e nos documentos de referência.
2. Definir destino dos links que hoje apontam para o planejamento antigo.
3. Refatorar consumidores mantendo a experiência V2 e Tabler Icons.
4. Executar build e testes de regressão na branch.
5. Excluir código legado comprovadamente não referenciado, em commits agrupados.
6. Deployment de prévia somente após lote visual suficiente; nunca deploy de produção sem aprovação.
7. Não aplicar migrações em produção nem modificar usuários reais.

## Observação de escopo
Este documento é um inventário inicial: não afirma que todas as importações transitivas do repositório foram verificadas ou que a remoção já seja segura. Não houve exclusões.
