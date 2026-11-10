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
