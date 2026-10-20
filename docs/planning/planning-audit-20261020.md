# Auditoria do Planejamento Estratégico — Rotevo V2

Data: 20/10/2026. Repositório: rotevo-marketing/rotevo-ecossistema.
Branch: feature/admin-v2-redesign. Base sincronizada: 978577fd34a5bc71c66df4fcf99795da24f846e0.
Workspace: C:\Users\euota\.codex\.chatgpt-projects\g-p-6ac635969808819188835c60f4662d03\rotevo-ecossistema.

## A. Diagnóstico e evidências

A página possui as cinco abas aprovadas: Documentos, Cronograma, Prévia do Cliente, Editor Estratégico e Plano de Execução. Os painéis permanecem montados, com apenas o selecionado visível. Onboarding e Reuniões já tinham sido retirados desta página no trabalho recebido; continuam nos módulos operacionais. A navegação principal existente foi preservada.

Arquitetura atual: planning_projects.data armazena escopo, documentos anteriores, cronograma e execução em JSON. As gravações administrativas utilizam JWT, perfil autorizado, verificações de equipe conforme a flag de implantação e comparação de updated_at. Não foi criada uma segunda aplicação de planejamento.

O BlockNote 0.56.0 continua demonstrativo, isolado de persistência e dos projetos reais. O editor anterior permanece disponível em uma seção expansível, responsável pelos documentos reais e pelo fluxo de revisão/publicação. Não houve migração de conteúdo.

Fontes efetivamente consultadas: comando de auditoria anexado nesta missão, AGENTS.md do repositório, histórico acessível de “Retomar projeto Rotevo”, código e testes relacionados, documentação local do Next.js, orientações React/Deployments do plugin Vercel e os documentos oficiais já consultados nesta continuidade (ECOSSISTEMA DE CRESCIMENTO 2027 e Guia de Identidade Visual da Plataforma). O histórico recuperado é parcial: as respostas antigas disponíveis como marcadores de referência não oferecem o conteúdo integral. As decisões explícitas do comando atual orientaram a auditoria.

## B. Achados e criticidade

| Criticidade | Achado confirmado no código | Tratamento |
|---|---|---|
| Alta | Cronograma usava project.id + updated_at como chave; qualquer gravação remontava o editor e descartava datas/situações pendentes. | Chave estável por projeto e sincronização de dados recebidos somente quando o formulário está limpo. |
| Alta | Alterar escopo podia retirar o documento ativo do editor anterior enquanto havia rascunho não salvo. | Alteração do escopo bloqueada até salvar ou descartar esse rascunho. |
| Alta | Resposta anterior do Portal podia permanecer vinculada visualmente a outra seleção de projeto durante carregamento/alteração da listagem. | Resposta associada à identidade, slug, status e tentativa; validação do ID/status retornado e descarte de respostas obsoletas. |
| Média | Datas do cronograma eram verificadas somente por formato na interface; a API não validava alterações desse campo. | Validação compartilhada de calendário real, IDs únicos, títulos, situação, visibilidade e limite de 15 etapas. Dados históricos inalterados não são revalidados durante gravações de outras seções. |
| Média | Campos ainda editáveis durante gravação permitiam sobrescrever digitação posterior com o retorno do servidor. | Bloqueio dos campos relevantes durante a gravação no cronograma, escopo, execução e editor anterior. |
| Média | Abertura/exclusão de outra entrega podia descartar a entrega em edição. | Confirmação ao substituir e impedimento de exclusão enquanto há edição aberta. |
| Média | Abas não tinham navegação por setas e foco ativo único. | Setas, Home/End, tabIndex móvel e painéis focalizáveis. |
| Média | Blocos fora da seção inicial ficavam precedidos por espaço ampliado por flex-1/padding. | Removida expansão da seção inicial; painel ativo aproxima-se da navegação. |
| Média | Ações da lista comprimiam títulos de entregas no celular. | Lista empilhada no celular e alinhamento em linha a partir de sm. |
| Baixa | Contagem de documentos “visíveis” confundia marcação no escopo com publicação efetiva. | Texto “Marcados para exibição” e orientação sobre publicação. |
| Baixa | Carregamento do editor criava um main adicional com altura de tela inteira; editor incorporado aninhava main. | Contêineres neutros e carregamento compacto. |
| Baixa | BlockNote alertava sobre comportamento do teclado móvel. | Viewport resizes-content restrito às rotas de planejamento e protótipo. |
| Alta, pendência de integração | Documento formatado BlockNote e Visão Executiva completa existem apenas na demonstração. | Preservado o limite aprovado; integração definitiva não implementada. |

Não foi constatado vazamento entre clientes nos testes locais executados. Isso não equivale a uma certificação integral de segurança de toda a plataforma.

## C. Arquivos criados e modificados

Todos os caminhos abaixo são relativos ao workspace completo identificado acima.

Modificados:
- src/app/admin/planejamentos/[clientSlug]/page.tsx — estabilidade, teclado, escopo, callbacks de gravação vinculados ao projeto, textos e espaçamento.
- src/Components/admin/PlanningScheduleEditor.tsx — rascunho preservado, sincronização limpa, campos identificados, validação e bloqueio durante gravação.
- src/Components/admin/EcosystemDocumentEditor.tsx — informação de rascunho ao contêiner, proteção de saída, campos bloqueados durante gravação e orientação para Plano de Execução.
- src/Components/admin/ExecutionTimelineEditor.tsx — proteção de rascunho/substituição/exclusão, campos bloqueados e lista móvel.
- src/Components/cliente/ClientPlanning.tsx — carregamento associado ao projeto, tratamento de falha da sessão/resposta, nova tentativa e ausência de conteúdo anterior durante troca.
- src/Components/strategic-editor/DynamicStrategicEditor.tsx — carregamento compacto sem main aninhado.
- src/Components/strategic-editor/StrategicEditorPrototype.tsx — proteção de rascunho ao sair e remoção de main aninhado.
- src/app/api/admin/project/update/route.ts — validação de alterações do cronograma antes da gravação autorizada e condicionada à versão.
- src/app/previa/editor-estrategico/page.tsx — viewport compatível com teclado móvel.
- scripts/security/admin-project-editor-contract.test.mjs — contrato atualizado para editores persistentes e remoção aprovada das seções redundantes; mantém verificações de identidade.
- scripts/security/only-ecosystem-2027.test.mjs — reuniões verificadas no hub operacional, sem reinseri-las no planejamento.

Criados:
- src/app/admin/planejamentos/layout.tsx — viewport das rotas de planejamento.
- src/hooks/useUnsavedChanges.ts — proteção compartilhada ao recarregar/fechar e ao seguir links, sem armazenamento do conteúdo dos clientes.
- src/lib/planning/stages.ts — contrato e validações puras do cronograma.
- scripts/security/planning-stages.test.mjs — quatro testes de comportamento da validação.
- scripts/security/planning-audit-local-http.mjs — 18 verificações reais de API com dois clientes e dados sintéticos, limpeza em finally e bloqueio de destinos remotos.
- docs/planning/planning-audit-20261020.md — este relatório.

Somente inspecionados, preservados: PlanningLayoutDemo, projectForPresentation, projectForClient, catálogo metodológico, schema/demo/helpers do editor e rotas de leitura/apresentação/status.

## D. Recomendações para avaliação

1. Definir o contrato versionado do documento BlockNote, compatibilidade dos blocos especiais, imagens/anexos e migração gradual do texto anterior. Preservar snapshots de publicação independentes do rascunho.
2. Definir o conteúdo persistente da Visão Executiva e seu fluxo de aprovação/publicação. A introdução do Portal real não contém a síntese fictícia mostrada na demonstração.
3. Confirmar a regra de liberação progressiva: hoje o projeto precisa estar published, o código deve estar selecionado e marcado para exibição e o documento precisa possuir publishedContent/publishedAt. Uma etapa concluída do cronograma não publica documentos.
4. Antes de levar o editor incorporado para produção, decidir sua disponibilidade por ambiente e integração. O bloqueio da URL independente do protótipo em produção não é um bloqueio de todas as incorporações do componente.
5. Avaliar futuramente salvamento automático/recuperação local, histórico de versões, revisão multiusuário e conflitos por documento. Hoje a concorrência é protegida no projeto inteiro por updated_at.
6. Testar documentos extensos com limites de tamanho, tabelas e imagens representativas, aparelhos físicos e leitores de tela. Os testes desta missão não constituem benchmark de desempenho nem certificação WCAG.

## E. Testes desta missão

- TypeScript: node node_modules/typescript/bin/tsc --noEmit — sem erros.
- ESLint: node node_modules/eslint/bin/eslint.js . — zero erros; 19 avisos existentes no conjunto do projeto.
- Regressão: node --env-file=.env.local --test --test-reporter=tap --test-concurrency=1 scripts/security/*.test.mjs scripts/finance/*.test.mjs — 253 aprovados, zero reprovados, zero ignorados na execução final.
- Integração: node --env-file=.env.local scripts/security/planning-audit-local-http.mjs — 18 verificações aprovadas; anonimato, leitura/escrita por cliente, isolamento, snapshot publicado, etapas internas, data inválida/duplicidade e versão concorrente. Exige ROTEVO_LOCAL_API_TESTS=YES_LOCAL_ONLY e ROTEVO_LOCAL_APP_URL=http://127.0.0.1:3000/.
- Build: npm run build — compilação completa validada; resultado final e identificação do deployment são conferidos na entrega.
- Navegador: cinco abas em 375×900, 768×1024 e 1280×900, com um único painel visível e sem transbordamento horizontal da página nos 15 casos. Capturas locais de cada caso.
- Fluxos: situação do cronograma preservada após salvar escopo; rascunhos da execução e BlockNote preservados ao alternar abas; modo parcial da prévia preservado; rascunho do editor anterior impede alteração destrutiva do escopo; revisão/aprovação/liberação simuladas e leitor sem contenteditable=true.
- Portal real local: cliente sintético com três projetos; elaboração sem documentos, publicados A/B com conteúdo próprio, ocultação durante troca, ausência de rascunho/etapa interna e documento sem edição. Responsividade do Portal também conferida no celular.
- Foram encontrados dois testes antigos que exigiam Onboarding/Reuniões nesta página. Foram alinhados à decisão aprovada, sem remover o controle das funcionalidades nos hubs operacionais. A execução final passou integralmente.

Limites: testes autenticados funcionais utilizaram somente Supabase local e identidades sintéticas. Não foram usados usuários/projetos reais como fixture. Não foi provocado todo modo possível de falha de rede, nem testado teclado físico de iOS/Android ou leitor de tela. O aviso de refresh token local observado antes do novo login sintético pertenceu à sessão local antiga; a entrada e os fluxos posteriores funcionaram.

Os logs locais de execução ficam em .vercel/planning-audit-regression.tap, .vercel/planning-audit-lint.txt e .vercel/planning-audit-build.txt, ignorados pelo Git. As capturas e o arquivo de recuperação pré-auditoria ficam na pasta recovery do diretório pai, fora do repositório.

## F. Integrações e preservação

O editor anterior persiste documentos reais na API autorizada. O Portal real lê somente o snapshot publicado, apresentado como texto simples; não transforma HTML arbitrário nem lê o rascunho do BlockNote. A Visão Executiva consolidada e a leitura rica de blocos ainda não estão integradas.

PlanningLayoutDemo e BlockNote utilizam conteúdo fictício claramente identificado. Alterações demonstrativas existem em memória, não são documentos reais e não sobrevivem a recarregamento/encerramento. O aviso de saída reduz perdas acidentais, mas não implementa recuperação persistente ou interceptação de toda navegação imperativa/histórico do navegador.

Não houve alterações de tabelas, políticas, migrations ou dados do Supabase hospedado. Não houve integração definitiva BlockNote, merge na produção, promoção ou alteração do domínio oficial. Os testes mutáveis utilizaram o stack local já disponível; não houve criação/exclusão/inicialização de contêineres de restauração.

## G. Publicação e continuidade

Destino autorizado: somente feature/admin-v2-redesign no GitHub e Preview da Vercel, projeto rotevo-ecossistema, equipe rotevo-marketing. O commit publicado, ID/URL, estado READY e comparação do domínio oficial são fornecidos na entrega final após consulta à plataforma. Não se deve inferir produção a partir de um Preview READY.

Próxima etapa recomendada: especificar e aprovar a integração versionada do BlockNote e da leitura rica no Portal, com publicação explícita e migração gradual, antes de substituir o editor anterior. O protótipo visual e os documentos existentes permanecem preservados.
