# Editor Estratégico — protótipo isolado (20/10/2026)

## Referência e limites da leitura

Conversa localizada: “Retomar projeto Rotevo”, ID 6ad4a985-4f3c-83e9-be08-055ff588f6c7, no projeto Ecossistema. read_thread retornou cinco turnos recentes: pedido de editor profissional como WordPress com títulos/gráficos/imagens, seguido de autorizações para executar e corrigir. As respostas do ChatGPT estavam representadas por marcadores chatgpt-content-reference, sem o texto. Portanto, a leitura do histórico foi parcial; não se presume conhecimento das propostas completas ou das decisões antigas. A instrução prioritária explícita do usuário nesta missão é a referência de escopo.

Referências efetivamente examinadas:
- EcosystemDocumentEditor: revisão/aprovação/publicação explícitas; publishedContent separado do rascunho; atualização autorizada com controle de concorrência.
- ClientPlanning: leitura dentro da página Planejamento do portal; catálogo metodológico; acesso somente à projeção publicada; cronograma visível antes da entrega.
- PlanningLayoutDemo: modos de demonstração, Aurora Consultoria fictícia, visão executiva e navegação de documentos.
- PlanningScheduleEditor: elaboração/entrega com datas e visibilidade; datas não publicam documentos.
- projectForPresentation: projeção de publishedContent exclusivamente para documentos selecionados e apresentados, condicionada ao projeto publicado.
- projectForClient: allowlist de dados; etapas do planejamento somente quando explicitamente visíveis.
- src/data/ecosystem2027.ts: códigos, títulos e 12 áreas do catálogo existente.
- sources/ECOSSISTEMA DE CRESCIMENTO 2027.pdf: documento de continuidade operacional; extração textual das seções iniciais, incluindo as 12 áreas e relação metodológica. Nenhum arquivo sincronizado foi editado.
- sources/ROTEVO_Guia_de_Identidade_Visual_Plataforma_v1_2026-10-13.pdf: seções de cor, contraste, tipografia, geometria e responsividade, consultadas por extração textual. Não foi uma auditoria visual integral do PDF.
- Documentação Next.js instalada: carregamento de componentes cliente por next/dynamic com ssr:false.
- Documentação oficial BlockNote: https://www.blocknotejs.org/docs/getting-started/nextjs , https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks e https://www.blocknotejs.org/pricing .

## Continuidade e recuperação

Workspace: C:\Users\euota\.codex\.chatgpt-projects\g-p-6ac635969808819188835c60f4662d03\rotevo-ecossistema
Branch: feature/admin-v2-redesign.
Base atualizada por fast-forward até 284b80af53b6fd82bd35f1bc39329fbff88c327c, incluindo o Portal, o cronograma e o demo Aurora desenvolvidos posteriormente à missão financeira.
Snapshot do código antes do protótipo: recovery/editor-before-284b80a-20261020.zip, fora do repositório.
Os seis componentes/fluxos solicitados para investigação não foram alterados. Não houve migrations nem mudanças de Supabase, permissões, projetos, documentos ou cronogramas reais. Não há vínculo do protótipo no Portal real nem no editor real.

## Decisões técnicas

BlockNote 0.56.0: @blocknote/core, @blocknote/react e @blocknote/mantine, todos fixados no package.json e lockfile. Pacotes declaram MPL-2.0; interfaces React aceitam React 19. Dependências Tiptap existentes 3.32.0 permaneceram deduplicadas e compatíveis. Não foram adicionados pacotes XL, assinatura, IA, colaboração, serviços externos ou exportadores pagos. Preservar avisos/licenças dos pacotes e revisar obrigações antes da integração definitiva. Não se assume que todas as futuras extensões tenham a mesma licença.
Tiptap já existente foi mantido; não se substituiu outro editor por Lexical. BlockNote foi escolhido conforme preferência aprovada e por disponibilizar experiência de blocos, menus, tabelas e reordenação, reduzindo a infraestrutura de interface a construir neste protótipo.

Rota exclusiva: /previa/editor-estrategico. Gate no servidor: VERCEL_ENV=production sempre retorna 404, mesmo com flag local true; Preview é permitido; local exige ROTEVO_EDITOR_PREVIEW=true. A proteção Vercel existente é preservada. A página tem noindex/nofollow e usa importação dinâmica sem SSR do editor.
Não existem chamadas de Supabase, APIs de projetos, localStorage, publicação automática ou alterações de status reais. Toda a sessão é memória React. Recarregar/trocar documento reinicia o exemplo; a troca exige confirmação com diálogo nativo, foco modal e Escape.

## Implementação

- Editor profissional em identidade Rotevo, sem segundo menu lateral do cliente.
- Títulos/subtítulos, texto com formatação e links, listas, tabelas e imagens nativas BlockNote.
- Menu / e ferramentas visíveis de inserção; menus laterais nativos dos blocos.
- Desfazer/refazer; arrastar/mover blocos e controles explícitos Subir/Descer.
- Blocos React de decisão/recomendação/conclusão, com conteúdo formatado e propriedades editáveis.
- Indicadores editáveis (nome/valor/contexto) e gráficos de barras com séries editáveis, rótulos e descrição acessível.
- Validação de séries: até 8 pontos, valores finitos não negativos e limite de 1.000.000 por ponto.
- Imagem SVG ilustrativa local própria para o exemplo; upload local PNG/JPEG/WebP até 4 MB por arquivo, convertido pelo navegador, sem upload de rede. Validação de formato/tamanho coberta por testes; não houve teste automatizado de seleção de arquivo pela UI nesta missão.
- Seletores de área/documento derivados do catálogo. O conteúdo é um exemplo editorial genérico da Aurora, não uma análise metodológica completa de cada documento.
- Prévia de leitura do rascunho, somente leitura, com o mesmo schema/renderizador dos blocos.
- Portal simulado na própria página: visão executiva fictícia, seletor compacto das 12 áreas e cronograma de exemplo. Áreas/documentos não liberados permanecem sem rascunhos.
- Fluxo em memória: salvar → revisão simulada → aprovação simulada → liberação explícita de uma cópia. Modificações posteriores do rascunho não alteram essa cópia. Ocultar o documento remove sua leitura sem apagar a cópia.

## Arquivos novos

src/Components/strategic-editor/DynamicStrategicEditor.tsx
src/Components/strategic-editor/StrategicEditorPrototype.tsx
src/Components/strategic-editor/schema.tsx
src/Components/strategic-editor/demo.ts
src/Components/strategic-editor/editor.css
src/lib/strategic-editor/prototype.ts
src/app/previa/editor-estrategico/page.tsx
public/editor-demo/aurora-map.svg
scripts/security/strategic-editor-prototype.test.mjs
Este documento.

Arquivos existentes alterados: somente package.json e package-lock.json para as três dependências oficiais.

## Validação

- TypeScript --noEmit: aprovado.
- Lint dos arquivos novos: zero erros e zero avisos.
- Lint geral: zero erros, 20 avisos remanescentes do código existente.
- Regressão: 249 testes aprovados, zero falhas e zero ignorados. Inclui 10 testes novos de cópias isoladas, fluxo explícito, edição posterior, ocultação, validação de gráficos/imagens e gate de produção.
- Browser local: digitação em parágrafo, negrito por teclado, edição de célula de tabela, inserção, alteração das séries do gráfico, reordenação, leitura com contenteditable=false, liberação, isolamento de rascunho e ocultação conferidos. Cancelamento de troca com Escape conferido.
- Responsividade: celular e tablet sem overflow horizontal do documento; tabelas têm rolagem interna. Viewport temporário restaurado.
- Console local sem erros registrados.
- Auditoria npm --omit=dev: zero vulnerabilidades de execução. Auditoria geral reportou cinco ocorrências altas na cadeia antiga de eslint-config-next/braces; não afetam os novos pacotes BlockNote. Não foi aplicada sugestão de downgrade/force fora do escopo.
- Build local de produção concluído com sucesso. Gate HTTP local em VERCEL_ENV=production, mesmo com flag=true: 404. O resultado do build remoto/deployment é confirmado na entrega final; não considerar concluído antes de READY.

## Próxima integração (não realizada)

Validar experiência com o usuário. Depois, planejar um formato versionado JSON dos blocos que preserve os textos e publishedContent existentes, transformação segura para leitura, sanitização/validação no servidor, armazenamento de imagens com políticas de acesso e projeção publicada por cliente. Reutilizar os guards/autorização/concorrência e o cronograma existentes. Definir limites globais de mídia, recuperação de rascunhos e migração gradual com reversibilidade antes de conectar a dados reais. Não basta remover o textarea e gravar JSON diretamente nos campos atuais.

Produção de referência ao iniciar a publicação desta missão: dpl_9BqbzpP5TAff2ZECdy558gxptLcK, commit 9966c0f0311642ae5482b44fad283194027fa937. O domínio app.rotevo.com.br não deve ser atualizado.

Comparação técnica adicional: documentação oficial do Lexical (https://lexical.dev/docs/intro) informa que layout, toolbars, menus e armazenamento são responsabilidade da aplicação. A documentação Tiptap (https://tiptap.dev/docs/editor/getting-started/overview) foi consultada; a opção permanece preservada nos componentes existentes. A preferência por BlockNote é de implementação desta experiência isolada, não uma decisão de migração de todos os editores.
