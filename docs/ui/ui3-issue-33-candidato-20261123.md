# Rotevo UI 3.0 | Candidato da issue #33

Base homologada `4c2341b4bacb115f232e311780e76d3dd244187c`. Branch `fix/ui3-overviews-shared-task-center-20261123`.

## Implementação

- As seções Para hoje, Atrasadas e Aprovações usam a mesma implementação de Lista e Kanban da Central do perfil correspondente. Os escopos de prazo e de acesso são aplicados antes dos filtros de interface. Cada par de seções compartilha a consulta de atribuições.
- Aprovações são leituras de conteúdo editorial pendente, com conciliação por projeto, item, versão e fase. Na visão do estrategista também entram as revisões formais de documentos. Cada item abre o fluxo existente. O modo de aprovação da Central bloqueia ações de tarefa.
- A Agenda usa a lista dos módulos existentes, limitada ao dia em São Paulo. A agenda particular do estrategista segue a consulta autenticada já existente.
- O cadastro inicia com checklist vazio. Os pré-requisitos vêm do projeto escolhido e excluem tarefas canceladas, arquivadas, excluídas e opções cíclicas. O histórico de dependências já salvo é preservado.
- O resumo financeiro, a fila de notificações e os projetos em atenção continuam presentes no painel do estrategista.

## Auditoria de demonstrações

Consulta somente leitura ao Supabase. Os quatro itens de produção correspondentes à fila eram conteúdos `editorialCalendar`, com status `awaiting_client`, versão 01, visibilidade ativa e `deletedAt` preenchido desde 16/11/2026. Não tinham `relatedTaskId`, decisão final ou decisão de ideia associada. Os identificadores iniciam por `1a14e7b5`, `64e0fc5f`, `f68514b6` e `eea7d2ed`. Um quinto item excluído estava em `idea` e já não atendia ao filtro de pendência. A correção verifica as marcas do próprio conteúdo, preservando decisões e conteúdo legítimo.

## Homologação

O workflow isolado inclui o estrategista e dois portais para as novas verificações, além das regressões de cinco portais. Ele prepara um Supabase descartável e sem vínculo, autentica contas sintéticas, verifica compartimentos de acesso e gera capturas desktop/mobile em claro/escuro. Sem migrações de produção, previews ou deployment. A aprovação de publicação depende das evidências da execução.
