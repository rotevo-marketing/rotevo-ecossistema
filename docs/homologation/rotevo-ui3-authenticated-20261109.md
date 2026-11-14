# Rotevo UI 3.0: homologação autenticada

## Revalidação autenticada do commit 90d69cc

Esta é a situação mais recente. A pendência de autenticação da rodada anterior foi superada por login administrativo seguro fornecido pelo responsável.

- Commit examinado: `90d69cc82bf4b4ebb83174212d74694db376b808`, branch `feat/rotevo-ui2-pilot-20261109`.
- Prévia: https://rotevo-ecossistema-fuxkpc4hh-rotevo-marketing.vercel.app/admin
- Deployment `dpl_AK4R1D15mUdTq2nAsnNXckWySKuu`, READY, Preview, SHA confirmado pela Vercel.
- Conta administrativa Rotevo autenticada; sessão persistiu após recarga. A falha inicial de consultas observada na primeira rodada não se reproduziu nesta entrada.
- A diferença de `625bf45` para `90d69cc` é somente documental. Os 317 testes locais e o workflow bem-sucedido `42730899003` referem-se ao mesmo código da aplicação; não se declara novo workflow completo para um commit somente documental.

### Resultados observados na prévia

| Verificação | Resultado e evidência |
|---|---|
| Precedência UI3 no desktop | Aprovada: título `20px`, cabeçalho com `background-image: none`, `border-radius: 0px`, padding `4px 0px 16px` |
| Precedência UI3 em reflow | Aprovada: título `18px`, fundo sem degradê nas larguras reduzidas |
| Zoom 200% | Largura CSS `681px`; documento com `clientWidth = scrollWidth = 674px`, sem transbordamento |
| Zoom 300% | Largura CSS `454px`; `clientWidth = scrollWidth = 449px`, sem transbordamento |
| Zoom 400% | Largura CSS `340px`; `clientWidth = scrollWidth = 337px`, sem transbordamento |
| Filtros da Central de trabalho | Em 340px, cada seletor coube em 309px, terminando em 323px; corrigido o excesso anterior de 465px de scrollWidth |
| Menu móvel do painel | Abriu, fechou por Escape e manteve foco no gatilho; seleção de Tarefas fechou o menu e exibiu o módulo |
| Seletor de projeto das tarefas | Nome acessível confirmado; ArrowDown levou às opções; End foi à última, ArrowUp à anterior e Home à primeira; Escape fechou e devolveu foco ao gatilho |
| Lista e Kanban em mobile | Nomes acessíveis presentes mesmo com textos visuais ocultos; alternância funcionou; Kanban com largura externa preservada em 337px; nenhum cartão movido |
| Modal Nova tarefa | Foco inicial no input; largura 313px em viewport 340px; Shift+Tab circulou até Criar tarefa, Tab voltou ao primeiro input; Escape fechou e retornou foco a Nova tarefa; sem envio |
| Modal Novo cliente | Foco inicial no input, largura 313px; Escape fechou e devolveu foco ao gatilho; sem envio |
| Menu móvel do editor | Correção aprovada: Escape alterou aria-expanded para false e devolveu foco ao botão de menu |
| Abas do editor | ArrowRight selecionou Cronograma e moveu o foco; Home retornou à primeira aba; nenhuma previsão editada |
| Retorno contextual | Link Projetos retornou à listagem administrativa |
| Restrição documental | Visão do cliente continuou com zero documentos publicados e apresentação indisponível; nenhum rascunho liberado |
| Navegação de módulos | Clientes, Projetos, Onboarding, Tarefas, Reuniões, Conteúdo, Campanhas, Equipe e Financeiro abriram; sem alertas de erro observados nos destinos examinados |
| Financeiro | Estado explícito de integração desativada confirmado; nenhum lançamento executado |

O teste com zoom valida reflow, não substitui a matriz exata de dispositivos em 320, 375, 390, 430, 768, 1024 e 1440px. Ainda faltam contraste sistemático, leitor de tela, movimento reduzido e teclado completo em todos os componentes. A correção de consulta indisponível do diretório continua coberta por teste DOM sintético; não foi provocado erro de API no ambiente com registros reais.

### Pendência nova de navegação

**URL e módulo exibido podem divergir.** Após voltar do editor para `/admin?section=projects` e clicar em Visão geral, a tela e o item ativo mudaram para Visão geral, mas a URL permaneceu com `section=projects`. Ao recarregar, a tela retornou a Projetos. Isso afeta restauração de contexto e links compartilhados. Não houve perda de dados, mas a navegação ainda não recebe aceite integral. Recomenda-se corrigir a sincronização entre seção/URL/histórico em etapa própria e testar Voltar/Avançar e rascunhos não salvos. Nenhum código da aplicação foi alterado durante a validação desta versão.

### Testes que dependem de outros perfis ou ambiente

| Requisito | Testes pendentes |
|---|---|
| Conta de cliente autorizada | Portal real, seleção de projetos, módulos habilitados/desabilitados, documentos publicados versus internos, tarefas e atas compartilhadas, conteúdo e campanhas autorizados, contratos e Drive; tentativas por links diretos de outro cliente/projeto |
| Cliente e fixtures locais para gravação | Aprovação de ideia e peça final por versão, solicitação de ajustes, repetição/idempotência, decisão concorrente e revogação de visibilidade; sem testar essas gravações em registros reais |
| Conta de equipe com permissões e projetos restritos | Consultas permitidas e negadas, atribuições, links diretos sem vínculo, documentos internos e separação das funções financeira/operacional/admin; menus ocultos não substituem autorização do servidor |
| Equipe em fixtures locais | Convite, ativação, redefinição, concessão/revogação, inativação e operações de escrita por perfil; sem modificar acessos reais |
| Ambiente financeiro sintético isolado | Administrador, operador somente leitura e cliente; contratos com vários projetos, parcelas, pagamentos parciais, estornos, cancelamentos, recorrência, caixa, totais e documentos/comprovantes autorizados |
| Fixtures documentais locais | Persistência e reabertura de HTML pequeno/extenso, CSS intacto, concorrência, erros de gravação e publicação seletiva; não salvar testes sobre documentos reais |

**Resultado:** correções anteriores de CSS, reflow, rótulos, seletor e Escape/foco foram confirmadas na prévia autenticada. Homologação geral permanece parcial pelas dependências de perfil/ambiente e pela inconsistência de URL identificada.

**Próxima etapa recomendada:** corrigir a sincronização de navegação e, depois, concluir a matriz cliente/equipe com consultas não destrutivas e fixtures locais para gravações/financeiro. Não publicar em produção antes desses aceites.

---

## Atualização: envio autorizado e investigação do acesso

Esta atualização prevalece sobre o estado local descrito na primeira rodada abaixo.

- Branch remota conferida antes do envio: `9b5fcb9fac23036564c3ed0953b614d2b39c86f8`, sem alterações concorrentes. Atualização feita sem force e com verificação do SHA esperado.
- O push Git convencional falhou por ausência de autenticação do terminal. O conteúdo foi publicado pela conexão GitHub em `625bf45b8af13bfe629cc8d9cdfb67ebbe6e35a8`, mantendo o pai original e os mesmos onze arquivos.
- **Identidade do conteúdo confirmada:** árvore `86fd3919148e1a7c89aeaba97a8a754fd4c5dd77`, idêntica à do commit local autorizado `4d1822ed70d147479f3873a993d6476d2a5e6cc5`. Não se afirma que o SHA original foi enviado. Ele foi preservado em `archive/ui3-local-4d1822e` e identificado no commit publicado.
- Confirmação GitHub: https://github.com/rotevo-marketing/rotevo-ecossistema/commit/625bf45b8af13bfe629cc8d9cdfb67ebbe6e35a8
- Prévia automática: https://rotevo-ecossistema-f8ai7gtdm-rotevo-marketing.vercel.app/estrategista/login
- Deployment `dpl_7twXvVGGKFE5UTF6x5ZYJw8VBCSU`, READY, ambiente Preview, associado a `625bf45`. Sem promoção para produção.
- GitHub Actions: run `42730899003`, **completed / success**. Contratos UI2/UI3, três regressões DOM, contratos de projetos/documentos, regressões operacionais/autorização, TypeScript e build aprovados.
- Reexecução local antes do envio: **317 testes aprovados**, sem falhas.
- A nova prévia exibe a página Rotevo “Acesso do estrategista”. A solicitação segura de login foi recusada e não foi repetida. Por isso, **as correções internas ainda não foram revalidadas em sessão autenticada nesta nova prévia**. Não confundir o build aprovado com aceite visual.

### Origem da autenticação

| Camada | Evidência | Conta necessária |
|---|---|---|
| Proteção da Vercel | `ssoProtection.enabled: true`, modo `all_except_custom_domains`; requisição externa sem autenticação retorna 302 para `vercel.com/sso-api` | Conta Vercel autorizada a acessar o projeto/equipe ou acesso temporário oficialmente concedido |
| Senha compartilhada da Vercel | `passwordProtection.enabled: false` | Não se aplica |
| HTTP Basic | Nenhum `WWW-Authenticate` na resposta; nenhuma implementação Basic, middleware/proxy ou regra equivalente encontrada no repositório/configurações examinadas | Não foi identificada conta Basic |
| Login da aplicação | Formulário “Acesso do estrategista”; `supabase.auth.signInWithPassword`; validação de `profiles.role` | Conta da Rotevo com perfil `strategist`; conta Vercel não substitui essa identidade |

A solicitação segura emitida pelo agente estava ligada aos campos `email` e `password` do formulário da aplicação. O domínio da prévia identifica o destino dessa solicitação, não comprova que seja HTTP Basic. No navegador gerenciado, a página da aplicação já pôde ser exibida; isso não elimina a proteção Vercel confirmada para acessos externos.

Nenhuma senha foi solicitada na conversa, inspecionada ou registrada. Não foram desativadas proteções, modificadas configurações, alterados registros reais ou executadas migrações.

**Próxima etapa:** retomar a revalidação autenticada da prévia após definição do acesso seguro apropriado. Priorizar reflow da Visão geral, cabeçalho UI3, rótulos móveis, seletor de projetos e Escape/foco no editor. Depois, concluir a matriz cliente/staff e financeiro sintético. Produção permanece fora do escopo.

---

Data de referência: 09/11/2026, horário de São Paulo. A execução atravessou a meia-noite UTC.

## Resultado executivo

Homologação parcial, com correções locais e pendências identificadas. Não há aceite integral da UI3 nem autorização de produção.

- Repositório: `rotevo-marketing/rotevo-ecossistema`.
- Branch: `feat/rotevo-ui2-pilot-20261109`.
- Baseline remoto e da prévia: `9b5fcb9fac23036564c3ed0953b614d2b39c86f8`.
- Prévia examinada: https://rotevo-ecossistema-1zk7y5t7f-rotevo-marketing.vercel.app/admin
- Deployment: `dpl_GNaV5JQUA2gHSNQw2Mx6DXsMnHmf`, READY, ambiente de prévia (`target: null`).
- Sessão confirmada: estrategista, administrador ativo. A segunda autenticação, iniciada no login do cliente, também resultou em estrategista. Não se obteve uma identidade cliente ou staff.
- Sem push, nova implantação, merge, migração, alteração de flags, envio de convites ou publicação nesta rodada. As correções abaixo são locais, nesta branch, e ainda não estão na prévia examinada.

As instruções do repositório exigem pedido específico para push/implantação. A branch solicitada pelo responsável prevaleceu sobre a referência antiga a `feature/admin-v2-redesign` em AGENTS.md; os limites de publicação e de testes mutáveis foram preservados.

## Matriz de verificações no navegador

| Área | Resultado observado | Limite do aceite |
|---|---|---|
| Login e sessão | Entrada do estrategista concluída; sessão persistiu após recarregar | Na primeira carga houve falha de consultas e mensagem de sessão expirada. A recarga restabeleceu o acesso. Causa ainda não comprovada |
| Navegação | Os dez destinos do menu administrativo abriram; retorno da edição à listagem funcionou | Histórico, links profundos e todos os estados de navegação ainda não cobertos integralmente |
| Clientes e projetos | Cinco clientes ativos, cinco projetos; listagem com vínculos e ações de edição | Não foram criados, editados ou excluídos registros |
| Modal de cliente | Abriu com foco no primeiro campo; Escape fechou e devolveu foco a Novo cliente | Validação de gravação permanece para ambiente sintético |
| Onboarding | Consulta central apresentou projetos e estados existentes; tabela funcionou na largura reduzida | Iniciar, concluir ou alterar etapas não foi executado |
| Tarefas | Consulta de 38 tarefas; tabela, filtros e controles presentes; modal Nova tarefa abriu e fechou com retorno do foco | Não foram alterados status, responsável, prioridade, checklist ou prazo; Kanban não recebeu teste completo de interação |
| Reuniões | Agenda mensal, navegação e filtros renderizaram; drawer de novo compromisso abriu sem salvar | Sem alteração de ata, histórico, vínculo ou visibilidade; ciclo de retenção não testado com registros reais |
| Conteúdo | Calendário e lista renderizaram a coleção editorial existente; canal e situação disponíveis; lista adaptativa em tela estreita | Sem aprovação, edição, nova versão, agendamento ou publicação |
| Campanhas | Filtros e indicadores renderizaram; seleção examinada sem campanhas; valores ausentes apresentados como indisponíveis | Não houve registros suficientes nessa seleção para testar detalhes/resultados completos |
| Equipe | Diretório carregou um administrador ativo e habilitou Novo usuário conforme capacidade retornada | Não foram criados usuários, concedidas permissões ou atribuídos projetos; falta identidade staff para teste real |
| Financeiro | Estado explícito de integração desativada; seções abriram, incluindo Contratos | Sem dados conectados, não foi possível homologar cobranças, parcelas, pagamentos, estornos, caixa ou documentos financeiros |
| Editor estratégico | Planejamento da Flávia abriu; árvore de 63 documentos; HTML de 01.02 e 01.06 renderizou; iframe de 01.06 com cerca de 4.172 px de altura e sandbox `allow-scripts` | Sem edição ou gravação real; salvar/reabrir HTML pequeno e extenso continua pendente em fixtures locais |
| Cronograma | Aba abriu com previsões, situação e visibilidade existentes; salvar permaneceu desabilitado sem edição | Nenhum prazo ou status alterado |
| Publicação documental | Conferência da visão do cliente mostrou zero documentos publicados e apresentação indisponível | Foi mantida a restrição; nenhuma publicação realizada |
| Portal autenticado | Acesso direto a `/cliente` com estrategista redirecionou a `/admin` | Confirma apenas esse encaminhamento de perfil; não comprova isolamento de tenants nem navegação com identidade cliente |

## Responsividade e acessibilidade

Foi inspecionado o desktop padrão do navegador e o reflow com zoom de 300% e 400%, que resultou em larguras CSS observadas de aproximadamente 454 px e 340 px. Isso não equivale a emular dispositivos reais nas sete larguras da especificação.

Em 340 px, Tarefas, Conteúdo, Campanhas, Reuniões, Clientes, Onboarding e a conferência documental não ampliaram a largura do documento: `clientWidth` e `scrollWidth` foram 337 px. A tabela de tarefas manteve sua rolagem interna e o modal coube na viewport (313 px de largura, início em 12 px).

Na Visão geral foi identificado transbordamento: `scrollWidth` 465 px contra `clientWidth` 337 px. O seletor de projetos assumia largura intrínseca de 451 px, e o label flexível não podia encolher. Em aproximadamente 454 px também houve excesso de largura.

Foram confirmados foco inicial, Escape e retorno de foco nos modais de cliente e tarefa. O drawer inicial de reuniões também abriu com foco em Fechar. O menu móvel do editor não fechava por Escape; há correção local. Os controles Lista/Kanban de tarefas perdiam o nome acessível quando seus textos eram ocultos em mobile; há rótulos explícitos locais.

O navegador bloqueou a abertura de DevTools por política do ambiente. Não foram contornadas restrições. Permanecem pendentes os testes exatos em 320, 375, 390, 430, 768, 1024 e 1440 px, leitores de tela, contraste sistemático, movimento reduzido, drag-and-drop por teclado e teste integral de Tab/Shift+Tab.

## Correções locais

| Arquivo | Problema | Correção |
|---|---|---|
| `src/Components/admin/AdminWorkConsole.tsx` | Filtros alargavam a página em tela estreita | Labels flexíveis com largura máxima e mínimo zero; selects com largura do contêiner |
| `src/Components/admin/CentralTarefas.tsx` | Seletor sem nome estável e sem navegação por setas/Home/End; foco perdido ao fechar | Rótulos distintos para filtro e campo da tarefa, navegação pelo teclado e retorno ao gatilho por Escape |
| Mesmo arquivo | Projeto não selecionado era descrito como Todos os projetos mesmo em cadastro obrigatório | Placeholder Selecione o projeto no cadastro |
| Mesmo arquivo | Botões Lista/Kanban sem nome acessível em mobile | `aria-label` explícito |
| Mesmo arquivo | Lint detectou `Date.now()` durante cálculo de renderização das tarefas concluídas | Referência temporal em estado, atualizada ao focar a janela e a cada minuto; sem chamadas de rede; removida constante sem uso |
| `src/Components/admin/ClientsDirectory.tsx` | Falha na consulta exibia totais zero e Nenhum cliente encontrado | Estado indisponível separado de coleção vazia, carregamento anunciado e ação Tentar novamente |
| `src/Components/admin/PlanningAdminShell.tsx` | Escape não fechava o menu móvel do editor | Fechamento e devolução do foco ao botão de menu |
| `src/app/rotevo-ui3.css` | Seletores UI3 tinham empate de especificidade com estilos UI2 carregados na página; cabeçalho antigo com degradê podia prevalecer | Especificidade maior nos shells opt-in do estrategista e cliente, mantendo tokens e exclusão do conteúdo documental |

Nenhuma dessas correções altera schema, RLS, conteúdos, valores financeiros, vínculos ou permissões. A correção visual por CSS ainda exige confirmação no navegador com uma nova prévia.

## Verificações automatizadas

- Instalação reproduzível via lockfile, sem scripts de instalação.
- 317 testes de segurança, domínio financeiro, fluxos documentais e contratos de interface aprovados localmente.
- Três testes DOM novos, com identidades e respostas sintéticas: erro/recuperação no diretório; teclado/foco do seletor de projetos; Escape/foco no menu móvel do editor.
- Contratos antigos atualizados para reconhecer o seletor customizado, o drawer de equipe e validações mais fortes já existentes para HTTPS sem credenciais e referências editoriais. As verificações de autorização foram mantidas.
- Workflow UI2/UI3 preparado para incluir os três testes DOM novos. Não foi executado remotamente nesta rodada.
- TypeScript e build Next.js aprovados com variáveis offline; nenhuma conexão com banco real no build.
- ESLint nos quatro componentes alterados: zero erros; dois avisos existentes de otimização de `<img>` em Clientes.
- `git diff --check` sem erros.

A primeira execução abrangente encontrou cinco asserções desatualizadas de contratos textuais e um arquivo HTTP local bloqueado pelo próprio guard. Após os ajustes de contrato e acessibilidade, os 317 testes selecionados passaram. O arquivo `local-admin-api-negative.test.mjs` foi excluído da execução final porque exige Next.js e Supabase locais explícitos; não foi apontado para a Vercel.

O status remoto do baseline confirmou sucesso do projeto Vercel correto. Dois contextos Vercel de projetos legados (`metodo-epc-q5ap` e `metodo-epc-txjz`) estavam em falha e não foram alterados. O último commit documental não possuía o workflow completo de testes entre seus check-runs; portanto não se presume CI completo apenas pelo status READY. A consulta de logs de runtime da prévia não retornou registros na janela examinada.

## Comparação com a especificação UI3

Foram consultadas as especificações unificadas do Estrategista e do Portal do Cliente de 09/11 e o registro de implementação da branch. O guia visual de outubro é referência histórica, não substitui os tokens atuais.

A implementação continua parcial em relação ao contrato completo. A Visão geral ainda apresenta Central de Atenção, Central de trabalho e Minha Rotina com sobreposição de itens, enquanto a especificação exige deduplicação mais ampla. A revisão desta rodada corrigiu defeitos pontuais; não transforma esse conjunto em aceite de arquitetura completo. Modelo multicanal de conteúdo/campanhas, auditoria durável de atas e automações adicionais continuam sujeitos às decisões de domínio já registradas e não foram implementados nesta homologação.

## Pendências e prioridade

1. **Alta: identidade cliente e staff.** Testar o portal de ponta a ponta, módulos habilitados/desabilitados, arquivos autorizados e negações por tenant/projeto. Não usar apenas prévia interna como prova.
2. **Alta: nova prévia das correções.** Confirmar reflow da Visão geral, precedência dos estilos UI3, labels móveis e comportamento de Escape com CSS/JS reais.
3. **Alta: Financeiro conectado em ambiente apropriado.** Validar perfis somente leitura/administrador/cliente, parcialidade, estornos e contratos com múltiplos projetos usando dados sintéticos. Não ativar contra registros reais para teste.
4. **Alta: persistência em ambiente local isolado.** Salvar e reabrir documentos HTML, erros de gravação, concorrência e restauração sem alterar clientes reais.
5. **Média: matriz responsiva e acessibilidade completa.** Executar as sete larguras, teclado completo, contraste, leitor de tela e movimento reduzido.
6. **Média: deduplicação e aderência visual.** Encerrar lacunas entre especificação e implementação da Visão geral e fluxos ainda parciais.
7. **Média: falha inicial de consultas após autenticação.** Reproduzir com observabilidade suficiente antes de atribuir causa ou considerar resolvido.
8. **Baixa: projetos legados da Vercel.** Revisar separadamente os dois checks externos falhos, sem interferir no projeto correto.

## Próxima etapa recomendada

Autorizar o envio deste conjunto à mesma branch remota e a geração de uma prévia de desenvolvimento atualizada, sem produção. Revalidar primeiro as correções e concluir os testes com contas existentes de cliente/staff e fixtures financeiras locais. Somente depois apresentar novo aceite e plano de release para autorização específica de produção.

A execução termina aqui, aguardando essa autorização. Não promover nem publicar a UI3 com as pendências acima em aberto.
