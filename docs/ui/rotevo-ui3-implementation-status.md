# Rotevo UI 3.0 — Registro de implementação (branch de desenvolvimento)

**Fonte de verdade:** especificações UI3 do estrategista e do cliente discutidas em 09/11/2026. Este documento registra código efetivamente alterado, não um aceite visual ou funcional da plataforma publicada.

## Ambiente e decisão de publicação
- Branch isolada: `feat/rotevo-ui2-pilot-20261109`.
- Produção permanece sem novo deployment nesta rodada por decisão explícita do responsável.
- Não modificar dados de clientes, schemas, RLS ou documentos apenas para redesenhar interfaces.
- Antes de implantação, executar build, TypeScript, contratos, testes autenticados, viewport, teclado e permissão. Solicitar aprovação.

## Implementado na branch (primeira rodada)
1. `src/app/rotevo-ui3.css`: camada UI3 opt-in, paleta da UI2 preservada, hierarquia compacta, espaço contínuo, bordas/ícones leves e sem alcançar o papel do editor estratégico.
2. `src/app/admin/page.tsx`, `src/app/cliente/page.tsx` e `src/app/layout.tsx`: habilitação UI3 e remoção dos cabeçalhos repetitivos das duas áreas.
3. `src/Components/admin/ClientsDirectory.tsx`: cadastro em modal e detalhes do cliente em drawer, sem alterar APIs.
4. `src/Components/admin/TeamDirectory.tsx`: convite e gestão contextual de equipe, mantendo capacidade e permissão do servidor.
5. `src/Components/admin/CentralTarefas.tsx`: criação detalhada em modal e criação rápida pelo título diretamente no workspace com seleção explícita do projeto.
6. `src/Components/admin/OperationalHubs.tsx`: reunião/compromisso em drawer, preservando a agenda e o salvamento já existentes.
7. `src/Components/cliente/ClientDrive.tsx`: pastas em lista compacta com visibilidade existente e link externo autorizado.
8. `src/Components/cliente/ClientCampaigns.tsx`: lista operacional e detalhes em drawer com foco/teclado.
9. `src/lib/security/projectForClient.ts`: informações estratégicas editoriais explicitamente compartilhadas pelo estrategista agora chegam ao cliente, com links HTTPS filtrados e anotações internas excluídas.
10. `scripts/security/client-project-projection.test.mjs`: regressão para o compartilhamento editorial sem vazamento de campos internos.
11. Rotas interceptadas em `src/app/admin/@modal/` e novo `src/app/admin/layout.tsx`: cadastro inicial de planejamento em modal a partir do painel, preservando fallback de URL direta e o fluxo posterior de seleção de documentos.
12. `scripts/security/ui2-visual-contract.test.mjs`: contrato atualizado para a identidade de cabeçalhos compactos.

## Pendente: não declarar UI3 concluída
- Reformulação completa de Visão geral do estrategista e do cliente, com deduplicação operacional de KPIs/atenções.
- Revisão extensa das listas de Projetos, Onboarding e do Kanban, inclusive controle de histórico de tarefas.
- Editor estratégico e fluxo completo dos documentos, cronograma, publicação e apresentação.
- Cadastro/projeto/configuração de acesso em modais/drawers com fluxos autorizados ponta a ponta.
- Conteúdo (admin e cliente) com alternância entre calendário/lista/aprovações e filtros por canal, sem duplicação.
- Campanhas do estrategista, modelo de iniciativa multicanal e vínculos com conteúdos/tarefas.
- Reuniões com atas estruturadas/versionadas, histórico, compartilhamento explícito e possíveis migrações de dados.
- Financeiro do estrategista e do cliente, contratos, permissões de equipe por operação.
- Acessibilidade/UX de modais: testes interativos completos, alerta de alterações não salvas, rolagem, telas móveis e foco.
- Homologação em navegador autenticado e um único deployment consolidado após autorização.

## Regras de implementação
- Não criar funcionalidade ou permissão falsa na UI; toda ação exige backend autorizado.
- Não trocar ausência de dado por zero; manter registros e status financeiros distintos.
- Filtros e listas do Portal do Cliente sempre em projeção autenticada/allowlist, nunca JSON bruto de projeto.
- Não modificar estilos internos de `.se-paper`, `.bn-editor` nem HTML personalizado.
- Não publicar nenhum documento ou alterar a visibilidade de registros durante validação visual.
- Usar ícones Tabler disponibilizados nos componentes tipados, em tamanho discreto, preferencialmente 16–18 px e stroke aproximado de 1,5–1,7.

## Última verificação
Após cada commit, consultar o run da branch em GitHub Actions. Execuções intermediárias com falha de contrato antigo/nomes de ícones foram corrigidas posteriormente. **Conferir resultado do HEAD** antes de afirmar que a versão está validada.

## Rodada seguinte — Projetos e Onboarding (09/11/2026)
- **Projetos:** retirados os três cartões de totais e o segundo cabeçalho decorativo; os números agora aparecem em resumo discreto, com filtros, busca e listagem operacional compactos. A ação principal de edição foi preservada.
- **Menu de projetos:** as opções de apresentação, acesso, publicação e exclusão continuam disponíveis, com fechamento por Escape, clique externo e retorno do foco.
- **Acesso:** rota interceptada do Next.js abre o cadastro/configuração existente em um drawer contextual quando a navegação parte do painel. A URL direta e a autorização original permanecem disponíveis, sem criar um segundo fluxo de credenciais.
- **Apresentação:** abrir a partir da lista inclui uma indicação de origem, e o controle existente retorna à lista Projetos. Abrir de outras origens conserva o comportamento antigo.
- **Publicação:** confirmação explícita antes de tornar uma apresentação pública para clientes autorizados ou retornar a rascunho. A confirmação esclarece que documentos individuais não são publicados automaticamente.
- **Onboarding:** removidos os quatro cartões de métricas, substituídos por resumo discreto na listagem; editor lateral simplificado; dez passos padrão agrupados em Formalização, Preparação, Alinhamento e Liberação. Checklists legados e personalizados mantêm sua ordem sem remapeamento ou regravação.
- **Contrato UI3:** `scripts/security/ui3-workspace-contract.test.mjs`, incluído no GitHub Actions para testar navegação, estado do projeto, retorno da apresentação e persistência/autorização existente do onboarding.
- **Sem deploy nem alterações de dados:** todos os commits seguem isolados na branch UI2/UI3.
- **Verificação ainda necessária:** confirmar conclusão do workflow de HEAD após a última atualização e executar testes autenticados antes de qualquer publicação.

## Rodada — Visões gerais do Estrategista e do Cliente (09/11/2026)
### Implementado
- **Visão geral do estrategista** (`AdminOperationsOverview.tsx`): retirado o bloco editorial "Indicadores que importam agora" e substituídos os quatro cartões amplos por uma faixa compacta de indicadores; `Central de Atenção` agora antecede a central de trabalho, com tarefas e compromissos filtráveis. Os indicadores continuam consultando registros autorizados, com estado indisponível quando faltam dados; os cálculos de prioridade, consultas financeiras, atribuições pessoais e decisões foram preservados.
- **Central de trabalho** (`AdminWorkConsole.tsx`): retirados quatro cartões de contagem redundantes, mantendo as abas Hoje/Atrasadas/Esta semana/Delegadas/Sem prazo/Todas com contagens, filtros por projeto e responsável e lista real de tarefas e reuniões.
- **Visão geral do cliente** (`ClientOverview.tsx`): priorizadas as ações que exigem decisão (aprovações de ideias/versões finais e cobranças vencidas), removidos os quatro cartões grandes de indicadores, reduzidos os resumos de entregas/conteúdo/campanhas a uma única faixa discreta, excluída a duplicação da seção "Andamento dos serviços" e movida a navegação por mês para junto das atividades do mês. Também foi acrescentada uma faixa de acompanhamento da próxima entrega compartilhada com prazo real, incluindo indicação de atraso, quando aplicável.
- **Estilos** (`src/app/rotevo-ui3.css`): superfícies brancas contínuas, divisores leves, tipografia compacta e indicadores acessíveis. Sem alterações no conteúdo dos documentos estratégicos.
- **Contratos de teste** (`scripts/security/ui2-visual-contract.test.mjs` e `scripts/security/ui3-workspace-contract.test.mjs`): introduzidas expectativas para a hierarquia UI3, preservação da autorização, filtragem de itens compartilhados e não duplicação de cartões.

### Fronteiras preservadas
- Nenhuma mudança nas tabelas ou dados financeiros; sem índices fictícios, progresso inventado ou números estimados.
- Nenhum conteúdo interno ou documento não publicado foi liberado.
- A fonte de decisões indisponível continua com estado de indisponibilidade, não se presume zero.
- Publicação e deployment seguem bloqueados até homologação explícita do responsável.

### Pendente da etapa
- Testes visuais autenticados por perfil e nas larguras 320,375,390,430,768,1024,1440.
- Verificação de retorno de foco e navegação por teclado em navegador real.
- Aferir experiência com os dados de clientes autorizados sem modificar registros.

## Rodada — Editor de Planejamento Estratégico (09/11/2026)

### Implementações aplicadas na branch
- **Shell do planejamento:** ativado `rv-ui3` também no `PlanningAdminShell`, garantindo que a identidade seja aplicada ao editor e não apenas à home administrativa.
- **Cabeçalho do projeto:** reduzidos fotografia, título, metadados e botões contextuais; removido o rodapé lime do workspace de edição; preservadas as funções de acesso, apresentação e publicação.
- **Abas:** Plano Estratégico, Cronograma, Plano de Execução, Visão do Cliente e Configurar Documentos passam a seguir uma barra compacta com divisória e foco; preservadas teclas ArrowLeft/ArrowRight/Home/End, atributos aria-selected e proibição de trocar durante salvamento.
- **Documentos:** adicionada busca por nome/código na configuração de escopo; áreas e documentos foram estilizados em linhas compactas, preservando `selectedDocumentCodes`, `presentedDocumentCodes`, conteúdos já salvos e salvamento de escopo autorizado.
- **Editor estratégico:** expandida a superfície de trabalho, reduzidos os elementos decorativos da navegação de documentos; o conteúdo `.se-paper`, editor BlockNote e HTML personalizado não foram alterados.
- **Cronograma:** a previsão e situação por área deixaram de aparecer em cartões independentes e passaram a ser editadas em linhas; preservado `planningAreaSchedule` e o cronograma legado recolhido.
- **Plano de Execução:** entrega nova ou existente abre em drawer acessível com foco e confirmação de descarte; mantidos responsáveis, datas, dependências, vínculo com documentos, visibilidade e persistência compare-and-swap.
- **Teste automatizado:** `scripts/security/ui3-workspace-contract.test.mjs` cobre estrutura, escopo documental, autorização e persistência.

### Não implementado nesta rodada
- Reformulação funcional completa do editor de documentos (ferramentas de inserção e modelos); exige homologação visual com documentos ricos reais.
- Gestão de atas, fluxo multicanal editorial, permissões granulares de equipe ou migração de banco.
- Aprovação de qualquer documento, mudança de visibilidade de cliente e deployment de produção.

### Verificações necessárias
- Confirmar workflow do commit final desta rodada.
- Validar alteração, salvamento e recuperação de documentos em navegador autenticado (inclusive documentos HTML extensos), controle de altura, publicação seletiva e acessibilidade mobile.

## Rodada — Conteúdo e Campanhas (09/11/2026)

### Código implementado
1. `EditorialCalendar.tsx`: filtros por canal baseados exclusivamente nos canais efetivamente presentes nos projetos; todas as visualizações (calendário e lista) reutilizam a mesma coleção `editorialCalendar`, sem replicar registros.
2. `ClientContent.tsx`: alternância Calendário, Lista e Aprovações, com canal específico, situação e navegação por mês nas visualizações temporais. A visão de Aprovações exibe conteúdos de todos os meses que estão aguardando decisão e mantém o diálogo, as aprovações de ideia/versão e o histórico por versão já existentes.
3. `EditorialManager.tsx`: editor lateral branco e campos do briefing organizados com divisores mais leves, sem remover estratégia, referências, links, revisão, versões ou controle de compartilhamento. Histórico de decisões por projeto acessível sob demanda via componente existente `EditorialApprovalsPanel`.
4. `CampaignsHub.tsx`: formulário e listagem preservados, com filtros compactos, indicadores operacionais em faixa discreta e métricas menos frequentes em painel recolhível. Histórico mensal, preenchimento manual, valores ausentes `null`, sem somas indevidas de alcance e resultados heterogêneos.
5. `CampaignsHub.tsx`: `DialogFocus` aplicado ao editor e ao painel de resultados; os botões principais seguem o roxo aprovado, eliminando aplicações antigas de verde-limão nas ações editadas.
6. `src/app/rotevo-ui3.css`: ajustes de densidade, divisórias e foco de teclado para os módulos editoriais e de campanhas.
7. `scripts/security/ui3-workspace-contract.test.mjs`: regressões específicas para os filtros por canal, aprovações condicionadas à versão e visibilidade, histórico mensal e integridade dos cálculos.

### Restrições preservadas
- Nenhum dado foi duplicado ou migrado. Não foi criado modelo multicanal com distribuições independentes nesta rodada.
- Nenhuma aprovação foi emitida, versão publicada ou campo interno compartilhado automaticamente.
- Não houve alteração das políticas de segurança do banco nem das ações em plataformas de publicidade.
- Não houve deployment; produção e registros dos clientes permanecem inalterados.
- A interface ainda precisa de homologação autenticada e visual em diferentes telas antes da implantação.

### Pendências
- Seleção múltipla e distribuição de uma única criação para diversos canais com datas e aprovações independentes, mediante revisão de modelo de dados.
- Integração estruturada entre Campanhas, Tarefas e Conteúdos sem duplicar entradas.
- Acessibilidade e confirmação de comportamento de aprovação com sessão autenticada, inclusive fontes indisponíveis ou com erros.
- Teste visual real em desktop e mobile, além de publicação consolidada somente com autorização.

## Rodada — Reuniões, atas e encaminhamentos (09/11/2026)

### Implementado
- `AdminMeetingsHub`: removidos os três cartões grandes de contagem; agenda, listagem e filtros em área de trabalho compacta; criação e gerenciamento continuam em drawer sem sair do painel.
- `OperationalAgenda`: modelo de reunião foi ampliado de maneira compatível com JSON existente, mantendo título, data, horário, pauta, responsável, tipo, link e material. Ata e decisões continuam em `minutes`, mas há agora `internalNotes` independente e `minutesVisibleToClient` para escolher explicitamente a visibilidade da ata.
- **Compatibilidade legada:** se `minutesVisibleToClient` estiver ausente em um registro existente e o compromisso já for compartilhado, a ata continua visível como antes. Novos registros começam com `minutesVisibleToClient:false`.
- **Encaminhamentos estruturados:** `actionItems` com título, responsável, prazo e vínculo opcional com uma tarefa já existente no mesmo projeto. O vínculo não conclui nem cria tarefas automaticamente.
- `ProjectForClient`: projeção explícita da ata somente se não estiver bloqueada por `minutesVisibleToClient:false`; notas `internalNotes` e log `minutesHistory` nunca são enviados ao portal. Ações só são projetadas no mesmo contexto de visibilidade da ata, sem campos internos.
- `ClientMeetings`: três visualizações de uma mesma agenda autorizada, Calendário, Lista e Histórico, incluindo encaminhamentos e responsáveis nas reuniões autorizadas.
- **Histórico de versões da ata:** a rota de atualização anexa ao JSON um snapshot assinado pelo usuário autenticado, com timestamp do servidor e texto da nova versão, somente quando o conteúdo de `minutes` é alterado. O editor administrativo apresenta o histórico em uma seção recolhível; este histórico não é projetado ao cliente. Em caso de atualização simultânea, segue a proteção `expectedUpdatedAt`.
- **Retenção:** a rota administrativa impede exclusão destrutiva de reuniões concluídas ou com atas não vazias. O botão de exclusão é desabilitado nesses registros. Reuniões sem ata e não concluídas ainda podem ser excluídas após confirmação.
- **Validações:** limites de texto, URLs HTTPS, atributos de visibilidade, datas, identificadores e vínculos de tarefas, com preservação de itens legados não alterados. `validExecutionDependencies` valida que cada ação vinculada pertence a uma tarefa do mesmo projeto.
- **Testes:** `scripts/security/client-project-projection.test.mjs` verifica isolamento de notas internas, atas restritas, históricos e ações; `scripts/security/ui3-workspace-contract.test.mjs` verifica fluxos e contratos de autorização.

### Pendências importantes
- O histórico da ata atualmente mantém até as 100 últimas revisões no JSON. Antes de utilização jurídica como prova, é necessário projetar trilha de auditoria durável e imutável em banco, com políticas de retenção e controles próprios.
- A funcionalidade de criar uma tarefa diretamente de um encaminhamento ainda não foi implementada. Atualmente permite vincular tarefas já existentes, preservando o mesmo projeto.
- Integração automática com Google Meet, Calendar ou Docs não implementada.
- Falta homologação autenticada do editor de atas, permissões, modo mobile, navegação por teclado e proteção de dados em contas reais.
- Nenhum deployment ou publicação de registros foi realizado nesta rodada.

## Rodada inicial — Financeiro e Contratos (09/11/2026)

### Alterações desta retomada
- `ClientFinanceView.tsx`: histórico de pagamentos filtra lançamentos sem correspondência na coleção de faturas autorizadas recebida pelo cliente. Evita acessar objeto ausente e não constrói linha de histórico a partir de uma referência sem fatura visível. Os totais continuam baseados nas informações financeiras fornecidas pelo servidor; não foram recalculados ou alterados.
- `ClientFinanceView.tsx`: faixa de resumo com três informações financeiras compactada para a densidade visual UI3, mantendo valores e lógica.
- `ClientContracts.tsx`: compactação do resumo contratual e da navegação, preservando status, escopo, histórico e links por `AuthorizedFileLink`.
- `ui3-workspace-contract.test.mjs`: regressão de código-fonte contra associação não validada de pagamentos e para preservação dos componentes de acesso financeiro e contratual.

### Limites e pendências
- Esta é uma **rodada parcial** do Financeiro/Contratos. O workspace administrativo, contratos financeiros e integrações de pagamentos ainda exigem auditoria funcional e revisão UI3.
- Ainda é necessário confirmar o resultado dos testes automatizados do HEAD e executar homologação autenticada por perfil, viewport e permissão.
- Não houve edição de tabelas, valores, cobranças, contratos de clientes ou migrações, nem publicação deliberada de produção nesta rodada.

## Rodada — Financeiro e Contratos UI3 (09/11/2026)

### Escopo implementado na branch
- **Estrategista / Financeiro:** cabeçalho reduzido, navegação compacta entre as 11 seções existentes, componentes de indicadores e alertas mais discretos e superfícies de trabalho consistentes. Nenhum cálculo de caixa, receita ou despesa foi alterado.
- **Contratos financeiros:** busca por título ou cliente e filtro por situação (rascunho, ativo, pausado, encerrado), com contagem de resultados e estado vazio distinto de ausência de contratos. Criar, editar, pausar, reativar e encerrar mantêm as rotas e autorizações existentes.
- **Lançamentos:** tabela mais densa, com rolagem horizontal controlada em telas estreitas, preservando valores, saldos, vencimentos, operações de pagamento, cancelamento, edição e documentos.
- **Fornecedores e assinaturas:** cartões e botões padronizados visualmente, preservando histórico, edição e emissão recorrente.
- **Portal do Cliente:** resumo financeiro e apresentação contratual compactos; histórico de pagamentos limitado a faturas efetivamente presentes na coleção autorizada e total pago reconciliado com esse mesmo histórico. Documentos continuam via `AuthorizedFileLink` e os pagamentos continuam de confirmação manual.
- **Regressões:** `scripts/security/ui3-workspace-contract.test.mjs` cobre filtros, preservação dos comandos financeiros, visualização autorizada e integridade de totais. Nenhuma operação financeira de gravação foi executada nesta rodada.

### Verificações necessárias antes de liberar UI3
- Consultar o resultado dos checks do HEAD (TypeScript, build e contratos de segurança), corrigir qualquer falha.
- Homologar em navegador autenticado os papéis de financeiro administrador, operador somente leitura e cliente, inclusive vencimentos, pagamentos parciais/estornados e contratos vinculados a mais de um projeto.
- Testar visualmente desktop/mobile (320, 375, 390, 430, 768, 1024, 1440 px) e foco/teclado para diálogos.
- Confirmar no servidor que arquivos e cobranças são filtrados por tenant/projeto, sem confiar somente na interface.
- Não migrar schema nem publicar documentos/financeiro ou alterar valores reais para homologação; manter testes com fixtures.

### Publicação
- Commit apenas na branch isolada. A integração Git/Vercel pode gerar prévias automáticas; não foi solicitado deployment de produção nem promoção de prévias. Nenhuma implantação deve ser declarada validada sem verificação.

## Revisão integrada UI3 — primeira rodada de auditoria transversal (09/11/2026)

### Escopo auditado em código
- Painel do estrategista: Visão Geral, Tarefas, Conteúdo e Campanhas; verificados componentes principais e contratos automatizados existentes.
- Portal do cliente: Visão Geral, Reuniões, Conteúdo, Campanhas, Contratos e Financeiro.
- Segurança e integração: projeção allowlist `projectForClient`, rota `/api/client/finance`, uso dos documentos autorizados, vínculos de projetos, status de campanhas, pagamentos e escopo editorial.
- A revisão confirmou que os testes de código existentes cobrem partes relevantes de permissão e persistência; **não representa teste visual autenticado em todos os perfis**.

### Correções efetivas
1. `ClientFinanceView.tsx`: links externos de pagamento agora só são apresentados quando passam por `safeLink(url,false)` (HTTPS válido, sem credenciais no endereço); mantém `rel="noopener noreferrer"` e `referrerPolicy="no-referrer"`.
2. `ClientMeetings.tsx`: mês inicial da agenda definido por `todayInBrazil()`, coerente com o fuso empresarial usado pelo financeiro e evitando divergência de mês em clientes fora do horário de São Paulo.
3. `ui3-workspace-contract.test.mjs`: regressões novas para URL financeira, projeção do cliente, calendário e autorização da rota financeira.

### Testes e limites
- A primeira execução após adicionar o teste teve falha em uma asserção de inspeção textual equivocada (esperava a string `internalNotes` num módulo que a exclui por allowlist). A asserção foi corrigida para exigir a projeção positiva `projected.actionItems`, sem alteração de produção.
- Conferir o workflow do HEAD `76ceef00` e o último commit documental antes de declarar os testes aprovados.
- Pendências de homologação autenticada: navegação, modais, foco/teclado, telas 320, 375, 390, 430, 768, 1024 e 1440 px, papéis, persistência de documentos HTML extensos, aprovação e visibilidade seletiva, contratos e pagamentos parciais/estornados.
- Os testes automatizados e inspeção de código não substituem uma auditoria visual com sessões reais. Sem modificação de registros, banco de dados ou produção e sem promoção manual de deployment.


## Homologação autenticada: envio autorizado e identificação do acesso

- O conteúdo aprovado em `4d1822e` foi publicado na mesma branch como `625bf45b8af13bfe629cc8d9cdfb67ebbe6e35a8`. O Git do terminal não tinha autenticação; a conexão GitHub foi usada. A árvore `86fd3919148e1a7c89aeaba97a8a754fd4c5dd77` é idêntica nos dois commits; o original foi preservado localmente. Sem alterações concorrentes, force-push ou sobrescrita de trabalho existente.
- Prévia automática READY: `https://rotevo-ecossistema-f8ai7gtdm-rotevo-marketing.vercel.app/estrategista/login`, deployment `dpl_7twXvVGGKFE5UTF6x5ZYJw8VBCSU`, Preview de `625bf45`.
- Run GitHub Actions `42730899003`: concluído com sucesso, incluindo regressões DOM da homologação, contratos, TypeScript e build. Reexecução local: 317 testes aprovados.
- Revalidação interna na nova prévia **pendente de sessão autenticada**: a solicitação segura foi recusada e não repetida. A página pública de login da Rotevo foi confirmada; não declarar responsividade/foco internos homologados apenas por build/DOM sintético.
- Proteção identificada: Vercel Authentication ativa (`all_except_custom_domains`), com redirecionamento externo 302 para SSO da Vercel. Password Protection desativada; não há `WWW-Authenticate` nem implementação HTTP Basic encontrada no código/configuração examinados.
- Há duas identidades distintas: conta Vercel autorizada para a proteção da prévia e conta Rotevo `strategist` para entrar no painel via Supabase. A solicitação emitida pelo agente estava ligada ao formulário da Rotevo.
- Detalhes, limites e evidências: `docs/homologation/rotevo-ui3-authenticated-20261109.md`.
- Próxima etapa: revalidar correções no navegador autenticado; depois perfis cliente/staff e financeiro sintético. Sem produção, main, migrações, dados reais ou mudanças de segurança nesta rodada.


## Revalidação administrativa autenticada de 90d69cc

- Prévia READY de `90d69cc82bf4b4ebb83174212d74694db376b808`: `https://rotevo-ecossistema-fuxkpc4hh-rotevo-marketing.vercel.app/admin`, deployment `dpl_AK4R1D15mUdTq2nAsnNXckWySKuu`.
- Login administrativo seguro concluído e sessão persistida. Cabeçalho UI3 confirmado no navegador: título 20px desktop/18px mobile, sem degradê nem arredondamento legado.
- Reflow aprovado em larguras CSS de 681, 454 e 340px via zoom 200/300/400%. Na menor, clientWidth e scrollWidth = 337px; os filtros deixaram de alargar a página. Não equivale à matriz exata de sete viewports.
- Nomes acessíveis de Lista/Kanban, setas/Home/End/Escape do seletor e retorno de foco aprovados. Modais de tarefa/cliente abriram e fecharam sem envio; contenção Tab/Shift+Tab validada no modal de tarefa. Escape/foco do menu móvel do editor confirmado, assim como abas por teclado e retorno à lista.
- **Pendência encontrada:** navegação interna do painel não sincroniza o parâmetro `section`. De `/admin?section=projects`, Visão geral muda a tela mas mantém a URL; recarregar restaura Projetos. Corrigir URL/histórico e testar retorno/contexto antes de aceite integral de navegação.
- Financeiro continua desativado. Portal e autorização real por cliente/staff ainda exigem perfis próprios; operações mutáveis, persistência documental e ciclo financeiro exigem fixtures locais isoladas.
- O código da aplicação não foi alterado durante esta homologação. Dados, permissões, documentos, flags e produção preservados.
- Relatório consolidado e matriz de dependências: `docs/homologation/rotevo-ui3-authenticated-20261109.md`.
