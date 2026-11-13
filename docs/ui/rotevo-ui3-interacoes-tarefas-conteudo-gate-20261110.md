# Rotevo UI 3.0 | Gate de interações em tarefas e conteúdo (10/11/2026)

**Classificação:** auditoria de código, plano de implementação e critérios de aceite. **Não é implementação concluída, SQL executável, migration, autorização de produção ou evidência de testes autenticados hospedados.**

## Evidência verificada

- `src/Components/admin/CentralTarefas.tsx`: lista e Kanban, detalhe e edição de tarefas por `/api/admin/project/update`, armazenamento no `executionTimeline` do JSON de projeto, associação a conteúdo editorial. Não foram identificados no componente consultado thread, persistência de mensagens ou operações de envio/leitura de mensagens por tarefa. O campo `approvalRows.comment` refere-se a comentários de **decisões editoriais**, não a um chat de tarefa.
- `src/Components/cliente/ClientContent.tsx` e `src/Components/cliente/EditorialDecision.tsx`: calendário, listas, aprovações e comentários associados à decisão por versão via `rotevo_editorial_decide`. Isso **não** equivale a conversa contínua entre cliente e estrategista.
- Não foi encontrado na branch candidata o arquivo de proposta `docs/security/sql/ui3-project-collaboration-PROPOSAL-ONLY.sql`. Não deduzir que exista uma tabela de colaboração criada; a auditoria de `public` consultada anteriormente listou 14 tabelas, sem tabela dedicada de comentários.
- Antes deste documento, o commit `f0a2eb8` teve GitHub Actions `42914822834` concluído **SUCCESS** nos seis jobs observados (build, TypeScript, segurança etc.). Essa evidência não cobre o novo fluxo de conversa.
- Estado do PR #5: aberto, draft, mergeable=true. **Não publicou UI3.**

**Conclusão funcional:** tarefas/calendário e comentários de aprovação existem no candidato, mas a **conversa bidirecional persistente por tarefa/conteúdo não está comprovadamente implementada**. Não rotular o chat como disponível para clientes nem dar GO condicionado a ele como se já estivesse pronto.

## Escopo mínimo do fluxo pretendido

1. Estrategista abre uma tarefa ou peça de conteúdo de um projeto; o cliente autorizado vê exclusivamente a versão compartilhada e sua discussão vinculada.
2. O cliente pode criar e ler mensagens na discussão vinculada, sem editar tarefas internas, mudar responsáveis, ver notas internas ou aprovar versões por efeito colateral.
3. Estrategista e equipe designada respondem; identidade e horário são registrados pelo servidor. Aprovação e solicitação de ajustes permanecem ações **separadas** das mensagens.
4. Quando o projeto/tarefa/conteúdo não existir, estiver oculto, o módulo estiver desabilitado, a identidade estiver inativa ou faltar vínculo/permissão, retornar negação sem revelar existência de itens de outro cliente.
5. Não duplicar mensagens em `planning_projects.data`: a exposição direta do JSON é um gate de segurança prévio e esse campo não deve tornar-se canal de chat.

## Contrato de dados sugerido (projeto para análise, não DDL)

- Entidade de discussão com `id`, `project_id`, `resource_type` (`task` ou `content`), `resource_id`, `created_at` e controle de visibilidade.
- Entidade de mensagem com `id`, `thread_id`, `author_user_id`, `body`, `created_at`, estado de edição/supressão auditável; índices por thread e tempo.
- Ao usar IDs de tarefas/conteúdo embutidos em JSON, validar a existência real e visibilidade do recurso via código de servidor autorizado, não só FK de projeto. A discussão deve ficar indisponível quando o recurso original for removido/ocultado.
- Mensagens de cliente visíveis apenas à conta vinculada ao `client_id` do projeto. Equipe com acesso somente se ativa, atribuída ao projeto e com permissão apropriada. Administrador conforme política existente.
- Para conteúdo, preservar vínculo de versões quando pertinente para não misturar comentários de versões publicadas e rascunhos. Definir o comportamento de arquivamento antes de implementar.
- Limites de tamanho, paginação, taxa de envio, sanitização de saída, timestamps no servidor e nenhuma URL privada/arquivo sem autorização específica.

## Fronteiras de segurança

- RLS para `SELECT/INSERT` de mensagens vinculada a identidade e tenant; **nenhum** `TO authenticated` isolado como condição suficiente. `UPDATE/DELETE` devem ser negados por padrão até política de auditoria de edições.
- APIs servidoras devem validar JWT, troca inicial de senha, projeto, `client_workspaces` e módulo habilitado, atribuições da Equipe, visibilidade de tarefa/conteúdo e autorização em **todas** as operações.
- Evitar exposição de `service_role`, `planning_projects.data` e dados de outros clientes ao navegador; não resolver políticas RLS com `SECURITY DEFINER` indiscriminado.
- Não criar perfil `staff` no banco hospedado apenas para passar nos testes. Conta de teste somente com aprovação administrativa específica.
- Nenhuma mutation hospedada até a revisão de migrações, continuação da estratégia de contingência e aprovação específica de banco.

## Matriz mínima de testes antes do release de conversas

| Teste | Esperado |
| --- | --- |
| Cliente A lê e cria mensagem em tarefa compartilhada do próprio projeto | Sucesso |
| Cliente A tenta ler/criar em projeto do cliente B, inclusive por ID direto | Negado e sem vazamento |
| Tarefa interna ou conteúdo não publicado | Mensagens não projetadas ao cliente |
| Cliente desabilitado, senha inicial pendente, workspace ausente/módulo inativo | Negado |
| Colaborador sem atribuição ou sem permissão / conta inativa | Negado |
| Mensagem longa, HTML/script, URL privada e spam | Validada/escapada/limitada |
| Duas mensagens simultâneas, ordenação, paginação e recarga | Persistência sem perda ou duplicação |
| Aprovação editorial com comentário | Mantida sem equivaler a mensagem de thread |
| Desktop/mobile e leitor de tela | Navegação/foco/identificação de autor/horário usáveis |

## Decisão de escopo para release

- **Caminho A: UI3 parcial sem conversas**, se o responsável aceitar separar essa funcionalidade, com rótulos fiéis ao que realmente funciona e sem apresentar chat fictício. Mesmo assim, segurança G2/RPC, identidade da Equipe, testes/contingência e autorização de deploy continuam gates.
- **Caminho B: UI3 com conversas**, somente após schema e API de discussão, UI admin/cliente, autorização, testes reais com duas contas sintéticas e revisão de segurança.

**Situação nesta rodada: apenas diagnóstico e plano. Nenhum chat foi implantado, nenhuma migration ou política foi executada, nenhum registro foi apagado.**
