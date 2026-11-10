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
- Testes `client-project-api-behavior.test.mjs` e `client-project-projection.test.mjs` passaram a proteger esse comportamento (tenant, perfil, módulos ausentes e configuração inexistente).
- `Supabase Security Advisors` (somente leitura) reportou **14 avisos INFO** de RLS ativo sem policies (incluindo tabelas deliberadamente acessíveis via servidor), **3 WARN** de funções SECURITY DEFINER executáveis por `authenticated` (`is_strategist`, `rotevo_editorial_decide`, `rotevo_editorial_idea_decide`) e **1 WARN** de proteção contra senhas vazadas desativada. Esses alertas **não provam exploração**: funções de aprovação editorial usam JWT/identidade do cliente e exigem revisão completa antes de qualquer revogação; tabelas com RLS sem policy podem estar bloqueadas intencionalmente. Links de referência: [Supabase Database Linter / RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- A condição de aceitar a UI 3.0 continua a exigir instância Postgres/Auth/RLS isolada, testes autenticados com Cliente e Equipe, matriz responsiva exata e uma decisão específica de segurança sobre os alerts. Não alterar políticas, autenticação, migrations, flags ou permissões da produção sem um plano avaliado.

### Revisão adicional das funções de aprovação editorial (somente leitura)

A consulta de metadados SQL confirmou que `public.rotevo_editorial_decide` e `public.rotevo_editorial_idea_decide` verificam `auth.uid()`, perfil de cliente, vínculo `planning_projects.client_id`, estado editorial, visibilidade explícita, versão e validade da decisão, antes da gravação. A presença de `SECURITY DEFINER` é compatível com essa arquitetura, mas exige auditoria especializada: os avisos do Supabase não devem ser eliminados por revogação indiscriminada, pois as aprovações legítimas precisam dessas rotas.

**Lacuna a discutir antes do release:** os dois procedimentos utilizam a ausência de um registro de `client_workspaces` como compatibilidade para o módulo Conteúdo (a expressão `exists(... not has content)` somente bloqueia quando há um workspace que desabilita o módulo). Os endpoints HTTP foram reforçados para negar módulos sem workspace; harmonizar a regra SQL das aprovações, mantendo compatibilidade controlada, requer uma migração planejada e testes de banco isolado. **Nenhum procedimento SQL foi alterado nesta auditoria.**

## 8. Gate crítico de confidencialidade do JSON de planejamento

**NO-GO confirmado em consulta somente leitura ao Supabase hospedado:** `authenticated` possui SELECT na coluna `public.planning_projects.data`; políticas RLS vinculam linhas ao cliente, mas não removem propriedades internas do JSON. A API `/api/client/projects` e `projectForClient` impedem esses campos na resposta do Portal, **porém não eliminam a via de leitura direta pelo Data API**. O teste de caracterização `supabase/tests/database/planning_data_exposure_characterization_test.sql` já documentava esse risco.

O risco está limitado ao potencial acesso do cliente ao JSON **do próprio tenant**; não houve exploração de credenciais nem leitura de conteúdo privado. O teste de integração `scripts/security/ui3-raw-json-release-gate.test.mjs` agora acompanha o uso dos endpoints autorizados no frontend, mas **não transforma a base em segura**.

Consultar o plano [`docs/security/ui3-planning-data-grant-remediation-20261109.md`](../security/ui3-planning-data-grant-remediation-20261109.md) para a remediação em laboratório, proteção de edição administrativa, testes RLS com dois tenants, migração reversível e aprovação específica. A publicação da UI 3.0 deve continuar **bloqueada** até o problema ser resolvido e comprovado.

Fonte de engenharia: [Supabase RLS / pgTAP](https://supabase.com/docs/guides/database/postgres/testing-row-level-security).

## 9. Ensaio executado do bloqueio G2 — sem produção (09/11/2026)

**Aprovado no CI:**
- [GitHub Actions — laboratório PostgreSQL descartável, execução 42741072308](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42741072308), commit `3a85e1bd`, conclusão **SUCCESS**. O runner provisionou PostgreSQL 17 sintético (sem credenciais Rotevo), reproduziu grants amplos e isolamento de linhas por tenant, revogou `SELECT,UPDATE` de papéis comuns, confirmou negação do JSON, seleção dos metadados e leitura por `service_role`. Transação integralmente revertida.
- [GitHub Actions — regressões UI3, execução 42741380148](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42741380148), commit `e318c931`, conclusão **SUCCESS**. Testes de autorização e rotas, documentos HTML, Financeiro, TypeScript e build aprovados.
- Proposta revisável, não executada, em `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`. Inclui preflight de schema, `REVOKE SELECT, UPDATE` para `anon/authenticated`, `GRANT SELECT` apenas nos metadados, pós-verificação de negação do JSON e preservação do `service_role`. Não se trata de migration aprovada.
- Regressão em `scripts/security/ui3-raw-json-release-gate.test.mjs` obriga o uso de endpoints seguros pelos consumidores administrativos centrais e verifica a existência do bloqueio no SQL de proposta.

**Importante:** o laboratório PostgreSQL não replica integralmente o Supabase hospedado, nem Auth/Storage/rotinas/RLS da Rotevo. O campo `planning_projects.data` no ambiente de produção ainda mantém permissão direta `SELECT` para `authenticated`; a homologação de banco real isolado, a correção de grants hospedados e a verificação autenticada de cliente e equipe **seguem pendentes**.

**Validação adicional do esquema hospedado (consulta apenas de catálogo):** `authenticated` não pode alterar `profiles.role` nem `profiles.client_id`, mas pode alterar `profiles.full_name`; o antigo gate G1 está coberto pelo estado atual e não precisa ser reaberto sem nova evidência.

**Ação final necessária:** preparar espelho Supabase isolado a partir de baseline verificado, testar o SQL proposto com identidades reais *sintéticas*, preservar o editor do estrategista e obter autorização explícita para a eventual mudança sensível no banco hospedado. Nenhuma alteração em produção nesta rodada.

## 10. Rodada adicional — autenticação administrativa e RLS sintética ampliada

- **GitHub Actions**: [execução 42742142119](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42742142119), resultado **SUCCESS**. A UI3, TypeScript, build e testes existentes permaneceram íntegros depois de incluir o guard de troca inicial de senha em quatro rotas de projeto:
  - `/api/admin/project` (consulta de JSON pelo servidor);
  - `/api/admin/project/update`;
  - `/api/admin/project/status`;
  - `/api/admin/project/delete`.
- `scripts/security/client-project-projection.test.mjs` agora verifica que JWT é validado e a marca `app_metadata.rotevo_password_reset_required` é analisada **antes** da criação do cliente privilegiado e da consulta ao perfil. Sem alterações em contas/senhas/roles reais.
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
| Matriz responsiva/acessibilidade | Detectado contraste insuficiente em metadados pequenos do console: `#6A7890` sobre branco, aproximadamente 4,47:1; corrigido para `#687487` (aproximadamente 4,73:1), inclusive fallback de vínculo, com regressão de mínimo 4,5:1 | API de navegador não oferece viewport exato; tentativa de redimensionamento nativo não produziu as dimensões requeridas. 320/375/390/430/768/1024/1440 px e leitor de tela continuam pendentes; testes de zoom aprovados não foram repetidos |
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


### Evidência final da correção publicada na branch

- Commit de implementação: [`4074be660d8a8ef4432d138f376f03e8f2fa11ac`](https://github.com/rotevo-marketing/rotevo-ecossistema/commit/4074be660d8a8ef4432d138f376f03e8f2fa11ac), descendente direto do HEAD verificado `097795e5`, sem sobrescrever alterações remotas.
- [GitHub Actions 42746444329](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42746444329): **SUCCESS**. Contratos visuais/UI3, autorização e jornadas sintéticas, matriz offline, contraste, laboratório SQL de sete grupos, TypeScript e build concluídos com sucesso.
- [Prévia Vercel da correção](https://rotevo-ecossistema-8ssltzom4-rotevo-marketing.vercel.app): deployment `dpl_HEZkru9pQG5w7SZniLjG9xhDQ1gQ`, **READY**, `target:null` (Preview), código do commit `4074be6`. A inspeção administrativa no navegador foi no commit `097795e5`; a nova cor foi comprovada pelo cálculo/regressão e build, sem alegar nova autenticação visual neste deployment.
- O relatório mantém as evidências anteriores integralmente e distingue aprovação de laboratório, aprovação no navegador e pendências de implantação. O resultado global permanece **NO-GO**.


## 14. Continuidade com identidade própria de cliente, 10/11/2026

### Homologação real por consultas

A prévia protegida READY do commit `6511c48` (`https://rotevo-ecossistema-d83a8n8c3-rotevo-marketing.vercel.app`) foi acessada pelo procedimento seguro do Work com uma **identidade própria de cliente**. A página autenticada confirmou `/cliente` e o Portal do Cliente. Nenhum identificador, credencial, link privado ou texto de cliente é reproduzido neste registro público.

| Frente | Evidência observada | Resultado e limite |
| --- | --- | --- |
| Navegação | Visão geral, Planejamento, Tarefas e entregas, Conteúdo, Campanhas, Reuniões, Contrato, Drive e Financeiro acessíveis pelo menu | PASS para navegação entre as nove seções disponíveis na identidade fornecida, no viewport desktop disponível |
| Projetos e documentos | Planejamento autorizado carregou; havia zero documentos disponíveis para leitura; documento em elaboração mostrou aviso e previsão, sem revelar o rascunho | PASS do estado sem publicação; leitura de documento publicado nessa conta não pode ser homologada por falta de exemplar disponibilizado |
| Conteúdo | Calendário mensal e detalhe de material compartilhado abriram; dialog iniciou foco em Fechar, Escape fechou e devolveu foco ao cartão | PASS de consulta e ciclo de foco observado; nenhuma aprovação, solicitação de ajuste ou edição executada |
| Tarefas, campanhas e reuniões | Estados vazios consistentes; histórico de reuniões navegável sem registros compartilhados | PASS dos estados observados; fluxos com registros devem continuar no laboratório sintético |
| Contratos | Mensagem de ausência de contrato disponibilizado | PASS do estado vazio; nenhuma assinatura ou aceite; documento contratual presente não verificado nessa conta |
| Drive | Nove categorias compartilhadas e links HTTPS renderizados | PASS da listagem; permissões de destinos externos não foram auditadas nem alteradas |
| Financeiro | Aguardando integração, sem confirmação de saldos, vencimentos ou pagamentos; lançamentos desativados | PASS do estado seguro desativado; Financeiro conectado continua restrito ao laboratório |
| Acesso administrativo | Tentativa de navegação a `/admin` com a sessão de cliente terminou em `/estrategista/login`; o shell inicial não carregou registros administrativos | PASS da negação observada; não houve tentativa de consultar JSON privado real ou outros tenants pela Data API |
| Equipe | A solicitação segura própria terminou na mensagem “Este usuário não tem permissão de estrategista.”, sem entrar em `/equipe/meu-acesso` | BLOQUEADO: a tentativa não comprovou identidade ativa de colaborador. Não alterar contas/roles para contornar a restrição |

As sessões de login/logout inerentes ao procedimento de autenticação foram usadas normalmente. Nenhuma conta, senha, documento, aprovação, registro operacional ou financeiro real foi alterado. As evidências de homologações anteriormente aprovadas foram mantidas, sem repetir seus ensaios manuais.

### Acessibilidade e matriz responsiva

A inspeção real encontrou um landmark `main` do leitor de planejamento aninhado no `main` do portal. A branch substituiu apenas o elemento interno por uma região `section` nomeada “Leitura do planejamento”, preservando classes, lógica e conteúdo. ESLint e TypeScript locais passaram; a validação visual e com leitor de tela da nova região permanece pendente.

| Largura CSS solicitada | Situação |
| --- | --- |
| 320 px | Pendente de controle de viewport exato |
| 375 px | Pendente de controle de viewport exato |
| 390 px | Pendente de controle de viewport exato |
| 430 px | Pendente de controle de viewport exato |
| 768 px | Pendente de controle de viewport exato |
| 1024 px | Pendente de controle de viewport exato |
| 1440 px | Pendente de controle de viewport exato |

A capacidade de viewport exato continua indisponível na interface documentada desta sessão. As tentativas e aprovações anteriores de redimensionamento/zoom não foram repetidas. O desktop disponível de 1363 px permitiu consultar as seções sem sobreposição visível na listagem de arquivos. Isso **não substitui** os sete tamanhos requeridos. Não há resultado de leitor de tela nesta sessão, nem aprovação global de contraste/teclado por todos os módulos.

### Correções comprovadas e regressões

- `72a84d0`: `/api/presentation/project` agora recusa troca inicial de senha pendente antes de criar cliente privilegiado e nega planejamento sem workspace/módulo explícito. O handler original retornava indevidamente 200 nos dois cenários sintéticos antes da correção; depois, **4/4 testes comportamentais passaram**. A correção não mudou grants ou políticas hospedadas.
- `f72b4ee`: correção do landmark interno do leitor de planejamento para região nomeada, a partir do DOM real observado.
- `412bdc8` e `cfadc37`: ajustes exclusivamente em fixtures do novo laboratório, respeitando `label` do HTML visual e o schema completo de workspace (`modules`, `contracts`, `folders`). A primeira e a segunda execução integrada falharam nesses contratos de fixture; as asserções de autorização não foram relaxadas.
- Manifesto único `ui3-sql-baseline.mjs`: os 14 arquivos selecionados são compartilhados entre PostgreSQL WASM e o laboratório Supabase real. Não representa reconciliação completa do schema hospedado.
- Workflow existente de laboratório ampliado, sem novo projeto hospedado: Supabase CLI fixado em `2.121.0`, GoTrue/PostgREST/Storage reais e Next.js local com rotas originais. As variáveis de teste e ativação financeira só existem no runner descartável, com endpoints loopback e dados fictícios.
- Tentativa de executar stack nativa local sem Docker não conseguiu baixar os binários por restrição de DNS/rede. O registro temporário dessa tentativa foi destruído. A execução integrada foi encaminhada ao runner descartável já existente, sem criar recursos pagos hospedados.

O plano de remediação foi revisto para distinguir aborto transacional de rollback de uma restrição confirmada. O teste legado que demonstra restaurar permissões amplas não é um runbook de produção. Nenhum retorno automático pode reabrir o JSON; manter guardas, servidor compatível e contenção revisada. RPCs diretamente expostas ainda exigem harmonização de workspace/senha inicial e ensaio de retorno seguro em schema equivalente.


### Evidência final do laboratório integrado e da branch

| Execução | Código | Resultado |
| --- | --- | --- |
| [Regressão 42749544904](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42749544904) | `72a84d0` | SUCCESS: contratos UI3/autorização, quatro novos casos da apresentação, matriz offline, sete grupos SQL WASM, TypeScript e build |
| [Regressão 42750071736](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42750071736) | `f72b4ee` | SUCCESS após a correção semântica do leitor de planejamento, incluindo TypeScript e build |
| [Integração 42750264760](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42750264760) | `cfadc37` | SUCCESS: primeiros cinco grupos com serviços reais locais e seis identidades fictícias |
| [Integração final 42750794070](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42750794070) | `3912c2e` | SUCCESS: seis grupos, incluindo documentos de contrato/fatura e suas negações; stack descartada ao terminar |

O ensaio integrado final comprovou, exclusivamente no runner temporário:

1. Login GoTrue real de administrador, clientes A/B, colaborador com leitura, colaborador sem permissão e identidade com senha inicial pendente; rotas HTTP originais respeitando tenant, atribuições e negações; RLS/grants negando JSON bruto ao cliente e preservando metadados do seu projeto.
2. Salvar/reabrir HTML curto e extenso com CSS pelo handler documental original; preservar versão publicada anterior e notas internas; rejeitar CAS obsoleto; completar revisão, aprovação e publicação fictícias; retornar somente a versão publicada pela apresentação autorizada.
3. Upload de imagem ao Storage privado pela API; resolução assinada somente quando referenciada em documento publicado; integridade dos bytes; negação de acesso direto ao objeto e de outro tenant.
4. Financeiro com rotas HTTP e funções SQL originais: lançamento, liquidação parcial, idempotência, colaborador de leitura sem escrita, cliente sem escrita e ausência de despesas internas/lançamentos de outro cliente na projeção.
5. Links e bytes privados de arquivos sintéticos de contrato/fatura, publicação do vínculo no workspace/Financeiro e negações por tenant e perfil aplicáveis. **Não é teste de renderização de PDF, assinatura ou aceite contratual.**
6. Ausência de workspace e troca inicial de senha mantendo as fronteiras fechadas nas rotas de apresentação, Financeiro e assets.

`3912c2e` acrescenta o sexto grupo ao laboratório aprovado, sem mudança de comportamento da aplicação. O manifesto de 14 arquivos mais a proposta de grants foi aplicado **somente ao projeto local não vinculado** do runner. GoTrue/PostgREST/Storage são reais nesse ensaio, sem mocks; isso não transforma a seleção em espelho completo do schema hospedado nem em teste visual do editor. O laboratório mínimo antigo da seção 12 permaneceu como evidência anterior e não foi reexecutado como tarefa separada.

Prévia do código final `3912c2e`: https://rotevo-ecossistema-716npt11h-rotevo-marketing.vercel.app, deployment `dpl_DnXZ5Tuimdmjhe9hcd2Lhb5kBe4k`, **READY**, `target:null` (Preview). A sessão de cliente no navegador foi homologada em `6511c48`; não se atribui uma nova validação visual autenticada às correções posteriores apenas pela conclusão do build.

### Situação final e próxima etapa

**Aprovação parcial ampliada, ainda NO-GO para publicação da UI 3.0.** O Portal possui agora validação com identidade própria para as seções/estados efetivamente disponíveis; o backend integrado de documentos, Auth, API, Storage e Financeiro passou com dados fictícios. As correções foram enviadas apenas à branch de desenvolvimento, preservando a história remota.

Bloqueios restantes efetivos:
- identidade ativa de colaborador que alcance a UI da Equipe, para verificar módulos, atribuições e acessos negados no navegador;
- matriz visual nas sete larguras exatas, leitor de tela e conferência visual das correções semânticas; exemplar publicado de planejamento/contrato ou fixtures de UI isolada para os estados ausentes na conta real;
- reconciliação do baseline com o schema hospedado completo, revisão das RPCs diretamente expostas e ensaio operacional de retorno seguro;
- remediação G2 do banco hospedado ainda sem aplicação/validação autorizada nesta rodada. Nenhum teste de exposição foi executado sobre JSON real.

**Próxima etapa recomendada:** concluir essas validações em ambiente que permita viewport exato e com identidade própria de Equipe; reconciliar schema/RPCs e ensaiar o retorno seguro. Depois apresentar a migration e o plano de implantação para **autorização específica**, antes de qualquer alteração hospedada ou publicação. Não há autorização implícita de produção neste relatório.

Nenhum dado real, conta, permissão de produção ou política RLS hospedada foi modificado. Não houve merge na main, criação de recursos pagos hospedados ou publicação em produção.

## 15. Diagnóstico final da Equipe e gates de release — 10/11/2026

A conferência de produção **somente por contagem**, sem leitura de dados pessoais, encontrou **0 perfis `staff`**, **1 registro ativo em `team_members`** e **0 vínculos ativos para perfis `staff`**. O login comum de `/estrategista/login` já redireciona perfis `staff` ao Portal da Equipe, mas nenhuma conta presente satisfaz o contrato de autorização. Portanto, a tentativa no Work que retornou falta de permissão de estrategista é compatível com a ausência de identidade de Equipe; não justifica alterar contas reais. A mensagem de perfil não provisionado foi esclarecida na branch, com regressão de fluxo de login.

A mesma inspeção de catálogo confirmou `authenticated` com leitura e escrita direta em `planning_projects.data`. A correção de grants permanece proposta, sem execução hospedada. Não criar staff ou habilitar convites em produção sem autorização e processo próprios.

Documento operacional para continuidade: [`rotevo-ui3-release-gates-and-team-identity-20261110.md`](./rotevo-ui3-release-gates-and-team-identity-20261110.md), com pré-requisitos do perfil de teste, matriz de visualização final, gate SQL e plano de recuperação que não restaure grants inseguros.

**O estado geral permanece NO-GO.** Testes automatizados da alteração de copy devem ser confirmados no último CI; os testes funcionais de Equipe ainda dependem de conta `staff` autorizada. Nenhuma conta, flag, permissão, RLS ou registro real foi modificado.

## 16. Homologação visual e funcional da Equipe em ambiente descartável — 10/11/2026

**Resultado do laboratório integrado e da UI sintética: PASS**, [GitHub Actions 42754499874](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42754499874), commit `95ad5181`.

O workflow `.github/workflows/ui3-supabase-local-api-lab.yml` foi ampliado para executar **Playwright Chromium em ambiente isolado**, após provisionar a instalação temporária **Supabase Auth/PostgREST/Storage e aplicação Next.js** com as configurações exclusivamente de localhost. O script `scripts/security/ui3-staff-browser-local.mjs` cria identidades, cliente, projeto, vínculo de colaborador e `projects.read` fictícios, e utiliza o **formulário real da Rotevo** em `/estrategista/login`.

### Evidências e limites

- **Login e navegação real:** formulário de login com `staff` redirecionou para `/equipe/meu-acesso`, com título da Área da Equipe e **um projeto atribuído**, sem conteúdo JSON interno.
- **Controle de visibilidade:** ausência de `finance.read` manteve o atalho do Financeiro oculto; nenhuma informação de cliente não autorizada exibida.
- **Responsividade da Área da Equipe:** **320, 375, 390, 430, 768, 1024, 1440 CSS px** testados em Chromium headless, viewport medido; **sem transbordamento horizontal** nos sete casos. Não extrapolar este resultado aos outros portais.
- **Teclado e sessão:** botão Sair aceita foco, Tab alcança outro controle interativo e logout retorna ao login.
- **Evidência de imagem sintética:** [artifact do GitHub Actions (390 px)](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42754499874/artifacts/13735585534), sem informações de clientes reais, retido por cinco dias.
- **Integração existente:** seis grupos integrados de Auth, API, Storage, documentos e Financeiro permaneceram aprovados na mesma execução.
- **Infraestrutura:** o runner descartou Supabase, Next local e credenciais sintéticas ao finalizar; Playwright foi instalado antes de iniciar o Next para evitar instabilidade de hidratação. Nenhuma conta, dado, flag ou permissão do Supabase hospedado foi tocada.

### Histórico de correção da automação

As primeiras execuções do navegador falharam pela ausência de suporte à Ubuntu 26.04 no Playwright antigo, depois por instalação de dependências durante a execução do Next; um teste subsequente utilizava uma checagem de foco sem referência inicial. Essas falhas foram corrigidas no **harness de teste**, e a execução `42754499874` terminou em **SUCCESS**. Não foram diagnosticadas falhas correspondentes de autenticação/permissão em produção por essas tentativas.

### Gates ainda abertos

1. **Conta Equipe no ambiente hospedado:** o Supabase tem **0 perfis staff**, conforme consulta agregada de leitura. A UI de equipe foi homologada em **instância isolada**, mas não na prévia hospedada com staff real. Disponibilizar conta de teste mediante processo administrativo autorizado, sem converter clientes nem ativar convites apenas para o teste.
2. **Outras telas e leitores:** as sete larguras foram testadas na **Área da Equipe**; permanecem largura exata em Estrategista e Cliente, leitura com tecnologia assistiva e exemplos publicados de Planejamento/Contrato na UI isolada.
3. **Remediação G2:** o banco hospedado continua permitindo leitura/escrita direta em `planning_projects.data` a `authenticated`. O script de proposta exige aprovação específica e espelho de esquema/RPC reconciliado antes de execução.
4. **Implantação:** nenhum merge/deployment de produção realizado ou autorizado.

**Próxima etapa:** concluir matriz visual dos painéis do Estrategista e do Cliente e a revisão do pacote de alteração G2/rollback; somente após aceite integral solicitar autorização específica para migração hospedada e release.

## 17. Matriz responsiva dos três portais em navegador isolado — 10/11/2026

**GitHub Actions:** [execução 42758775354](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42758775354), commit `b4a76997`, conclusão **SUCCESS**.

Ampliação do laboratório temporário com Playwright Chromium, Next.js e Supabase Auth/PostgREST/Storage reais (banco e identidades **sintéticos**). As rotas reais de login foram utilizadas para os três papéis; o script novo `scripts/security/ui3-portal-browser-local.mjs` inicia sessões fictícias de cliente e estrategista, verifica a tela de Visão geral e a ausência do conteúdo `internalNotes` no Portal.

| Perfil / tela de entrada | 320 | 375 | 390 | 430 | 768 | 1024 | 1440 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Estrategista / Visão geral | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Cliente / Visão geral | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Equipe / Meu acesso | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

**Critério testado:** largura `document.documentElement.scrollWidth <= clientWidth + 1`, heading esperado renderizado e login na rota correspondente. Na Equipe, houve verificação adicional de projeto atribuído, acesso Financeiro negado, retorno por logout e foco via Tab. **Não extrapolar estes testes a todos os módulos, componentes internos, contrastes ou leitor de tela.**

**Evidências de 390 px, exclusivamente dados fictícios:** [artifact GitHub Actions](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42758775354/artifacts/13735899992), contendo capturas de Estrategista, Cliente e Equipe. Retenção de cinco dias. A instalação e as contas temporárias foram descartadas pelo runner.

### Gating residual para publicação

1. **Acessibilidade assistiva e telas internas:** leitor de tela, contrastes finais, menus/modais e todas as seções nos viewports selecionados permanecem pendentes de conferência específica; a matriz acima aprova somente as telas de entrada.
2. **Exemplares publicados:** leitura visual de documentos de planejamento, contratos e faturas no Portal com arquivos e conteúdo fictícios, sem publicar registros reais.
3. **Banco hospedado:** bloquear `authenticated` de ler e escrever `planning_projects.data`; a proposta foi provada com PostgreSQL e Supabase isolados, mas o ambiente hospedado continua com grants amplos. Exigem-se migração revisada, esquema completo reconciliado, rollback sem reabertura de acesso e autorização separada.
4. **Equipe hospedada:** não há identidade `staff` na base principal; a UI já passou em Supabase descartável, mas a prévia protegida não foi testada com colaborador real.

**Nenhuma mudança em produção ou nas contas reais. A publicação permanece NO-GO até o aceite desses requisitos.**

## 18. Contraste automatizado no navegador e matriz visual — 10/11/2026

**Resultado aprovado:** [GitHub Actions 42794112989](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42794112989), commit `14f1c78d`, conclusão **SUCCESS**; [validação de TypeScript, build e testes de código 42794047358](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42794047358), conclusão **SUCCESS**.

### Defeito encontrado e corrigido
O navegador de homologação com `axe-core`, na página inicial administrativa a 390 px, detectou seis nós com contraste abaixo de WCAG AA: mensagem de estado vazio do console (`#69778E` sobre `#F7F8FB`), legenda informativa (`#7A8799` sobre branco) e quatro textos de resumo financeiro (`#697386` sobre `#F6F7FB`). Correção restrita aos componentes:
- `src/Components/admin/AdminWorkConsole.tsx` (`7ad193a3`)
- `src/Components/admin/AdminOperationsOverview.tsx` (`e32cebb1`)

Os textos envolvidos passaram a usar `#606D82`, contraste calculado de aproximadamente **4,90:1** sobre `#F6F7FB`, **4,93:1** sobre `#F7F8FB` e **5,24:1** sobre branco. Foi ampliado `scripts/security/ui3-contrast.test.mjs` (`8d24c5e4`) para guardar as três superfícies e a verificação automatizada voltou a ser acionada para mudanças nesses componentes.

### Evidência de aprovação no navegador
- `PASS integrated: 6 groups`: Auth, API, Storage, documentos e Financeiro em stack temporária com dados fictícios.
- `PASS staff actual UI`: login e permissão da Equipe com projeto atribuído sem dados internos.
- Cliente, Estrategista e Equipe: testes de overflow aprovados em **320, 375, 390, 430, 768, 1024 e 1440 CSS px** nas telas iniciais.
- `ACCESSIBILITY client []` e `ACCESSIBILITY strategist []`: nenhuma violação nas regras `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` inspecionadas pelo axe nas telas iniciais a 390 px.
- Capturas com identidades sintéticas: [artifact do GitHub Actions 13752998334](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42794112989/artifacts/13752998334). Retenção por cinco dias.

**Limite da evidência:** análise axe não equivale a leitor de tela humano; a matriz mede as telas de entrada e não todas as seções internas em sete larguras. Conteúdos publicados de Planejamento/Contratos também aguardam inspeção visual de exemplares sintéticos. **O bloqueio G2 no banco hospedado permanece sem remediação**, e nenhum grant, RLS, conta ou registro de produção foi alterado.

**Próximo gate:** inspeção assistiva e telas internas, equivalência final do banco/RPC com produção em laboratório, aprovação específica do SQL de grants e só então autorização de publicação/rollback. Estado geral **NO-GO para implantação**.

## 19. Preparação do release e prova do SQL exato — 10/11/2026

A proposta `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql` foi reforçada com **preflight explícito de RLS ativo e das nove colunas de metadados** e pós-verificação da ausência de acesso efetivo à coluna `data`, preservando `service_role` (commits `43b8b573` e `fdd6d949`).

**GitHub Actions [42795642775](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42795642775), commit `3e977723`, conclusão SUCCESS**: o laboratório descartável de PostgreSQL 17 executou tanto a simulação de dois tenants quanto, em nova fixture, **a própria proposta SQL exata**, incluindo BEGIN/COMMIT, com RLS ligado, roles e o schema esperado. Resultado: `PASS: exact release proposal SQL guarded by RLS, schema and effective privilege assertions`. O novo arquivo `scripts/security/pg-planning-proposal-validation.sql` e o workflow de banco repetem essa prova a cada alteração da proposta.

A revisão da versão atualmente publicada `bec8ee26` mostrou que a página principal de edição de planejamento consulta diretamente apenas metadados do projeto; outros acessos privilegiados ainda exigem inventário completo antes de alterar os grants reais. **Não foi feito clone completo de produção, nem migração hospedada.**

Foi criado o [checklist operacional de release](./rotevo-ui3-release-candidate-operational-checklist-20261110.md), com preflight de banco sem dados pessoais, condições de GO/NO-GO, ordem de publicação e recuperação de aplicação que **não reabre SELECT(data)**.

**Estado segue NO-GO** enquanto a correção no Supabase hospedado, equivalência completa de schema/RPC, leitura assistiva, exemplares publicados e autorização específica não estiverem concluídos. Os testes aprovados demonstram viabilidade da proposta, mas não dão autorização de produção.
