# Reconciliação visual da Rotevo UI 3.0

Integração derivada de `f0471aa`. A árvore de aplicação em `src` dessa base coincide com a produção consultada em `f204554`. Fonte visual `bf6230a`, ancestral comum `19492b6`. Os 44 commits entre `e14eb53f` e `bf6230a` incluem UI, colaboração, testes e procedimentos de backup. Os commits anteriores ao primeiro SHA também foram considerados para identificar os componentes e as decisões.

| Área | Decisão e código anterior | Diferença no release e tratamento na integração |
| --- | --- | --- |
| Painel e navegação | Menu neutro, hierarquia compacta e ícones Tabler | Mantido o shell do release, incluindo histórico de URL e menu móvel. Recuperados nome e avatar no menu de conta. |
| Clientes e Onboarding | Modais centrais, fechar acessível e avatar no Onboarding | Recuperados os componentes e os testes sintéticos do fluxo. |
| Projetos, Visão geral, Campanhas, Reuniões | Refinamentos base de UI3 | Preservados os módulos do release e os contrastes de Visão geral. Sem substituição dos fluxos. |
| Tarefas | Lista densa, grupos por cliente, Kanban leve, responsáveis, prazos e detalhe em duas colunas | Reconciliados os controles e o histórico. Arquivo e Lixeira são reversíveis e separados, inclusive em lote por projeto. |
| Conteúdo do estrategista | Calendário mensal, canais dinâmicos e lista estilo Tarefas | Recuperadas as seis colunas, avatares, responsável vinculado à Equipe, controles de situação/prioridade, modais, histórico e ações reversíveis. Seleção e ordenação completam a lista com ações em lote sequenciais e atualização autorizada por projeto. |
| Portal do Cliente | Calendário e Lista, atalho de aprovação, avatares e tarefas compartilhadas | Reconciliados os detalhes em leitura, projeção de itens ativos e fotos assinadas. Mantidos os fluxos formais de aprovação e ajustes e as verificações por tenant. |
| Equipe, Financeiro, contratos e editor estratégico | Fluxos e controles existentes no release | Preservados. A lista usa as identidades e os avatares das rotas protegidas já disponíveis. |
| Conversas | UI visual desenvolvida em paralelo ao release | Aproveitados os painéis e avisos de compartilhamento com o componente e endpoint do release. Ativação hospedada continua dependente das duas flags e da persistência/RLS homologadas. |
| Exclusão permanente | Pendente de governança e recuperação | Fora do código operacional. Lixeira usa apenas marcadores reversíveis. |

A API de atualização mantém autorização por projeto e controle de concorrência, valida responsáveis ativos e marcadores de ciclo de vida. A projeção do cliente descarta itens arquivados e na Lixeira, com fotos de responsáveis limitadas a itens já compartilhados. A rota paralela de conversas da branch visual, o SQL proposto por ela e a configuração Vercel antiga ficam fora da integração.

Consulta somente leitura ao catálogo de produção confirmou leitura/escrita direta de `planning_projects.data` negadas a `authenticated` e leitura de servidor preservada. Testes de escrita, RLS e navegador usam o laboratório sintético. Uma prévia READY só confirma o build hospedado; aceite visual autenticado e promoção exigem suas próprias evidências.

A proposta de mensagens registra a versão editorial no servidor, conserva a autoria no banco e omite o identificador Auth nas respostas. Recursos ocultos, arquivados ou na Lixeira permanecem inacessíveis à conversa. O laboratório cobre mensagens em ambas as direções, Equipe com e sem escrita, persistência e abertura da conversa nos detalhes de Tarefas e Conteúdo. O SQL de mensagens continua sendo uma proposta para aprovação separada.
A área restrita de Equipe lista somente títulos e identificadores de itens compartilhados de projetos atribuídos. A listagem exige leitura, e o formulário de mensagens exige também escrita. O servidor revalida o acesso em cada operação.
