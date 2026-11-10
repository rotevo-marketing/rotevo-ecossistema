# Rotevo UI 3.0 | Matriz consolidada de homologação

**Corte técnico:** 09/11/2026 (horário de São Paulo).  
**Repositório:** `rotevo-marketing/rotevo-ecossistema`  
**Branch exclusiva:** `feat/rotevo-ui2-pilot-20261109`  
**CI de homologação ampliada:** [GitHub Actions #42737283479](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42737283479) — **SUCCESS**, commit `95550beb`.  
**Escopo:** consultas de código, testes automatizados isolados e build. Sem edição de registros reais, migração ou promoção de produção.

## 1. Evidências aprovadas automaticamente

| Eixo | Evidência/testes | Resultado |
| --- | --- | --- |
| Navegação UI3 | Contratos de sidebar, `section`, Back/Forward, documentos, modais e teclado; regressões DOM JSDOM | Aprovado no CI |
| Documentos HTML | `document-html-persistence.test.cjs` executa a rota de gravação com repositório sintético em disco; grava/reabre HTML curto e extenso, altera CSS, preserva releases, checa limites, concorrência e falhas | Aprovado em fixture isolada |
| Sanitização HTML | `visual-html.test.mjs` e `visual-html-component.test.cjs`; scripts, SVG, links, CSP, tamanho, Unicode, visualização | Aprovado em testes isolados |
| Planejamento e publicação | Transições de aprovação, isolamento de versões publicadas, releases e documentos de 2027 | Aprovado em contratos |
| Financeiro | `finance/domain.test.mjs`, `finance/lifecycle.test.mjs`, `finance-publication.test.mjs`; pagamentos parciais, duplicidade, estornos, recorrência, contas, competênc﻿ias, caixa, leitura e modo desconectado | Aprovado em dados sintéticos |
| Cliente, projetos e módulos | `client-project-projection.test.mjs`, `isolated-client-journey.test.mjs` e `client-project-api-behavior.test.mjs`: JWT, papel cliente, filtro de tenant, URL manipulada, senha inicial, restrição de módulos | Aprovado em fixtures |
| Arquivos privados | `client-assets-behavior.test.mjs`: módulos ausentes/desabilitados, tenant diferente, fatura invisível/desvinculada, documento não publicado, contrato não referenciado, colaborador sem projeto | Aprovado em fixtures |
| Equipe e autorização | `team-project-access-behavior.test.mjs`, `staff-access-boundary.test.mjs`, `admin-route-contract.test.mjs`, `auth-schema-preflight.test.mjs`: permissões, RLS previsto, membros inativos, restrição de mutações | Aprovado em código e fixtures |
| Operação e planejamento | Ações, calendário, campanhas, onboarding, dependências de tarefas, projeções administrativas e identidade | Aprovado em contratos |
| Qualidade técnica | TypeScript `npx tsc --noEmit` e `npm run build` (Next.js) | Aprovados no CI |

O workflow executa as suítes anteriores e **16 especificações adicionais** numa matriz offline, sem apontar para Supabase hospedado. Variáveis de configuração do CI utilizam endpoints e chaves-placeholder locais.

## 2. Correções incluídas nesta rodada

- `src/lib/operations/assets.ts` (commit `e44584cd`): negada consulta de arquivo de planejamento ou financeiro quando não existe **autorização explícita** no workspace para o módulo respectivo. Não foram modificados documentos nem permissões persistidas.
- `scripts/security/client-assets-behavior.test.mjs` (commits `83986ba9` e `635c8af7`): seis testes comportamentais da resolução de autorização de arquivos em papéis e tenants sintéticos.
- `scripts/security/client-project-api-behavior.test.mjs` (commit `9f12b39c`): cinco testes de requisição da API do cliente com token ausente, conta de estrategista/staff, senha inicial pendente, tentativas de troca de tenant pela URL e associação incorreta.
- `.github/workflows/rotevo-ui2-pilot.yml` (commits `aaa872c9`, `b340f338`, `95550beb`): suíte ampliada e repetível em todos os pushes de código na branch.

## 3. Verificações reais já documentadas pelo Work

A execução autenticada anterior observou na prévia da Rotevo a navegação nos dez módulos do estrategista, cinco clientes e cinco projetos, 38 tarefas, renderização de HTML extenso, ocultação de rascunhos, foco/teclado, menu móvel e correções visuais. A revalidação da prévia `90d69cc` confirmou CSS, reflow aproximado em 340/454/681 px, seletor de projetos e modais. **Essas observações pertencem às versões examinadas pelo Work** e não equivalem à revalidação visual dos commits de segurança mais recentes.

## 4. Matriz de aceite pendente: não converter em aprovado

| Prioridade | Requisito | Condição de aprovação |
| --- | --- | --- |
| Bloqueante | Cliente autenticado | Entrar com conta **cliente** autorizada, validar páginas, módulos, documentos, conteúdo, aprovações e negações por outra conta/tenant |
| Bloqueante | Colaborador autenticado | Entrar com conta **staff** ativa e restrita; comprovar atribuições, leitura/edição permitidas, ações administrativas negadas, troca de senha e inativação |
| Bloqueante | Banco e RLS | Testar rotas e políticas contra **instância Supabase local/isolada** com dois tenants e perfis sintéticos, inclusive consultas por IDs de terceiros |
| Bloqueante | Persistência end-to-end | Gravar/reabrir HTML curto e extenso pela aplicação completa com sessão sintética, concorrência e restauração; os testes de rota + disco já foram aprovados |
| Bloqueante | Financeiro conectado | Exercitar, em banco sintético, faturas, parcialidade, estorno, documentos, recorrência, duas contas de clientes e perfil somente leitura |
| Bloqueante | Release e rollback | Aprovação explícita, comparação com produção atual, flags e políticas corretas, plano reversível e verificação pós-release |
| Importante | Acessibilidade/responsividade | 320, 375, 390, 430, 768, 1024, 1440 px; leitor de tela, foco, Tab/Shift+Tab, contraste e movimento reduzido |
| Importante | Observabilidade | Investigar falha inicial de consulta/sessão após autenticação observada anteriormente; não assumir causa |
| Decisão de compatibilidade | Workspace legado | `emptyWorkspace()` habilita módulos por padrão quando não existe registro do workspace em alguns endpoints. Revisar com dados sintéticos e regra de negócio antes de optar por *deny-by-default* universal, pois restringir unilateralmente pode ocultar serviços de clientes legados |
| Evolução separada | Arquitetura futura | Deduplicação plena da visão geral, modelo multicanal, atas juridicamente imutáveis, automações de tarefas e integrações Google |

**Nota:** o CI de fixtures não comprova autenticação real, isolamento efetivo no Supabase hospedado, experiência com leitor de tela nem integridade de fluxos de pagamento externos. O estado de prévia `READY` comprova build/deployment, não aceite funcional.

## 5. Orientações para completar no Work

1. Usar exclusivamente a prévia da branch mais recente, mantendo a proteção Vercel.
2. Acessar contas autorizadas **pelo formulário seguro**, nunca inserir senha nos chats ou nos logs.
3. Executar exclusivamente testes de leitura nos dados reais; para alterações usar Supabase local, fixtures e usuários sintéticos.
4. Registrar por cenário: identidade/role, tenant, projeto, endpoint, ação, esperado, observado, captura, commit e status.
5. Corrigir na branch e repetir todas as regressões, sem promover a `main` nem alterar flags de produção.
6. Somente ao encerrar todas as pendências bloqueantes, apresentar aceite e plano de release para autorização específica.

## 6. Estado de implantação

Sem merge na `main` e **sem publicação deliberada de produção** nesta rodada. A Vercel gera prévias automaticamente via GitHub. O estado de produção deve ser conferido novamente na preparação do release, nunca inferido de uma prévia READY.

## 7. Verificação adicional do ambiente Supabase (09/11/2026, somente leitura)

- A conexão Supabase disponibiliza apenas o projeto principal `Rotevo`. A listagem de branches mostra apenas `main`, sem ambiente isolado de banco para homologação de alterações e transações. Não foi criado projeto/branch sujeito a cobrança; testes mutáveis continuam pendentes de infraestrutura realmente isolada.
- Consulta de **contagens agregadas**, sem leitura de nomes, senhas ou documentos: **5 clientes, 5 workspaces configurados, 5 projetos e 0 clientes sem workspace** na data da verificação.
- A auditoria revelou um fallback desnecessariamente permissivo nas rotas `/api/client/projects`, `/api/client/workspace` e `/api/client/finance`: ausência de workspace invocava `emptyWorkspace()`, que inicializa todos os módulos, podendo permitir visualização de serviços não configurados. A branch foi ajustada para passar `data` ausente diretamente a `workspaceForClient`, que retorna `modules:[]` em configuração inválida/ausente. Os cinco workspaces cadastrados permanecem intactos; não houve alteração no Supabase.
- Testes `client-project-api-behavior.test.mjs` e `client-project-projection.test.mjs` passaram a proteger esse c…2007 tokens truncated…u00e7ões em contas/senhas/roles reais.
- **PostgreSQL 17 inteiramente descartável**: [execução 42742451497](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42742451497), resultado **SUCCESS**. O laboratório `scripts/security/pg-planning-json-lab.sql` comprova com fixtures: cliente A só vê metadados do projeto A; cliente B só vê os de B; ambas as identidades recebem negação ao selecionar o JSON privado; papel anônimo não recebe JSON nem metadados; `service_role` preserva leitura autorizada para endpoints.
- **Abrangência limitada**: o laboratório reproduz um recorte de grants e RLS em PostgreSQL, não uma cópia da instância completa de Auth/Storage/RPC do Supabase Rotevo. Não é homologação conectada das contas reais ou prova de migração segura no ambiente hospedado.
- A base conectada ainda mostra apenas a branch Supabase principal; a criação de ambiente hospedado isolado pode implicar custos e não foi executada. O fluxo ponta a ponta autenticado de Cliente/Equipe depende do navegador Work, indisponível nesta sessão.
- **Gate continua NO-GO**: somente após espelho Supabase isolado com migrações reconciliadas, testes reais de roles/RLS e editor, acessibilidade/navegação em Work, aprovação específica para alterar grants hospedados e validação pós-release.

## 11. Homologação de rotas administrativas e de equipe (09/11/2026)

**Trabalho novo apenas na branch de desenvolvimento:**
- `scripts/security/team-my-access-api-behavior.test.mjs` usa o handler original de `/api/team/my-access` em ambiente isolado, com respostas Supabase sintéticas: sessão ausente, troca de senha obrigatória, papel incorreto, colaborador inativo, falta de `projects.read`, projeto não atribuído, resposta reduzida a `id,title` e ausência de conteúdo interno.
- `scripts/security/admin-project-api-behavior.test.mjs` testa o handler real de leitura `/api/admin/project` com fixtures: autenticação, UUID, senha inicial pendente, perfis proibidos, inatividade, atribuição e permissão `projects.read`, administrador e seleção de projeto específico.
- Ambos adicionados à execução `Comprehensive offline regression matrix` no workflow `.github/workflows/rotevo-ui2-pilot.yml`. Sem HTTP externo, sem contas reais nem mutations.

**Evidências:**
- [Workflow `42743281212`](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42743281212): **SUCCESS**, commit `088eebfe`, incluindo equipe e build.
- [Workflow `42743457902`](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42743457902): **SUCCESS**, commit `0d576c71`, incluindo equipe, estrategista, regressões financeiras/documentais, TypeScript e build.
- [Laboratório PostgreSQL `42742451497`](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42742451497): **SUCCESS**, dois tenants, anonimato, permissões por coluna e `service_role`.

**Estado de bloqueio:** nenhuma instância Supabase autenticada isolada ou sessão Work de Cliente/Equipe foi acessada nesta rodada. As verificações são comportamento real dos handlers **com fronteiras Supabase simuladas**, não homologação da rede, login real nem RLS da estrutura hospedada. A publicação continua **NO-GO** até teste do esquema/RPC completo em laboratório, sessões autenticadas e correção específica da permissão de `planning_projects.data` no ambiente hospedado após autorização.

**Próxima execução recomendada:** utilizar ChatGPT Work para testar a prévia protegida com identidades de Cliente e Colaborador autorizadas. Em paralelo, preparar um ambiente Supabase local com baseline completo validado, executar `supabase test db` local e testes de API contra PostgREST/GoTrue reais, sem `--remote` ou vínculos de produção. A criação de Supabase Preview branch hospedada pode gerar custo e exige concordância explícita.

## 12. Homologação local com Supabase Auth + API REST reais

**Resultado: PASS / GitHub Actions:** [workflow 42744174264](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42744174264), commit `c1cb6794`.

No GitHub Actions, foi criada uma instalação **temporária e não vinculada** do Supabase CLI, com componentes reais de Auth, PostgREST e PostgreSQL. A migração `scripts/security/ui3-supabase-local-fixture.sql` cria uma estrutura sintética mínima, separada das migrations reais, com RLS por tenant e GRANT apenas de metadados, sem SELECT em `planning_projects.data`.

A execução `scripts/security/ui3-supabase-local-api-check.mjs` validou:
- criação de três identidades **fictícias**, exclusivamente no serviço Auth local;
- login via `signInWithPassword` de Cliente A, Cliente B e colaborador;
- Cliente A lê somente metadados do projeto A; Cliente B, somente do B;
- colaborador sem vínculo e anônimo não recebem dados de projetos;
- leitura da coluna `data` negada aos papéis comuns, inclusive quando vinculados ao tenant legítimo;
- escrita direta do JSON negada aos clientes;
- `service_role` continua lendo ambos os registros privados sintéticos;
- instalação local e contêineres descartados após os testes, com verificação de endereço loopback; **nenhum acesso ao Supabase hospedado**.

O primeiro ensaio da instalação local ([42743990907](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42743990907)) falhou por tratar uma resposta `42501` de acesso anônimo negado como erro, quando essa é uma resposta mais restritiva e segura que retornar zero linhas. Corrigida a asserção, o workflow passou integralmente.

**Limite essencial:** o teste usa Auth e Data API reais, mas um **subconjunto sintético** do banco. Ele ainda não reproduz todas as funções `rotevo_operations`, Financeiro, Storage, contratos, auditoria ou as migrations do schema hospedado. A permissão ampla da coluna `data` no Supabase de produção **não foi corrigida**; permanece um gate de publicação.

**Acessos externos pendentes:** revalidar a prévia UI3 com sessões autorizadas de Cliente e Equipe no navegador Work, cobrindo telas e permissões reais sem escrita. Para aplicar a correção de grants no banco hospedado, é necessária autorização específica após ensaio em schema equivalente e revisão do plano de rollback.


## 13. Homologação final possível, 10/11/2026

### Versão e escopo

Branch `feat/rotevo-ui2-pilot-20261109`, prévia READY do commit `097795e5c4b387f2e8a4af0c33aa8a83a71b4203`: https://rotevo-ecossistema-7wvtuzpcm-rotevo-marketing.vercel.app (deployment `dpl_GCeVwaHqLinMzNiZhrjv5nTwcJ8N`). A sincronização inicial não apresentou divergência. Os ensaios anteriormente aprovados foram mantidos como evidência, sem repetir a homologação manual de zoom/menu/foco nem o laboratório mínimo Supabase da seção 12. A regressão automática após correção integra o workflow existente.

### Resultado por frente

| Frente | Resultado desta rodada | Limite ou bloqueio |
| --- | --- | --- |
| Navegador autenticado | A solicitação segura resultou em sessão administrativa válida na última prévia; consultas sem escrita | A conta fornecida abriu `/admin`, não uma sessão de cliente ou colaborador |
| Navegação administrativa pendente | Projetos e Visão Geral alteram seção e URL; Voltar/Avançar restauram a seção correta | Correção antes coberta por DOM sintético agora validada na prévia real |
| Portal do Cliente | Evidências anteriores de projeção/API/RLS sintéticas preservadas | Sem identidade de cliente autorizada disponível: projetos, documentos, conteúdo, reuniões, Financeiro, contratos e restrições na UI não homologados nesta rodada |
| Colaborador | Evidências anteriores de atribuição/permissões/negações nos handlers preservadas | Sem identidade autorizada de equipe disponível: navegação e negações reais na UI pendentes; sem criar, redefinir ou personificar contas |
| Matriz responsiva/acessibilidade | Detectado contraste insuficiente em metadados pequenos do console: `#6A7890` sobre branco, aproximadamente 4,47:1; corrigido para `#687487`, inclusive fallback de vínculo, com regressão de mínimo 4,5:1 | API de navegador não oferece viewport exato; tentativa de redimensionamento nativo não produziu as dimensões requeridas. 320/375/390/430/768/1024/1440 px e leitor de tela continuam pendentes; testes de zoom aprovados não foram repetidos |
| Persistência sintética | HTML curto/extenso, CSS, JSONB reaberto, publicação existente preservada, UPDATE RETURNING e CAS concorrente aprovados após restrição de grants | Camada SQL real isolada; não é ciclo HTTP/UI completo de edição/publicação/Storage |
| Financeiro sintético | Funções financeiras SQL originais e asserções de ciclo de vida passaram no laboratório com grants restritos | Fixtures corrigidas para visibilidade explícita e parcelamento de receitas já suportado; Financeiro da prévia permaneceu desabilitado, sem alterar configuração ou registros |
| planning_projects.data | Proposta endurecida contra grants de PUBLIC e grants explícitos por coluna; RPCs editoriais originais continuam operacionais no ensaio | Nenhum SQL hospedado foi executado; exposição já documentada G2 permanece bloqueante |

O carregamento inicial mostrou uma falha transitória ao carregar planejamentos; uma atualização restaurou a tela. Não houve evidência suficiente para atribuir causa ou alterar o código de carregamento. Manter observabilidade e reprodução controlada como pendência.

### Correções e testes novos

- `AdminWorkConsole.tsx`: cor dos metadados e do fallback ajustada para a paleta com contraste AA no fundo branco observado. O teste `ui3-contrast.test.mjs` protege os metadados de texto pequeno; não representa auditoria de contraste de todas as telas.
- Proposta `ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`: remoção de grants independentes de tabela/coluna e pós-verificação de escrita do servidor, além das verificações anteriores. Arquivo de revisão, fora de migrations.
- `scripts/finance/database-isolated.sql`: fixtures alinhadas às migrations existentes de visibilidade de campanhas e parcelas a receber; nenhum comportamento financeiro de produção foi modificado.
- Novo laboratório `ui3-full-sql-compat-local.mjs`: PostgreSQL WASM em memória com 14 arquivos SQL selecionados, funções reais e dois tenants sintéticos; **7 grupos aprovados**. Auth usa funções locais de claims e Storage mínimo, não GoTrue/Storage reais. Não certifica todas as migrations hospedadas.
- Regressões locais afetadas: **22 testes aprovados**, zero falhas; ESLint do componente e TypeScript aprovados. Inventário estático: **19 chamadas diretas, zero acessos inseguros de JSON no navegador**. Workflow existente ampliado com contraste e laboratório SQL descartável, usando dependência temporária fixada em `@electric-sql/pglite@0.5.16`.
- Compatibilidade SQL/editor detalhada na matriz e no plano de remediação: manter as RPCs SECURITY DEFINER e suas verificações, sem revogação indiscriminada de EXECUTE; revisar separadamente fallback sem workspace e guarda de troca inicial de senha nas RPCs financeiras.

### Decisão consolidada

**NO-GO para implantação em produção.** Faltam identidades autorizadas de Cliente/Equipe, dimensões exatas/leitor de tela e ensaio integral do schema equivalente com Auth/PostgREST/Storage e ciclo HTTP do editor. A validação numérica da cor corrigida deve ser complementada pela prévia gerada deste ajuste. O gate G2 do banco hospedado continua aberto.

**Próxima etapa:** disponibilizar as duas sessões autorizadas e um laboratório local completo com dados fictícios, concluir as matrizes pendentes, ensaiar a remediação e rollback seguro. Somente depois solicitar autorização específica para grants hospedados e implantação. Nenhum dado real, permissão de produção ou política RLS hospedada foi alterado; sem merge na main, recursos pagos novos ou publicação em produção.
