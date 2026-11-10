# Rotevo UI 3.0 | Decisões acumuladas para próxima rodada de Tarefas

**Data:** 10/11/2026  
**Estado:** especificação registrada; **não executar agora**. Aguardar os próximos comandos do responsável e implementar os pedidos em uma única rodada consolidada, aproveitando testes já aprovados.
**Branch:** `feat/ui3-ajustes-visuais-20261110`.

## Decisões confirmadas

1. **Seleção por tarefa:** manter um checkbox discreto antes do título de cada linha e permitir seleção de várias tarefas, inclusive selecionar as tarefas exibidas de um grupo/página, de maneira semelhante ao Monday.
2. **Barra contextual de ações em lote:** aparecer somente quando houver uma ou mais tarefas selecionadas. Exibir contagem e ação de limpar seleção. Ações **Arquivar** e **Excluir** precisam ficar separadas e visualmente distintas. Não copiar todos os recursos do Monday, somente os adequados à operação da Rotevo.
3. **Ação individual:** menu de três pontos por tarefa, com opções distintas **Arquivar** e **Excluir**, observando permissão. Preservar a edição ao clicar no título.
4. **Arquivar:** ocultar da lista principal mantendo todos os dados, status, histórico e vínculo ao projeto, permitindo **Restaurar** na aba Arquivo. O arquivamento deve ser reversível inclusive para tarefas pendentes, sem mudar sua situação original.
5. **Excluir:** desenvolver **Lixeira com exclusão lógica**, reversível, sujeita a permissão e confirmação. **Não habilitar exclusão permanente enquanto não existir recuperação segura, backup restaurável e política de retenção definida.** A inclusão do comando visual não pode apagar dados reais nem fazer exclusão silenciosa.
6. **Operação em lote:** assegurar isolamento por cliente/projeto, confirmação e retorno de erros parciais. Não assumir que todas as seleções pertencem ao mesmo projeto. Preservar autorização do backend e registrar auditoria conforme infraestrutura existente.
7. **Visual:** manter a identidade Rotevo e a experiência de seleção inspirada no Monday, com controle de foco/teclado e navegação mobile, sem adicionar ações não solicitadas.

## Restrições de execução

- **O usuário dará comandos adicionais antes da implementação.** Esperar e incorporar tudo no mesmo lote de mudanças, evitando rodadas fragmentadas.
- Não publicar produção, executar migrations ou provocar novas prévias automaticamente.
- Não criar operações destrutivas ou contornar as permissões atuais.
- A conversa bidirecional cliente–estrategista, em área de atualizações, permanece especificada mas não habilitada até existir armazenamento e controle de acesso seguros.
- As alterações já aprovadas na Central de Tarefas devem ser preservadas; evitar reescrever estrutura e testes sem necessidade.

## Critérios para aceitar a próxima rodada

- Seleção individual, múltipla e limpeza de seleção com toolbar correta.
- Arquivar e restaurar tanto individualmente quanto em lote, em ambiente isolado.
- Excluir move para Lixeira e permite restaurar **somente após** aprovação de modelo de dados, política de retenção e verificação isolada de segurança.
- Regressões, TypeScript, build e validação visual responsiva.
