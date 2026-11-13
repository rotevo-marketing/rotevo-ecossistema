# ROTEVO — Destino das rotas legadas para o modelo vigente 2027

Status: proposta de mapeamento fundamentada em decisões aprovadas do Histórico Principal e dependências observadas na branch feature/admin-v2-redesign. Nenhuma alteração funcional executada.

## Diretriz confirmada
Preservar endereços de edição, apresentação e configuração de acesso. Atualizar conteúdos e consumidores sem quebrar links. Portal /cliente é dashboard operacional distinto da apresentação estratégica; ação Planejamento Estratégico deve abrir a apresentação do Sistema de Crescimento 2027 começando pelo Painel Executivo, com retorno ao portal.

## Correspondência
- /admin: manter Dashboard V2, controles de projetos, clientes e operações.
- /admin/planejamentos/[clientSlug]: adaptar gestão de planejamento atual, sem referência aos 36 módulos antigos.
- /admin/planejamentos/[clientSlug]/acesso: preservar criação e gestão de acesso; testar contratos e controles de segurança.
- /apresentacao/[slug]: manter URL; substituir renderização legada pela experiência vigente do Sistema de Crescimento 2027, iniciando no Painel Executivo.
- /cliente: manter dashboard de andamento, reuniões, calendário e aprovações; apresentação segue separada.
- /admin/planejamentos/[clientSlug]/modulos/[moduleSlug]: rota legada com dependência do catálogo antigo; não apagá-la antes de confirmar ausência de links e definir redirecionamento ou remoção segura.
- /admin/planejamentos/demo/modulos/*: demonstrações de 36 módulos, candidatas à exclusão após auditoria de imports e build.

## Evidências da branch
- src/data/ecosystem2027.ts já cataloga metodologia corrente.
- src/app/admin/page.tsx e src/Components/admin/ClientsDirectory.tsx apontam para /admin/planejamentos.
- src/app/admin/page.tsx e src/app/cliente/page.tsx apontam para /apresentacao/[slug].
- src/app/admin/planejamentos/[clientSlug]/page.tsx e src/app/apresentacao/[slug]/page.tsx ainda usam src/data/modules.ts e componentes do modelo de 36 módulos.
- src/app/api/admin/create-client-access/route.ts atende a um fluxo separado que deve ser preservado.

## Distinção de escopo
Ecossistema de Crescimento 2027 organiza metodologia com 12 áreas e 57 etapas; Sistema de Crescimento 2027 é a experiência de apresentação estratégica, estruturada em nove áreas de visualização conforme documento do sistema; Rotevo abrange administração e operação. A navegação de 9 áreas da apresentação não deve ser confundida com as 12 áreas metodológicas.

## Pendências antes de modificar código
1. Conferir catálogo corrente dos 57 itens, composição do Painel Executivo e artefatos de apresentação.
2. Identificar componentes vigentes que já implementam parte da experiência, inclusive login e retorno ao portal.
3. Definir transição do slug de projeto, links salvos, e dados legados; não fazer destruição de tabelas.
4. Tratar o contrato de publicação segura por documento ou unidade vigente; descartar modelo antigo por módulo sem transpor seus 36 slugs.
5. Refatorar em lotes com build e regressão antes de exclusões, preservando identidade V2/Tabler e agrupando deployments.
6. Nenhum merge em main, migration em produção, alteração em usuários reais ou deployment de produção sem autorização explícita.

Referência externa: https://supabase.com/docs/guides/local-development/cli-workflows
