# Rotevo UI 3.0 | Conteúdo: decisões acumuladas para próxima rodada consolidada

**Data:** 10/11/2026  
**Estado:** especificação registrada. **Aguardar os próximos comandos do responsável antes de implementar**, para executar Tarefas + Conteúdo em lote consolidado.  
**Branch:** `feat/ui3-ajustes-visuais-20261110`. Sem nova prévia ou publicação de produção automática.

## Referências fornecidas
- Captura 1: Central de Conteúdo atual, calendário mensal e filtros por canal.
- Captura 2: formulário atual "Novo conteúdo" em gaveta lateral.
- Captura 3: detalhe atual de conteúdo aberto no calendário, também em gaveta lateral.
- Padrões já aprovados no projeto: lista densa inspirada no Monday e janela ampla em duas colunas, com edição inline, inspirada no ClickUp/Rotevo.
- O usuário aprovou a aparência geral do calendário de Conteúdo, inclusive filtros por canal, mas pediu alterações de comportamento e de janelas.

## Requisitos registrados

### 1. Canais e abas dinâmicas
- Preservar "Todos os canais" e abas específicas dos canais pertinentes aos conteúdos do(s) projeto(s) exibido(s). Não mostrar canais vazios sem uso relevante para o cliente.
- Ao criar e salvar conteúdo em canal novo (ex.: YouTube), acrescentar automaticamente a aba correspondente ao calendário desse projeto, e facilitar localizar o conteúdo criado.
- Quando o filtro for "Todos os projetos", exibir canais com conteúdo de algum projeto do escopo; ao selecionar um cliente/projeto, mostrar apenas os canais usados por esse projeto/cliente.
- Não criar abas só pela seleção temporária de canal no formulário antes de salvar; evitar abas fantasma em conteúdos cancelados ou com erro de gravação.
- Preferência visual: canais com ícone discreto e nome; eventual uso de cor da rede somente em detalhes discretos e com contraste, sem poluir a interface.

### 2. Criação de conteúdo
- Substituir gaveta lateral atual por **modal central amplo**, semelhante aos modais já aprovados de novo cliente e tarefas, permitindo distribuir campos por seções e colunas sem perda de hierarquia.
- Preservar formulário, validações, bloqueio de perdas não salvas, verificação de versão/conflito e rota autorizada `/api/admin/project/update`.
- Após criar, localizar conteúdo no calendário/lista e selecionar automaticamente o canal e mês pertinentes.

### 3. Visualização Lista de Conteúdos
- Refazer a vista `Lista` no padrão de tabela utilizado em Tarefas, em vez de lista simples.
- Colunas essenciais: **Conteúdo, Projeto (avatar/foto do cliente com nome completo acessível), Responsável, Situação, Prioridade e Prazo/Data prevista**.
- Considerar o agrupamento padrão por cliente, como em Tarefas, com pesquisa, filtros, ordenação e colunas compactas. Distinguir claramente a situação editorial da prioridade operacional.
- Ao clicar no título ou evento do calendário, abrir o mesmo detalhe do conteúdo.
- Importante: `EditorialItem` hoje **não contém** propriedades próprias de `responsável` ou `prioridade`; serão necessárias modelagem validada, persistência segura e compatibilidade com conteúdos antigos. Não exibir controles falsamente editáveis nem transformar automaticamente campos da tarefa relacionada em dados editoriais sem decisão explícita.

### 4. Detalhe do conteúdo em duas colunas
- Abrir **modal central largo e responsivo**, não gaveta lateral.
- Coluna esquerda: identificação do cliente/projeto/canal, título, data, status, versão, direcionamento estratégico, legenda, materiais/links, revisões e demais dados realmente cadastrados. Conteúdo acessível e editável conforme papel; cliente poderá consultar o conteúdo que lhe foi compartilhado.
- Coluna direita: histórico de revisão e decisões, com espaço para **conversa bidirecional** entre estrategista/equipe autorizada e cliente autorizado, para solicitações de ajustes e respostas.
- Permitir controle de situação editorial na janela, inclusive o estrategista alterar o status em reunião; o cliente só poderá executar decisões autorizadas de aprovação/solicitação de ajustes.
- **Não habilitar pseudo-chat.** Comentários em thread precisam de persistência por `project_id + content_id + version`, autoria/data, permissões por cliente, histórico e gestão de conflito, respeitando a publicação/visibilidade de cada conteúdo.
- **Aprovações já existem** em `editorial_approvals` e `editorial_idea_approvals`. Não sobrescrever ou substituir silenciosamente o histórico de decisão por uma simples mudança de `status`; planejar um fluxo coerente e auditável.

### 5. Calendário
- Conservar o visual mensal já aprovado (células, itens compactos, mês, navegação).
- O clique em um evento deve abrir o novo modal de detalhe, o mesmo da Lista, sem duplicar implementações inconsistentes.
- Ao abrir pela área de cliente, aplicar o fluxo de aprovação existente, somente aos conteúdos efetivamente compartilhados com aquele cliente.

## Diagnóstico técnico da branch (10/11/2026)
- `src/Components/admin/EditorialManager.tsx`: gerencia criação/edição; hoje usa gaveta `aside` de até 660px; salva editorialCalendar via `/api/admin/project/update`, com `expectedUpdatedAt`; manipula `editorial_approvals` e `editorial_idea_approvals`.
- `src/Components/cliente/EditorialCalendar.tsx`: usado na área administrativa e em outras vistas; hoje gera abas a partir de `items` filtrados por projeto, e possui visualizações Mês e Lista; o detalhe atual abre `aside` de até 600px.
- `src/Components/cliente/ClientContent.tsx`: experiência própria de cliente com status, filtros e decisões; precisa compatibilidade e não deve permitir acesso a conteúdo `visibleToClient !== true`.
- `src/lib/editorial/channels.ts`: catálogo global de canais. O catálogo é opção de criação, não uma ordem para mostrar todos como abas.
- `EditorialItem` atual não traz `priority` ou `ownerUserId`; mudança precisa ser explicitamente versionada e testada.
- Sistema de decisão de cliente possui histórico em entidades próprias, não um chat genérico.

## Sequência recomendada para a implementação em lote
1. Inventariar fluxo de Conteúdo em estratégia e cliente; validar modelo de dados/papéis antes de adicionar novas propriedades.
2. Implementar abas dinâmicas após persistência e novo modal de criação.
3. Refatorar detalhe comum calendário/lista para duas colunas, preservando aprovações e histórico.
4. Refazer a lista estilo Central de Tarefas com campos e edição autorizada.
5. Integrar somente os mecanismos seguros de status e comentários aprovados, distinguindo decisão editorial e mensagens.
6. Reunir as decisões pendentes de Tarefas em `docs/ui/ui3-tarefas-decisoes-pendentes-selecao-lixeira-20261110.md`; implementar e testar tudo em única rodada.
7. Regressões e integração em ambiente sintético, verificações responsivas e teclado, sem criar mais previews até o pacote estar consolidado.

**Restrições:** não alterar documentos estratégicos ou a estrutura em replanejamento, não editar conteúdo de cliente real nos testes, não mudar RLS/esquema de produção sem homologação e backup; não publicar em `app.rotevo.com.br`.
