# Rotevo UI 2.0 — Sistema Visual e Critérios de Aceite

## Escopo

A camada visual é aplicada aos ambientes administrativos e de clientes. Não modifica schemas, autorização, tabelas, dados, edição de documentos nem o HTML personalizado dos documentos. Toda a implantação permanece numa branch de prévia até aprovação.

## Princípios

1. Superfícies claras, menor contraste estrutural e destaque apenas para o que requer ação.
2. Painéis e tabelas compactos no estilo operacional, sem copiar marcas ou imagens de outras plataformas.
3. Interfaces do estrategista e do cliente compartilham tokens, não necessariamente permissões ou densidade.
4. Os documentos estratégicos mantêm diagramação, tipografia editorial, imagens, tabelas e componentes HTML próprios. A reformulação se limita ao entorno do editor, navegação e barra de ferramentas.
5. Ícones Tabler outline de 18–20 px, geralmente stroke 1.7. Ícones decorativos com aria-hidden; botões de ícone precisam de nome acessível.
6. Status e prioridades continuam semânticos e distintos. Cor nunca substitui rótulo.

## Tokens aprovados para o piloto (proposta a validar em Preview)

| Token | Valor |
|---|---|
| Fundo da aplicação | #F6F7FB |
| Superfície | #FFFFFF |
| Texto principal | #323647 |
| Texto secundário | #687487 |
| Divisória | #E3E6ED |
| Ação/seleção | #6C5CE7 |
| Hover de ação | #5949D1 |
| Seleção suave | #EDEAFF |
| Positivo | #18A874 |
| Atenção | #F2AD43 |

O verde-lima permanece disponível para a marca, mas deixa de ser uma ação operacional dominante. Os status da Central de Tarefas conservam seus códigos de cor funcionais.

## Escopo técnico implementado

- src/app/admin/rotevo-ui2.css: piloto do painel do estrategista.
- src/app/rotevo-ui2-shared.css: tokens e acabamento compartilhado para portal e planejamentos.
- Class rv-ui2 em shells de estrategista, cliente e planejamento.
- Class rv-ui2-module em módulos operacionais selecionados.
- Ícones de menu e recolhimento substituídos por Tabler.
- Compactação de indicadores, cards, tabelas e controles, sem alterar formulários ou API.

## Checklist de revisão na prévia

### Estrategista

- Menu recolhido/expandido, mobile e desktop
- Dashboard: cartões, números, estados vazios e alertas
- Clientes, Projetos, Onboarding, Tarefas, Reuniões, Conteúdo, Campanhas, Equipe e Financeiro
- Tarefas: tabela, Kanban, filtros, status, prioridade, avatares, conclusão e arquivo
- Modais, popovers, menus e validação de campos

### Editor

- Navegação pelos documentos e abas
- Inserir, editar e salvar blocos
- HTML personalizado pequeno e extenso; persistência após recarga
- Visualização de leitura, histórico de versões e publicação
- Comparação visual de documento publicado antes/depois: nenhuma alteração de diagramação

### Cliente

- Visão geral, Planejamento, Tarefas e entregas, Conteúdo, Campanhas, Reuniões, Contratos, Drive e Financeiro
- Testar as áreas permitidas e não permitidas para um mesmo cliente
- Documentos publicados e não publicados
- Fluxos de aprovação de ideias, solicitação de ajustes e aprovação de materiais

### Responsividade e acessibilidade

- Larguras de 320, 375, 390, 430, 768, 1024 e 1440 px
- Ausência de cortes ou sobreposição na navegação
- Tabelas com rolagem horizontal quando necessário
- Tecla Tab, Shift+Tab, Enter, Escape e indicador de foco visível
- Zoom 200%, contraste, labels/nomes acessíveis, prefer-reduced-motion
- Estados loading, erro, vazio e sem permissões

### Integridade

- TypeScript sem erros e build Next.js concluído
- Testes de contratos e segurança existentes
- Nenhuma mudança em chamadas de API, schemas ou regras de autorização por causa do visual
- Teste autenticado do estrategista e de um cliente real/autorizado, sem modificar dados sensíveis
- Preview da Vercel READY e acessível, aprovado antes de promover à produção

## Estado de validação — 09/11/2026

A etapa 06 permanece aberta. Este registro diferencia implementação, verificação automática e inspeção visual em sessão autenticada.

| Verificação | Estado | Evidência / observação |
|---|---|---|
| Sistema de tokens e menus de navegação | Implementado | CSS UI2 e shells de estrategista/cliente |
| Estrutura visual dos workspaces e hierarquia executiva | Implementado em branch | Cabeçalhos operacionais, KPIs e cartões alterados estruturalmente após observação de que a prévia anterior parecia antiga |
| Dez módulos administrativos | Revisão de código aplicada | Inspeção visual individual ainda pendente |
| Editor e preservação do conteúdo documental | Revisão de CSS aplicada | Testes autenticados de inserção, persistência e publicação ainda pendentes |
| Portal do Cliente e módulos compartilhados | Revisão de código aplicada | Testar permissões e estados publicados/não publicados |
| CSS responsivo e controles de foco | Revisão e contratos estáticos aplicados | Inspeção por viewport/zoom e teclado ainda pendente |
| GitHub Actions e build Next.js | Acompanhar último commit | Execuções anteriores aprovadas; a última deve ser verificada após cada ajuste |
| Vercel Preview | Preview anterior READY no commit a7f60f4 | **Não representa** o novo redesign estrutural; gerar nova prévia do HEAD |
| Homologação visual e funcional autenticada | Pendente | Testar estrategista e cliente autorizado sem alterar dados |
| Promoção à produção | Não autorizada | Não executar antes de aceite explícito |

### Regras de aceite e bloqueios

1. Não declarar concluída a Etapa 06 apenas por GitHub Actions ou Vercel READY.
2. Verificar que o deployment exibido corresponde exatamente ao commit aprovado, não a um SHA anterior.
3. Comparar telas reais da interface autenticada com a nova composição, sem usar mockups como substitutos.
4. Validar as larguras 320, 375, 390, 430, 768, 1024 e 1440 px, navegação por teclado, menus, contraste, zoom e tabelas.
5. Testar edição/salvamento/publicação de forma controlada e com autorização; preservar dados dos clientes e documentos ricos.
6. Decisão do responsável em 09/11/2026: **não criar novas prévias nem deployments intermediários**. Concluir todas as verificações automatizáveis e corrigir falhas na branch, preservando a produção.
7. Testes visuais reais dependentes de navegador autenticado e validação pós-deployment devem ser identificados como **pendentes por limitação operacional**, nunca marcados como aprovados por inferência.
8. Quando o código e os testes técnicos estiverem prontos, apresentar o único relatório consolidado da Etapa 06, com o que foi validado, evidências e bloqueios; **pedir autorização expressa antes do único deployment em produção**.
9. Depois do deployment autorizado, verificar app.rotevo.com.br, monitorar erros e ter o rollback disponível; nunca publicar ou promover automaticamente sem autorização.
