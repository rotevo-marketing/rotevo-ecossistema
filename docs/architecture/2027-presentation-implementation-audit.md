# ROTEVO — Auditoria da apresentação 2027 existente (15/10/2026)

Escopo: inspeção estática na branch feature/admin-v2-redesign, confrontada com o documento Sistema de Crescimento 2027. Sem alterações de aplicação.

## Componentes confirmados
- src/data/ecosystem2027.ts: catálogo de tarefas e documentos, incluindo Painel Executivo e áreas metodológicas.
- src/Components/apresentacao/EcosystemPresentationOverview.tsx: componente ativo de apresentação 2027, navegação com Painel Executivo, filtro por documentos selecionados e apresentados, uso de RotevoTablerIcon e estilo V2.
- src/app/apresentacao/[slug]/page.tsx: seleciona o componente 2027 quando project.data.ecosystem2027 existe; também contém a antiga apresentação dos 36 módulos como caminho de compatibilidade.
- src/app/admin/planejamentos/[clientSlug]/page.tsx: usa ecosystemDocuments, selectedDocumentCodes e presentedDocumentCodes, mas também importa catálogo legado.
- src/app/cliente/page.tsx: mantém link da apresentação e lê planning_projects.data integral.

## Lacunas
- A apresentação 2027 contém placeholder explícito para o conteúdo de documentos ainda não integrado.
- A seleção de códigos de documentos controla navegação, mas não é autorização de acesso robusta ao JSONB interno.
- O projeto contém fluxos legados e atuais na mesma rota; não remover sem substituição e regressão.
- Revisar o número e a agrupação de áreas da experiência com a documentação vigente, sem confundir as 12 áreas metodológicas e o Painel Executivo com um número fixo de telas.
- Não presumir que 57 documentos são 57 páginas da plataforma.

## Documento de referência
O PDF Sistema de Crescimento 2027, seção 20, define a plataforma como apresentação de decisões, indicadores, planos e prioridades. O Painel Executivo é consolidação e não a décima terceira área. A organização técnica dos módulos de apresentação ainda depende do projeto da plataforma.

## Próxima implementação, após definição
1. Inventariar payload de cada documento 2027 e seu contrato de apresentação.
2. Priorizar Painel Executivo real e conteúdos autorizados, sem exposição de dados internos.
3. Refatorar /apresentacao/[slug] preservando URL e fluxo de login.
4. Validar build, testes de integração, permissões e interface V2 com Tabler.
5. Remover dependências legadas sem modificar dados de produção.
6. Agrupar preview e aguardar autorização explícita para qualquer publicação em main ou app.rotevo.com.br.

A inspeção de código não comprova funcionamento ponta a ponta.
