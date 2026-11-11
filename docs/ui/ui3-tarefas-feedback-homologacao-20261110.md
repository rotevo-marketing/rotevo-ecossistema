# Rotevo UI 3.0 | Feedback de homologação visual, 10/11/2026

**Origem:** avaliações e três capturas enviadas pelo usuário sobre a prévia Vercel da branch `feat/ui3-ajustes-visuais-20261110`. A prévia inicial estava em `b3e390b8`; as correções seguintes estão apenas na branch, sem novo deployment.

## Aprovado pelo usuário
- O conjunto de mudanças em Clientes e Onboarding foi aceito, e a Central de Tarefas ficou muito melhor visualmente.
- Direção visual Monday para o quadro, ClickUp para detalhes de tarefa.
- Organização padrão por cliente, com foto/logomarca; projeto e lista única permanecem alternativas.

## Feedback específico e correção
1. **Comentários:** coluna direita é somente espaço reservado. A conversa futura será bidirecional, estrategista e cliente autorizado podem comentar e responder. Não habilitar envio sem autorização, persistência, controle de visibilidade e auditoria.
2. **Criação em outro cliente:** criação concluída pode ficar oculta pela ordenação por urgência, página e filtros. Correção: após sucesso, reiniciar filtros, concentrar-se na nova tarefa por pesquisa, abrir visão Lista e grupo cliente. Não confirmar que dados reais foram modificados sem prova no banco.
3. **Ações da tarefa:** mostrar Arquivar nas linhas e detalhes, Restaurar na aba Arquivo, com confirmação. A ação preserva a tarefa no JSON do projeto. Exclusão irreversível suspensa até haver backup restaurável e política de lixeira.
4. **Colunas:** adicionar divisórias verticais ao cabeçalho. Coluna Projeto mostra só avatar/logomarca com link acessível, nome completo em tooltip.
5. **Kanban:** eliminar duplicidade da prioridade e trocar etiquetas sólidas por chips sutis, editáveis.
6. **Minha visão do dia:** botão Atrasadas com destaque laranja e estado selecionado visível.

## Segurança e escopo
- Alterações apenas em branch visual e em código de interface. Sem publicação de produção, sem migrations e sem escrever dados reais durante o desenvolvimento.
- Auto-deploy Vercel para a branch permanece explicitamente desativado.
- Última prévia publicada continua sendo a versão anterior às correções. Nova prévia apenas após consolidar a rodada.

## Evidências técnicas
- Build, TypeScript e testes estáticos aprovados no commit `538039fc` antes da ampliação do teste sintético.
- Teste integrado com navegador/Supabase local: criação de uma tarefa em segundo cliente e sua exibição imediata foi observada no log do ensaio de 10/11/2026; a primeira execução parou por seletor Playwright ambíguo, não por erro da criação.
- Teste integrado de arquivamento/restauração foi adicionado a `scripts/security/ui3-portal-browser-local.mjs`; conferir o resultado final do workflow mais recente antes de aceitar esse comportamento.

**Pendente:** avaliação visual humana da prévia revisada, com 1440, 1024, 768, 430, 390, 375 e 320px; validação de menus, chips e edição com tarefas sintéticas.
