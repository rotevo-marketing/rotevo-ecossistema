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

## Estado de validação

A edição estática do código não comprova build nem funcionamento real. Quando o limite da Vercel permitir, executar o build da branch de prévia e validar os itens acima. Não promover à produção sem aprovação do usuário.
