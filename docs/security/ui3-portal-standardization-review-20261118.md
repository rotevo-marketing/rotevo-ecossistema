# Portais dos Clientes UI 3.0: implementação local e plano de liberação

Data: 18/11/2026. Branch local: `fix/client-portals-mirroring-20261118`.
Estado: implementação consolidada localmente; publicação bloqueada pelas verificações de ambiente indicadas abaixo. Nenhum deployment, push, merge, PR, migração, alteração de Secret ou atualização de dados de produção foi executado nesta entrega.

## Base e preservação

- Produção confirmada novamente pelo hostname `app.rotevo.com.br`: commit `27c1681ddbe1d1f647547f36cc808a49872c8107`, deployment `dpl_EvYz522ucWob8dDQLD3gPkEbv1jG`, READY.
- HEAD remoto de `main` consultado: `0fe4cb0ee2a94301a4b2ee78823ac81f0d307604`, anterior à produção. Esta correção parte do release publicado, preservando a Agenda R2 e as melhorias anteriores. Não incorpora o 02.01 ainda não publicado.
- Árvore-base de 608 arquivos conferida por SHA Git: `b41fcd8d091ecaff03c5d22bef061e1013f6c775`.
- O `vercel.json` consultado contém `git.deploymentEnabled=false`. O retorno da API de projeto não expõe todos os ajustes de integração Git/build. Por isso, o fluxo utilizado não depende dessa configuração: somente branch/commit local, sem qualquer operação remota de escrita. O push deste checkout tem destino localmente desabilitado.
- Backups privados e o contêiner `rotevo-restore-20261016` não foram acessados ou modificados.

## Causas e correções

| Causa confirmada | Correção preparada |
|---|---|
| Tarefas operacionais no JSON `executionTimeline` dependiam de `visibleToClient`; as 18 da Elania estavam privadas e não eram atribuições formais | Projeção automática para registros `kind=task`, preservando ID e fonte original, sem copiar registros ou criar responsabilidades |
| `profiles.client_id` e `client_users` divergiam por ausência do segundo vínculo em quatro clientes | RPC transacional de provisionamento, idempotente, restrita a `service_role`; proposta de regularização dos vínculos existentes |
| Piloto restrito no banco e na allowlist da API | Modo adicional `enabled_clients`, que exige vínculo consistente, cliente ativo e habilitação no banco; modo padrão continua `pilot` |
| Sininho desaparecia diante de erro/restrição | Ícone permanece; estados de carregamento, vazio, acesso restrito e falha técnica são distintos; contador vem da contagem autorizada completa |
| Consultas mantinham estados antigos | Revalidação após mutações confirmadas, ao recuperar foco e a cada 30 segundos em abas visíveis, com coalescência e controle de respostas antigas |
| Abertura de tarefa por notificação ainda dependia do sinalizador legado | Navegação utiliza a mesma regra de visibilidade do espelhamento e mantém identificação de projeto/tarefa |

## Regras de dados e segurança

Tarefas do projeto são somente leitura no cliente. A API de atualização administrativa continua recusando o perfil cliente, independentemente dos botões. O cliente não pode criar, editar, concluir, reatribuir, excluir ou arquivar tarefas por esse fluxo.

A projeção contém apenas ID, título, responsável apresentado, situação, datas, prioridade e contagem de progresso. Não inclui IDs internos do responsável, log operacional, dependências, textos de checklist, links internos ou notas privadas. A descrição usa `clientSummary`, consentimento explícito de descrição ou o compartilhamento histórico já autorizado. Descrições antes privadas não passam a ser públicas por causa do espelhamento. Na edição, o resumo não é preenchido automaticamente a partir dessas descrições privadas.

`clientVisibility=confidential` exige justificativa; o servidor registra autor, data, motivo e alteração. O histórico não pode ser forjado pelo payload. Exclusão lógica e arquivamento continuam retirando o item da visão ativa; conclusão permanece no histórico. Entregas e marcos da Linha do Tempo mantêm a regra anterior de compartilhamento explícito.

Atribuições formais mantêm preparação e liberação explícitas, destinatário, instruções, entrega pelo Drive, validação/devolução, versão e histórico. O espelhamento não gera atribuições ou notificações de responsabilidade.

Conteúdos e reuniões mantêm seus controles de compartilhamento. Conversas permanecem separadas das decisões de aprovação e não concedem edição operacional. O novo predicado de tarefa é compartilhado entre projeção, autorização de conversa e propostas das RPCs. Conteúdo ainda exige disponibilização explícita.

Consultas somente de leitura ao catálogo de produção confirmaram as políticas existentes e ausência de grants diretos de `planning_projects` para `anon`/`authenticated`. Nenhum grant bruto ao JSON é proposto. As tabelas privadas de atribuições/notificações não ganham acesso direto. As RPCs preservam identidade, associação de cliente, G2, versão e revogação. Isso é revisão de configuração e testes de aplicação, não prova de execução das novas políticas em Postgres.

## Banco e configuração: propostas, não aplicadas

1. `sql/ui3-portal-standardization-preflight.sql`: conferência dos registros afetados, conflitos de vínculo, estado do piloto, hashes/ACL das funções e grants.
2. `sql/ui3-portal-standardization-structures-PROPOSAL-ONLY.sql`: quatro novas funções auxiliares de visibilidade, provisionamento e notificações; adequação de sete funções existentes para a nova visibilidade; idempotência do evento de mensagem. Não cria tabela nem altera registros operacionais. Provisionamento novo somente por chamada autorizada ao RPC de serviço.
3. `sql/ui3-portal-standardization-associations-PROPOSAL-ONLY.sql`: inserir vínculos ausentes e habilitar clientes ativos no piloto de banco. Requer autorização específica de dados e expansão de público; não é executado automaticamente. O estado observado prevê quatro vínculos faltantes, mantendo Rosane.
4. `sql/ui3-portal-standardization-functions-ROLLBACK-ONLY.sql`: definições anteriores das sete funções, obtidas do banco por leitura.

Configuração proposta: `ROTEVO_NOTIFICATIONS_AUDIENCE=enabled_clients`. Preservar as flags existentes de notificações/atribuições/comunicação e a allowlist do piloto da equipe. Não é necessário revelar valores de Secrets nem ampliar indiscriminadamente a lista adicional da API. O novo público exige simultaneamente habilitação individual no banco. Novos acessos criados nesse modo podem ser inscritos pela transação de provisionamento. Nenhuma dessas configurações foi alterada em produção.

Não publicar o código sem instalar e validar as funções compatíveis: a ausência dos novos RPCs falha de forma fechada e deixa os recursos indisponíveis.

## Evidências de teste local

- Resultado consolidado: **62 testes aprovados, zero falhas**, em nove arquivos de teste.
- Suíte direcionada: projeção segura, cinco identidades/tenants sintéticos, chamadas reais dos handlers com dependências Supabase simuladas, negativa de escrita do cliente, contexto de notificações e contagem superior à página, marcação por identidade e guardas de comunicação.
- React/JSDOM: sininho nas cinco identidades; vazio/403/503; marcação como lida; tarefas sem edição; conversa que persiste em armazenamento sintético após remontagem; foco/visibilidade e coalescência de atualização.
- Atribuições: contratos HTTP reais de liberação, listagem, entrega Drive e validação nos cinco cenários, com a fronteira RPC simulada. O resultado não certifica políticas, persistência ou notificações transacionais do Postgres.
- TypeScript: `tsc --noEmit` aprovado.
- ESLint dos 18 arquivos de implementação modificados: zero erros, seis avisos preexistentes (variáveis antigas, dependência de memo e imagens). Sem redução de rigor nas regras.
- `git diff --check`: aprovado. `package.json` e lockfile preservados.

### Matriz por cliente

Todos os resultados abaixo são cenários sintéticos da implementação local. Nenhum portal real recebeu tarefas, mensagens, entregas ou notificações de teste.

| Cliente | Espelhamento/API e leitura sem edição | Atribuição/Drive/revisão com RPC simulado | Sininho/estados em JSDOM | Regularização pendente em produção | Visual autenticado e RLS real |
|---|---|---|---|---|---|
| R. Rubim Consultoria Ltda. | Aprovado | Aprovado | Aprovado | Preservar vínculo e piloto existentes | Pendente |
| Piffer Desenvolvimento Pessoal ME | Aprovado | Aprovado | Aprovado | Vínculo `client_users` e habilitação do público | Pendente |
| Flávia Benetele | Aprovado | Aprovado | Aprovado | Vínculo `client_users` e habilitação do público | Pendente |
| Jackson Bruno Psicologia | Aprovado | Aprovado | Aprovado | Vínculo `client_users` e habilitação do público | Pendente |
| Ana Paula Santiago | Aprovado | Aprovado | Aprovado | Vínculo `client_users` e habilitação do público | Pendente |

### Limites concretos do ambiente

1. `npm ci` falhou com `Exit handler never called!`. As verificações possíveis usaram dependências já disponíveis; o Next instalado é 16.4.2, enquanto o lockfile aprovado exige 16.4.6. Não houve alteração do lockfile para esconder a divergência.
2. O build local foi executado com configuração sintética de loopback, sem credenciais de produção. Falhou por DNS `ENOTFOUND fonts.googleapis.com` e `EPERM` ao criar `.next/server/app/admin/novo-planejamento`. Portanto, integridade do build exato do release ainda não está confirmada.
3. Docker recusou acesso ao pipe `dockerDesktopLinuxEngine` (`permission denied`). O SQL proposto e os fluxos com RLS/persistência reais não foram executados em laboratório. Nenhum contêiner antigo foi utilizado.
4. Não há sessão de navegador interativo disponível aos mecanismos desta execução. Responsividade, teclado, temas claro/escuro e navegação autenticada dos cinco portais não foram homologados visualmente. JSDOM não substitui essa aprovação.
5. A suíte HTTP de colaboração contra servidor local recusou execução por ausência do fixture explícito `YES_LOCAL_ONLY`/loopback. A proteção foi mantida; essa suíte continua pendente, enquanto guardas puros e handlers simulados foram verificados.

## Arquivos de implementação

- Segurança: `src/lib/security/clientTaskPolicy.ts`, `projectForClient.ts`, `src/lib/collaboration/guards.ts`.
- APIs: `src/app/api/client/projects/route.ts`, `admin/project/update/route.ts`, `admin/create-client-access/route.ts`, `workflow/notifications/route.ts`.
- Atualização: `src/hooks/usePortalRefresh.ts`, `src/lib/operations/api.ts`.
- Cliente: `src/app/cliente/page.tsx`, `src/Components/cliente/ProjectTimeline.tsx`, `ClientActionDeliveryPanel.tsx`.
- Estrategista: `src/app/admin/page.tsx`, `src/Components/admin/CentralTarefas.tsx`, `ExecutionTimelineEditor.tsx`, `StrategistAssignments.tsx`.
- Compartilhados: `src/Components/shared/WorkflowNotificationBell.tsx`, `ProjectConversation.tsx`.
- Testes: duas novas suítes `portal-standardization*.test.cjs`; ajustes de fixtures/contratos de projeto, notificações e guardas de colaboração para as novas regras. Isolamento, identidade, gates e negações não foram removidos.

## Implantação e reversão propostas

1. Resolver o acesso local necessário para instalar as dependências exatas, concluir build, SQL/RLS em banco descartável e revisão visual. Não requer novo deployment na Vercel.
2. Apresentar os resultados faltantes e obter autorização expressa para o SQL, regularização, público/configuração e um único deployment consolidado do commit candidato. Obter ponto de recuperação atual e snapshot privado das definições, ACL, vínculos e estados do piloto antes de qualquer execução autorizada.
3. Após autorização, conferir drift do preflight, aplicar somente as propostas aprovadas, testar grants/identidade/tenant, preparar configuração e publicar uma única versão. Conferir commit no domínio; não alterar aliases do Método EPC.
4. Reversão: promover novamente o deployment anterior `dpl_EvYz522ucWob8dDQLD3gPkEbv1jG`, restaurar as sete funções com o arquivo de rollback e retornar o público da API a `pilot`. Repor somente os estados do piloto conferidos no snapshot, se necessário. Manter vínculos válidos e dados operacionais; não apagar usuários, tarefas, mensagens ou notificações. Novas tarefas gravam o sinalizador legado fechado para evitar exposição de descrições internas ao voltar ao código antigo; seu acompanhamento pode ficar temporariamente indisponível no rollback, sem perda de dados.

A liberação final permanece pendente. Quantidade de deployments executados durante este desenvolvimento: **zero**.
