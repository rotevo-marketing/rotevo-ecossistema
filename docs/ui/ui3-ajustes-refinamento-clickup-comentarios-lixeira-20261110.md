# UI 3.0 | Refinamento visual e colaboração, decisões dos prints de 10/11/2026

**Branch de trabalho:** `feat/ui3-ajustes-visuais-20261110`. **Estado:** implementação visual incremental em branch, sem merge, sem migrações hospedadas, sem dados reais modificados. **Publicação:** NO-GO.

## Referências de revisão visual

O responsável forneceu 13 capturas da Rotevo e do ClickUp (lista/Lixeira, detalhe em duas colunas, popover de prioridade, painel de comentários, cartões Kanban, filtros de pessoas e datas, calendário e tabela de Conteúdo). **Usar apenas como referência de experiência, nunca copiar marca ou código proprietário.**

## Ajustes visuais pedidos e parcialmente implementados

1. **Tarefas / Kanban:** reduzir peso dos cards, bordas, sombras, texto e menus. Os chips de prioridade devem usar bandeirinhas coloridas de traço fino em vez de tarjas pesadas. Conservar estados existentes, prazos e edição inline. Card continua abrindo detalhes.
2. **Tarefas / Detalhes:** aproximar do ClickUp em proporção tipográfica, propriedades discretas de duas colunas, input de título sem caixa persistente, e opções de status/priority como menu compacto. Preservar operações já implementadas.
3. **Conteúdo / Modal:** mesma estrutura de janela de Tarefas: cabeçalho fixo com contexto do projeto e X no canto superior direito, duas colunas de scroll independente, metadados e status compactos, coluna de atualizações separada. Manter diferenças editoriais e histórico formal.
4. **Conteúdo / Lista:** mesma gramática da Central de Tarefas: cabeçalho compacto, grupos por cliente, divisores finos, tabela densa, ações em menu de três pontos, tipografia e status discretos. Não confundir prioridade e situação.
5. **Tarefas / Lixeira:** quando tarefas estão selecionadas, a barra exibe quantidade e *Restaurar*; o antigo texto *Limpar* significava somente limpar a **seleção** e foi renomeado **Desmarcar** para evitar confusão.

## Comunicação bidirecional (REQUISITO FUNCIONAL PENDENTE)

A coluna direita das janelas de Tarefa e Conteúdo deve ter **histórico de mensagens real e persistente**, com campo de comentário e uma seta de envio. **Sem áudio, anexos, microfone, posts ou email.** Tanto o estrategista/equipe autorizada quanto o cliente autorizado podem enviar e ler; isso depende de autorização real no servidor, não somente de ocultar botões.

Requisitos técnicos antes da ativação:
- Tabela de mensagens distinta de `editorial_approvals`, `editorial_idea_approvals` e de `activityLog`; mensagens são conversa, não decisões formais nem logs automáticos.
- Cada mensagem preserva `project_id`, `entity_type` (`task`/`content`), `entity_id`, `content_version` para Conteúdo, `author_id`, corpo e hora do servidor, ID imutável.
- Cliente só enxerga e comenta tarefas com `visibleToClient=true` e conteúdos compartilhados/ativos, em módulos permitidos e projetos do seu `client_id`; nunca acessa outro cliente, conteúdo arquivado, conteúdo na Lixeira ou um item não compartilhado.
- Estrategista e equipe precisam de permissão efetiva para o projeto e para tarefas/conteúdo. Não assumir autorização a partir do papel React.
- Escrita deve passar por RPC/API transacional validada, com limite de tamanho e proteção contra injeção, duplicação, contenção, spoofing de autoria e concorrência. RLS explícita para leitura, sem INSERT/UPDATE/DELETE genérico pelo cliente.
- Histórico cronológico com autoria/data e indicação de falha. Formulário fica visível como **habilitado somente após teste de persistência no ambiente ativo**, nunca pseudo-chat. Envio em Enter com Shift+Enter para quebra de linha é opcional.
- Mensagens não devem alterar status, versão ou aprovação, nem sobrescrever documentos ou conteúdo do projeto.
- Testar cenários positivo/negativo com dois clientes, equipe sem permissão, item oculto, projeto cruzado, conteúdos arquivados, troca de versão, sessões vencidas e concorrência. Evitar dados reais.

## Esvaziar Lixeira (REQUISITO DE GOVERNANÇA PENDENTE)

**Não** reinterpretar botão **Desmarcar** como exclusão. **Esvaziar Lixeira** será uma ação separada, destrutiva, jamais acoplada à seleção sem confirmação.

Critérios de GO obrigatórios:
1. Backup recente do banco e Storage preservados **fora** do GitHub, com restauração real em ambiente isolado; política explícita de retenção e aprovação de quem pode purgar.
2. Validação dos registros relacionados e dos vínculos: aprovações, histórico, comentários, tarefas vinculadas, campanhas, arquivos e auditoria. Não apagar registros de outro projeto/cliente ou cascatar silenciosamente.
3. Janela de confirmação com contagem, escopo e aviso de irreversibilidade; confirmação reforçada e erro parcial rastreável.
4. Exclusão transacional autoritativa no backend, com auditoria administrativa mínima e testes de rollback, cross-tenant e concorrência.
5. Verificar implicações legais/contratuais de retenção e pedidos de eliminação de dados. Não eliminar histórico de aprovação sem decisão explícita.

**Estado de segurança em 10/11/2026:** o relatório de release confirma recuperação isolada de bytes do Storage, mas backup completo do PostgreSQL e ensaio de restauração do banco permanecem pendentes. **Portanto, nenhum esvaziamento irreversível está autorizado ou implementado neste lote.**

## Critérios de aceite

- Revisão visual desktop 1440/1024 e mobile 430/390/320, com teclado, foco/ESC, contraste e acessibilidade WCAG 2.2.
- Manter calendário mensal aprovado e todos os estados editoriais existentes.
- Validar seletor de canal, Lista, ações Arquivar/Lixeira/Restaurar, detalhes e histórico de aprovações com dados **sintéticos**.
- Criar uma prévia isolada somente após CI verde da revisão; nunca promover para `app.rotevo.com.br` sem os gates do runbook.

## Decisões adicionais aprovadas pelo responsável (10/11/2026, revisão de 16h)

- **Tarefas, Kanban:** refinamento atual expressamente aprovado. Não redesenhar.
- **Tarefas, popovers:** situação, prioridade e responsável expressamente aprovados, tanto na experiência de edição já apresentada quanto no Kanban. Preservar.
- **Tarefas, detalhes:** duas colunas atuais aprovadas. Adicionar botão **Excluir (Lixeira)** na janela, junto de Arquivar, mantendo restauração e sem exclusão física. O botão foi implementado no commit que acompanha esta decisão.
- **Tarefas, cliente:** não pode editar situação, responsabilidade, prioridade, data ou outros campos operacionais. Apenas visualizar tarefas explicitamente compartilhadas, registrar aprovação ou solicitação de ajustes e participar de conversa bidirecional sobre a tarefa. Aprovação do cliente é um evento separado do status operacional, atualizado pelo estrategista.
- **Conteúdo, lista:** usar efetivamente o **mesmo layout, hierarquia, densidade e componentes da Central de Tarefas**. Colunas na ordem exata: Conteúdo, Projeto, Responsável, Situação, Prioridade e Prazo; seleção e ações contextuais alinhadas às de Tarefas. Projeto deve mostrar **somente foto real do cliente** (sem nome do projeto/estratégia); Responsável deve mostrar **somente foto real do usuário** (sem texto), com seletor real de usuário da equipe. Não usar avatar artificial baseado em iniciais como prova de conclusão quando há foto cadastrada. Ações podem ocupar menu de três pontos, sem coluna verbal extra. Atribuição deve guardar user ID e nome apenas para compatibilidade, não texto livre como autoridade.
- **Conteúdo, detalhes:** exatamente mesma estrutura e interação visual de janela de detalhes de Tarefas: propriedades Situação, Responsável, Prioridade e Prazo no mesmo arranjo, X no cabeçalho fixo, coluna de conversa à direita, histórico formal de aprovação preservado separadamente.
- **Calendário mensal:** **aprovado como está em densidade e quantidade de texto**. Não acrescentar formato, tema, objetivo ou outros campos nos cartões dos dias. Manter cores por situação/aprovação e garantir coerência de cor em mudança de decisão; verificar sem aumentar os cartões.
- **Conteúdo, cliente:** cliente deve poder aprovar ou solicitar ajustes em versões compartilhadas, comentar e ler respostas. Evitar alteração direta de status editorial pelo cliente; situações operacionais permanecem controladas pelo estrategista. Os mesmos status devem ser preservados. Histórico de decisão continua formal e distinto do chat.
- **Portal do Cliente:** revisão e adaptação visual obrigatórias para coerência com o painel do estrategista; verificar leitura do dado compartilhado, decisão, resposta e sincronização entre as duas áreas. Não presumir que o cliente precisa de uma central editável igual à do estrategista.
- **Lixeira de Tarefas:** barra selecionada deverá ter **Restaurar**, **Excluir definitivamente** e **Desmarcar** (este último apenas limpa seleção). A exclusão permanente **permanece bloqueada** até backup restaurável e contrato seguro de retenção/auditoria, não confundir aceite de UX com autorização para apagar banco.
- **Prioridade de execução:** concluir experiência de Conteúdo e aprovação de cliente antes dos refinamentos restantes, preservando todos os avanços já aprovados. Não promover a produção sem GO do release.

**Atenção à governança:** o fluxo de aprovar tarefa é **novo** e não equivale a alterar `ExecutionItem.status`. A conversa bidirecional precisa ser implementada com persistência, autenticação e controle de acesso por cliente. Enquanto não existir, não declarar pronta.
