# ROTEVO | Catálogo de módulos e contratos de dados — inventário inicial

Data: 15/10/2026. Status: **inventário estático de código**, não validação de payloads reais nem allowlist final. Fonte: branch feature/admin-v2-redesign.

## 1. Fonte de verdade observada
- `src/data/modules.ts` declara **36 módulos de planejamento** (propriedade `slug`) em cinco categorias e todos têm `presentation: true`.
- `src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx` importa os formulários e seus tipos específicos, mantém estado por tipo e salva majoritariamente em `planning_projects.data.moduleContent[moduleSlug]`.
- `src/app/apresentacao/[slug]/page.tsx` lê `moduleContent` e encaminha objetos aos respectivos componentes de apresentação.
- A apresentação também acessa `moduleContent['jornadas-por-persona']`, uma **chave adicional ao catálogo de 36 slugs**, em conjunto com `jornada-de-compra` e `personas`. Exige compatibilidade retroativa; não tratá-la como módulo catalogado sem confirmação.
- `src/app/cliente/page.tsx` consome `planning_projects.data` completo, inclusive `coverImageUrl`, `deliverySchedule`, `onboardingChecklist`. Esses metadados precisam de contrato público separado.

## 2. Inventário por categoria e slugs reais
**Essência do Projeto (5)**
dna-do-especialista; dna-da-empresa; dna-de-conteudo; tom-de-voz; identidade-visual.

**Fundamentos Estratégicos do Projeto (8)**
objetivos-do-projeto; referencias-e-concorrentes; pesquisa-de-concorrencia; analise-swot; palavras-chave; personas; jornada-de-compra; canais-digitais-atuais.

**Estratégia Editorial e Canais de Conteúdo (15)**
funil-de-conteudo; linhas-editoriais; instagram; tiktok; youtube; facebook; linkedin; whatsapp; blog; pinterest; podcasts; lives; materiais-educacionais; estrategia-do-site; mapa-do-site.

**Campanhas, Automações e Conversão (4)**
campanha-captacao-de-lead; campanha-conversao-de-vendas; campanha-distribuicao-de-conteudo; fluxo-de-automacao.

**Execução, Acompanhamento e Gestão (4)**
linha-do-tempo; calendario-de-conteudo; metricas-e-indicadores; orientacoes-adicionais.

Total: 36. A presença de `presentation: true` indica capacidade de renderização, **não autorização para compartilhar todo o conteúdo**.

## 3. Tipos de payload e exceções identificados
- Formulários especializados têm tipos/normalizadores próprios; exemplos: `SpecialistData`, `CompanyData`, `PersonasData`, `PersonaJourneysData`, `InstagramData`, `ContentFunnelData`, `EditorialLinesData`, `SiteMapData`, `ContentCalendarData`.
- Personas/jornadas têm lógica de IDs estáveis, leitura da fonte de personas, migração de jornada legada e associação por persona.
- Diversos canais têm funções de normalização específicas; não inferir formato homogêneo de `moduleContent`.
- Há suporte a `GenericModuleData` com `mainText`, `notes`, `references`, que exige decisão explícita sobre publicação de anotações.
- Links externos, materiais, documentos e campos textuais livres requerem revisão de dados internos, credenciais e URLs não destinadas ao cliente.
- Não foram ainda extraídas as interfaces campo a campo de todos os 36 formulários; **não aprovar allowlist de campos com base somente neste inventário**.

## 4. Critérios propostos para allowlists
1. Definir serializador por slug, versionado por `schemaVersion`, com lista positiva de campos.
2. Rejeitar por padrão chaves extras e propriedades internas não mapeadas; validar `payload` antes da publicação.
3. Exigir revisão do estrategista para cada snapshot, mesmo quando módulo já publicado é reeditado.
4. Definir dependências: jornada por persona precisa de IDs e dados de persona efetivamente autorizados; não copiar documentos adjacentes implicitamente.
5. Separar `status` geral do projeto de `published` por módulo; módulos não autorizados não devem aparecer em APIs de cliente.
6. `selectedModules`, `selectedDocumentCodes`, `presentedDocumentCodes` e `presentation: true` são sinais de UI/planejamento, não verificação de permissões.
7. Metadados de portal devem ser publicados por contrato próprio, sem revelar o `data` interno completo.

## 5. Próximo levantamento obrigatório
- Extrair **campo a campo** as interfaces/tipos de cada `src/Components/modulos/*Form` e os adaptadores da apresentação.
- Classificar cada campo: publicável, interno, derivado ou dependente de revisão.
- Conferir `moduleContent` com os serializadores reais, campos opcionais, listas aninhadas, links, anexos e estruturas legadas.
- Validar contrato público de `coverImageUrl`, `deliverySchedule` e itens `onboardingChecklist.visibleToClient`.
- Montar testes de vazamento e equivalência visual por módulo antes da migration local.

## 6. Portões operacionais
Sem migrações de produção, edição de usuários reais, merge em main ou deployment. Manter V2/Tabler Icons e agrupar prévias. A análise reflete **código**, não amostra de dados reais de clientes.

Referências: 
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/database/postgres/column-level-security
https://supabase.com/docs/guides/database/json
