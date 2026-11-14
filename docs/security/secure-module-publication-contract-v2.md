# ROTEVO — Publicação segura por módulo | Contrato técnico V2

Status: **direção arquitetural aprovada; detalhamento proposto para revisão; nenhuma migração ou alteração funcional aplicada**.
Base: docs/security/secure-publication-contract-v1.md; revisão da branch feature/admin-v2-redesign em 15/10/2026.

## 1. Decisão aprovada
Publicação é granular por módulo. O estrategista mantém seu workspace e rascunhos em planning_projects.data; o cliente recebe somente snapshots de módulos liberados. Publicar um módulo não publica outros módulos, nem atualizações futuras do mesmo módulo.

## 2. Compatibilidade com a implementação atual
- O editor em src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx grava data.moduleContent[moduleSlug] no objeto planning_projects.
- A administração em src/app/admin/planejamentos/[clientSlug]/page.tsx manipula selectedModules, ecosystem2027.selectedDocumentCodes, ecosystem2027.presentedDocumentCodes e o status geral draft/published.
- O portal src/app/cliente/page.tsx lê data completo, usa deliverySchedule, coverImageUrl, onboardingChecklist e dados de apresentação.
- A rota src/app/apresentacao/[slug]/page.tsx lê o registro planning_projects e renderiza moduleContent; essa superfície exige refatoração para não carregar o JSON interno para clientes.
- Flags existentes de apresentação são pistas para adaptação de UI, mas **não são autorização segura** e não equivalem ao novo registro de publicação.
- Nenhuma alteração de Tabler Icons ou da identidade V2 é necessária para definir o contrato.

## 3. Entidades propostas (nomes de trabalho, NÃO objetos existentes)
**public.planning_module_publications** — registro versionado e append-only de snapshots:
- id UUID; project_id UUID; client_id UUID; module_slug TEXT; revision INTEGER; payload JSONB; published_at timestamptz; published_by UUID; revoked_at timestamptz; revoked_by UUID; checksum opcional
- Constraints: FK project_id e client_id coerentes, UNIQUE(project_id,module_slug,revision), revisões > 0, published_at obrigatório; validação de payload por contrato do módulo.
- O registro publicado não deve incluir rascunhos, comentários internos, prompts, credenciais, links privados ou metadados administrativos.

**public.planning_module_publication_heads** (alternativa de materialização para leitura; confirmar antes da migration):
- project_id + module_slug; publication_id ativo; updated_at.
- Revogação = deixar de apontar para a revisão publicada. Preservar auditoria de revisão sem entregá-la ao cliente.
- Evitar múltiplas revisões marcadas como ativas e condições de corrida usando transação no servidor.

**Metadados de portal**: definir explicitamente uma projeção própria para cliente (nome/slug/status público, imagem de capa, calendário publicado e tarefas visíveis), sem SELECT direto do JSONB interno. Avaliar se mesma tabela de projeções ou entidade separada.

## 4. Comportamento de publicação por módulo
1. Estrategista autorizado edita workspace interno, sem afetar conteúdo já publicado.
2. Seleciona módulo concluído e revisa preview derivado por allowlist do respectivo módulo.
3. Confirma publicação. Servidor verifica JWT, papel autorizado, vínculo ao projeto e valida esquema do payload. Nunca aceitar client_id/role do navegador como fonte de verdade.
4. Em uma única transação cria revisão imutável e atualiza ponteiro da revisão ativa. Registra auditoria.
5. Cliente autenticado da empresa lê apenas revisão ativa autorizada.
6. Uma nova edição interna não altera a revisão ativa. Republicação cria a próxima revisão.
7. Revogação desativa o ponteiro; novas requisições deixam de retornar o conteúdo. Cópias já entregues, caches e downloads prévios não podem ser recolhidos remotamente.

## 5. Matriz de autorização proposta
- Estrategista autorizado: leitura/edição de workspace e publicação por rota administrativa.
- Cliente associado: SELECT apenas das projeções publicadas **ativas** do próprio cliente. Nenhum INSERT/UPDATE/DELETE nelas.
- Cliente não associado: nenhuma leitura.
- anon: nenhum acesso.
- Service role: apenas no servidor, depois de autenticar e autorizar o solicitante.
- Revogar SELECT do cliente sobre planning_projects antes da ativação dos leitores novos, no mesmo rollout controlado; não quebrar o cliente enquanto coexistem leitores antigos.

## 6. Tratamento dos campos existentes
- moduleContent: publicar por moduleSlug explicitamente autorizado; serializador por módulo com allowlist (não copiar data[moduleSlug] indiscriminadamente).
- selectedModules: configura editor/navegação e não confere acesso.
- ecosystem2027.selectedDocumentCodes: seleção interna, não uma autorização de leitura.
- ecosystem2027.presentedDocumentCodes: reaproveitar como sinal visual onde possível, mas a permissão verdadeira deriva da publicação ativa.
- status geral do planejamento: preservar como indicador de ciclo de vida, independente do estado de cada módulo, após revisar a UI.
- coverImageUrl, deliverySchedule, onboardingChecklist: definir projeção mínima do dashboard, respeitando visibleToClient; não expor data inteiro.

## 7. Contratos de leitura e escrita na aplicação
- Editor/admin continuam usando dados internos, com privilégios revistos e testes próprios.
- Portal do cliente consulta resumo público e índice de módulos ativos.
- Apresentação resolve slug de projeto e módulos ativos do cliente; não recebe moduleContent original.
- URLs de apresentação devem exigir autenticação e vínculo; não tratar slug como segredo.
- Fazer teste direto com PostgREST/API, não somente UI. Auditar cache (no-store em conteúdo sensível) e logs.

## 8. Testes de laboratório antes de qualquer deployment
- Usuário A/B e anon, módulos publicados vs. não publicados, revisão ativa vs. antiga, revogação, nova edição sem publicação e status draft.
- Tentativas de SELECT direto em planning_projects (inclusive data), INSERT/UPDATE/DELETE de publicações por cliente e bypass via endpoint.
- Serializadores dos módulos, inclusive exclusão de chaves internas e payload inesperado.
- Testes de integração do editor, portal, apresentação e ações de publicação; teste regressivo de cadastro de clientes.
- Não interpretar os 5 testes de caracterização atuais como prova de segurança; eles devem mudar de propósito ou permanecer explicitamente como baseline do comportamento legado.

## 9. Ordem recomendada de implementação (uma etapa por vez)
A. Catalogar os moduleSlug e formatos de dados reais do código; definir allowlists e metadados públicos. **Próxima etapa.**
B. Preparar DDL local e suites pgTAP; não aplicar ao remoto.
C. Desenvolver fluxo de publicação no servidor com checagens e trilha de auditoria.
D. Adaptar apresentação e portal, preservando componentes V2 e Tabler.
E. Remover acesso direto de cliente a planning_projects, validar testes E2E e prévia agrupada.
F. Planejar migração de produção e implantação somente após autorização explícita e plano de rollback.

## 10. Questões abertas
- Granularidade de campos e submódulos específicos, especialmente documentos compostos.
- Dados auxiliares do portal e visualização de andamento durante rascunho.
- Política de permissões para funções futuras de Equipe.
- Política de versionamento e interface de revogação.
- Estratégia de transição de clientes existentes, sem exportar dados reais para o laboratório.

Fontes oficiais:
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/database/postgres/column-level-security
https://supabase.com/docs/guides/database/views
