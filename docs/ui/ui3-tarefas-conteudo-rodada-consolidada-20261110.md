# Rotevo UI 3.0 | Implementação consolidada Tarefas + Conteúdo

**Data:** 10/11/2026  
**Branch isolada:** `feat/ui3-ajustes-visuais-20261110`  
**Status:** implementado em código, testes automáticos de interface/TypeScript/build em execução e homologação visual humana pendente. **Não publicado em produção.**

## Decisões de Conteúdo incorporadas

1. **Calendário preservado**: mesmo grid mensal aprovado, com abas dinâmicas dos canais presentes no escopo selecionado. Canais não utilizados não aparecem. Ao salvar primeiro conteúdo de canal novo (ex.: YouTube), selecionar automaticamente projeto, canal e mês do item.
2. **Criação e edição**: modal central responsivo de até 1080 px com rodapé de ações, preservando campos, validações, conflito de edição e rota protegida `/api/admin/project/update`.
3. **Lista**: tabela com agrupamento por cliente e colunas Conteúdo, Projeto, Responsável, Situação, Prioridade e Prazo. Responsável, Situação e Prioridade editáveis na tabela administrativa por mecanismos de gravação protegidos; no cliente apenas leitura.
4. **Detalhes**: modal central dividido em duas colunas no desktop. Área esquerda para direção estratégica, legenda, materiais e metadados; direita para aprovações, observações e histórico. No mobile as colunas são empilhadas.
5. **Aprovações formais**: preservar `EditorialDecision`, `EditorialIdeaDecision`, `editorial_approvals` e `editorial_idea_approvals`. A opção operacional de status não falsifica decisão do cliente; rótulos de aprovação formal exigem o fluxo autorizado.
6. **Campos opcionais novos**: `editorialCalendar[].owner` (nome exibido, até 120 caracteres) e `editorialCalendar[].priority` (low, normal, high, urgent). Conteúdos legados têm fallback sem exigir migração. A atribuição por nome **não** cria identidade de equipe nem notificações de atribuição.
7. **Conversas**: interface identifica o espaço onde futuramente ocorrerão mensagens bidirecionais e distingue comentários de aprovação. **Chat persistente ainda não está habilitado** por depender de persistência própria, RLS, autenticação e auditoria. Nenhum campo falso aparenta enviar mensagens.

## Decisões de Tarefas incorporadas

1. Checkboxes individuais e seleção total das tarefas da página (sem selecionar silenciosamente outras páginas).
2. Barra contextual com total de selecionadas, Arquivar e Excluir (Lixeira), distinguindo claramente as operações e permitindo limpar seleção.
3. Menu individual de ações na linha, incluindo Arquivar/Restaurar e Excluir (Lixeira)/Restaurar.
4. Operações em lote agrupadas por projeto e enviadas pela API autorizada, sem misturar os JSONs de clientes distintos. Em falha parcial, interromper lote, preservar seleções não concluídas e apresentar erro.
5. **Exclusão lógica** com `deletedAt` e aba **Lixeira**, reversível. Preserva conteúdo, status, histórico, dependências e vínculo do projeto, não executa exclusão física.
6. Tarefas excluídas não aparecem em listas operacionais, Portal do Cliente, contadores Hoje/Atrasadas ou no total ativo; não entram na seleção operacional automática.
7. Arquivo permanece distinto da Lixeira; exclusão permanente não foi implementada por ausência de backup restaurável homologado e política de retenção.

## Limites e segurança

- Nenhuma migration, alteração de RLS ou banco hospedado, merge ou deployment de produção faz parte desta rodada.
- A UI trabalha com as contas e projetos existentes, mas testes de mutação somente em Supabase local sintético.
- Backup de banco, restauração de contingência, SQL hospedado e aceite de release permanecem controlados pelo runbook de UI 3.0.
- Prévia Vercel consolidada da rodada somente após validação da integração e autorização de avaliação visual.
- Acessibilidade ainda exige verificação manual de leitura assistiva, zoom e mobile além das regressões automáticas.

## Testes adicionados

- `scripts/security/ui3-editorial-ux-round.test.mjs`
- `scripts/security/ui3-task-bulk-trash.test.mjs`
- `scripts/security/ui3-portal-browser-local.mjs`: segundo projeto sintético com teste de criação de tarefa, Arquivo/Lixeira/Restaurar, criação editorial YouTube, descoberta do canal e abertura do detalhe.
- Workflow de regressão UI3 existente executa TypeScript, build e testes estáticos e dispara o laboratório integrado quando os arquivos relevantes mudam.

## Próximo aceite

Conferir ao menos desktop 1440/1024 e mobile 430/390/320; menus de ação, Lixeira, barra de seleção e modais de Conteúdo; ausência de overflow inesperado; navegação por teclado e recuperação de foco. Usar apenas dados sintéticos para ensaios de escrita.
