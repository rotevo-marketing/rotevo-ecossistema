# Rotevo UI 3.0 | Roteiro de aceite visual da Central de Tarefas

**Data:** 10/11/2026  
**Situação:** revisão técnica automatizada aprovada; aceite visual humano pendente  
**Branch:** `feat/ui3-ajustes-visuais-20261110`  
**Finalidade:** validar a experiência visual inspirada em Monday/ClickUp, preservando a identidade Rotevo. Este roteiro não autoriza publicação de produção nem alterações de dados reais.

## Precauções de ambiente
- Abrir somente a URL da **prévia Vercel** entregue com o SHA exato; nunca confundir com `app.rotevo.com.br`.
- A prévia tem proteção de acesso por autenticação da Vercel. Não compartilhar credenciais.
- A prévia pode acessar integrações existentes; usar apenas navegação e leitura para aceite visual. **Não criar, editar, compartilhar, concluir, arquivar nem excluir tarefas reais.**
- Testes funcionais que exijam escrita serão executados com dados sintéticos ou ambiente isolado, em rodada específica.

## Verificação visual em desktop (1440 / 1024)
1. **Visão geral:** logo Rotevo, espaçamentos e alinhamento, hierarquia e densidade das linhas, sem rolagem horizontal inesperada na janela.
2. **Agrupamento padrão por cliente:** nome, avatar/logo e total de tarefas; expandir e recolher grupos; alternar para por projeto e lista única.
3. **Barra de ferramentas:** Criar tarefa, pesquisa expansível, Pessoa, Filtro, Ordenar, Ocultar, Agrupar, mais opções e Lista/Kanban. Menus devem abrir sem cortar conteúdo.
4. **Tabela:** checkboxes, células de Status e Prioridade preenchidas por cor, avatares, datas e hover. Verificar se as colunas permanecem alinhadas ao alternar visibilidade.
5. **Detalhes:** abertura central, título em edição inline, propriedades Situação/Responsável/Prioridade/Prazo, descrição, links, checklist, pré-requisitos, conteúdo vinculado, histórico, rodapé de ações.
6. **Janela dividida:** rolagem independente das duas colunas, histórico cronológico, área de comentários explicitamente indisponível (não há chat funcional).

## Verificação responsiva (768 / 430 / 390 / 375 / 320)
- Barra de ferramentas quebra de linha com controles alcançáveis.
- Tabela larga pode rolar horizontalmente dentro da região de trabalho, sem cortar botões essenciais.
- A janela de detalhes passa de duas colunas para empilhamento, com rolagem vertical e ações visíveis.
- Menus e popovers de Status, Prioridade e Prazo não ultrapassam a área visual; verificar especialmente viewport de 320px.

## Acessibilidade manual e controles
- Tab e Shift+Tab alcançam os campos e permanecem no modal; Escape fecha o diálogo; foco retorna ao botão de origem.
- Rótulos de caixas de seleção e ações de remover checklist devem identificar o item.
- Zoom de navegador 200%, contraste de campos em foco e leitura com leitor de tela precisam de aceite humano complementar.
- Inspecionar estados vazio, loading e erro somente com dados sintéticos para não modificar clientes reais.

## Limites desta rodada
- **Não estão em escopo:** criação ou armazenamento de comentários de cliente, notificações, alterações de permissões, RLS, banco de dados, documentos estratégicos, publicação em produção.
- O build e os testes de código não substituem a avaliação visual em navegador.
- Registrar problemas por tela/viewport/ação; corrigir na mesma branch de trabalho; gerar nova prévia somente quando necessário e após consolidar correções.

## Critério de aceite
`APROVADO` somente após o responsável revisar as telas desktop e mobile, confirmar a aderência às referências aprovadas e reconhecer os limites de comentários e de segurança pré-produção.
