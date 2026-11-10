# Rotevo UI 3.0 | Decisão visual sobre a tarefa detalhada (10/11/2026)

Status: **proposta de UX aprovada como direção de trabalho, não implementação funcional**. Base: capturas fornecidas em conversa em 10/11/2026 da gaveta atual da Rotevo e janela dividida do ClickUp; referência de atualizações do Monday.

## Problema atual
A gaveta da Rotevo de 540px mostra título, descrição, prazo, checklist, dependências e vínculos, com edição parcial já existente. No entanto, status, prioridade e responsável aparecem no detalhe como cartões de leitura, exigindo retorno à tabela para algumas mudanças. O histórico atual é um resumo de atividade, não uma thread persistente de comentários compartilhados.

## Direção de interface
- Janela central ampla (aprox. 85-90% da largura em desktop, máxima responsiva), com título e nome do cliente/projeto no cabeçalho.
- Coluna esquerda: título editável; status, responsável, prioridade e prazo editáveis; descrição; checklist; materiais; links; dependências e comandos de salvamento claros. Reutilizar rotas protegidas e auditoria atuais sem alterações silenciosas.
- Coluna direita: atualizações/comentários em conversa cronológica e aba independente de histórico; autor/data, estado de envio, menções e anexos somente quando suportados por backend seguro.
- No mobile: empilhar conteúdos ou alternar abas, mantendo foco e navegação acessível.
- Papéis: estrategista/equipe autorizados editam campos de tarefa; clientes visualizam exclusivamente tarefas explicitamente compartilhadas, podendo comentar quando existir autorização específica. Não expor informações internas.
- Sem pseudo-chat: não implantar componente que pareça salvar mensagens antes de possuir persistência, RLS, acesso por cliente e política de notificação definidos.
- Em caso de edição concorrente: apresentar conflito e permitir revisar antes de substituir a versão de outro usuário.

## Sequenciamento
1. Manter nesta rodada apenas a tabela e as células coloridas Status/Prioridade, com persistência já existente.
2. Construir posteriormente o novo modal de detalhe como etapa visual própria, reaproveitando os campos seguros.
3. Planejar e homologar comentários persistentes/arquivos/notificações separadamente, antes de conceder acesso de escrita a clientes.

**Restrição:** não gerar Vercel preview automaticamente, não alterar banco nem dados reais, não tocar no trabalho de backup/release do Work.
