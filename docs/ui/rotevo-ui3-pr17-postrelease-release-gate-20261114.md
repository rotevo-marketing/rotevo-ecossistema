# ROTEVO UI 3.0 | PR #17: recuperação pós-publicação e gate de release
Data: 14/11/2026. Estado: **CANDIDATO EM HOMOLOGAÇÃO**. Nenhum deployment, merge, SQL ou mudança de variáveis de produção autorizados nesta rodada.

## Fonte de verdade
- PR #17: branch `fix/ui3-postrelease-visibility-dashboard-20261114` baseada em `main`; manter DRAFT até aceite integral.
- Produção atual: `app.rotevo.com.br` servindo o release UI3 anterior `edce744a2`, com schema do workflow já instalado.
- Documento Mestre UI3 de 13/11 e decisões posteriores: quatro cartões operacionais sem KPI redundante, notificações internas, perfil Claro/Escuro/Sistema, entregas por URL Drive no módulo Tarefas, comunicação e aprovações com tenant/G2 estritos.

## Correções já aplicadas na branch
1. Visão Geral cliente: quatro cartões sem contadores duplicados, com os números nas próprias seções. Preserve a indicação de indisponibilidade quando uma fonte falhar.
2. Visão Geral estrategista: quatro seções Para hoje/Atrasadas/Aprovações/Agenda; listas reais, datas, links e prioridade operacional; Financeiro e Projetos continuam no painel. Atrasadas usa a mesma fonte global que sua contagem para não divergir da lista; o aviso de responsáveis apenas por nome permanece.
3. `ClientActionDeliveryPanel` movido da Visão Geral para Tarefas, sob a seção Atribuídas a mim, sem upload/download de arquivos. O servidor apenas registra URL do Google Drive.
4. Contratos e E2E de navegador atualizados para a localização da entrega em Tarefas, sem enfraquecer asserts de autorização.
6. Portais de cliente: quando a flag de atribuições estiver ativa, o menu Tarefas disponibiliza somente a fila pessoal mesmo sem a permissão geral do módulo execution; o ProjectTimeline permanece sujeito a workspace.modules.includes('execution'), prevenindo leitura de tarefas gerais não compartilhadas.
5. CSS de Claro/Escuro/Sistema ampliado para cartões, navegação, cabeçalho e controles normais, mantendo canvas de documentos sem inversão.

## Auditoria funcional do código (não equivale a E2E de produção)
| Área | Existente no código | Gate restante |
| --- | --- | --- |
| Notificações | `WorkflowNotificationBell`, rota GET/PATCH `/api/workflow/notifications`, RPCs SQL de lista/marcar lida | Flags de cliente e servidor e `ROTEVO_NOTIFICATIONS_PILOT_USER_IDS` (UUIDs autorizados) devem ser definidos antes de habilitar. Enquanto a lista está vazia, a API retorna 403 propositalmente; jamais remover bypass de isolamento sem novo aceite de segurança. |
| Aparência | `AccountAppearancePreference`, API da conta, `user_preferences.appearance` | `NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED=true` antes do build e inspeção visual de módulos, modais, tabelas, calendários, telas móveis, foco e contraste. Estilos de documentos ricos não devem mudar. |
| Entregas | `ClientActionDeliveryPanel` em Tarefas e `ClientActionReviewPanel` na administração, RPCs e migração já instaladas | `NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED=true` antes do build; `ROTEVO_CLIENT_ACTIONS_ENABLED=true` no servidor, permissão efetiva por projeto; teste sintético de URL Drive e revisão. |
| Aprovações | Fluxo editorial e versões, `EditorialApprovalsPanel` e Gate B | Preservar `ROTEVO_WORKFLOW_APPROVALS_ENABLED` e `NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED`; testar aprovação designada e solicitação de ajustes, sem inferir publicação automática. |
| Mensagens | `ProjectConversation` em tarefa/conteúdo e camada SQL de colaboração | `NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED` e `ROTEVO_COLLABORATION_ENABLED` só após verificar esquema/RLS e o público autorizado. Não ativar por conveniência nem migrar de novo. |
| Calendários e datas | `publishDate` e `dueDate` em Conteúdo/Tarefas | Rever independência das datas e filtros já aprovados; não modificar sem evidência de regressão. |
| Outros módulos | Projetos, Equipe, Cliente, Contratos/Drive, Financeiro e Campanhas já constam no roteamento publicado | A presença do componente não comprova visual nem fluxo; manter a inspeção dirigida no navegador para aceite, sem repetir bateria de backup. |

## Configurações necessárias PARA A PRÓXIMA BUILD (não aplicadas)
- Público: `NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED=true`, `NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED=true`, `NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED=true`.
- Privado: `ROTEVO_NOTIFICATIONS_ENABLED=true`, `ROTEVO_NOTIFICATIONS_PILOT_USER_IDS=<UUIDs explicitamente autorizados>`. Não colocar UUIDs de usuários reais no repositório.
- Aprovações: manter as duas flags já configuradas no release anterior.
- Colaboração: manter o gate vigente até aceite funcional específico.
- Não copiar env de Production para laboratório; nunca imprimir chaves.
- Em Next.js, `NEXT_PUBLIC_` é embutida durante `next build`, portanto modificar a variável após o build não ativa recurso já compilado.

## Gate de publicação único
1. CI do HEAD final (TypeScript, build e cenários sintéticos autenticados) concluída sem failures/cancelled.
2. Confirmar a aparência, os detalhes, os módulos e a central de notificações com contas sintéticas em ambiente isolado. Verificar mobile, sem ações em clientes reais.
3. Registrar visual/funcional aceito pelo responsável, e confirmar destinatários autorizados do piloto de notificações.
4. Congelar SHA, definir as variáveis ANTES do único build final e preservar rollback para deployment UI3 anterior, sem reverter grants restritos nem arquivos de clientes.
5. Após aprovação expressa para novo cutover, fazer merge, uma publicação coordenada e smoke no domínio oficial. Não há migração SQL adicional planejada no PR #17; se o diff exigir alguma, interromper e avaliar separadamente.
6. Não alterar domínio Método EPC; manter a atribuição de alias exclusivamente para `app.rotevo.com.br`.

## Impedimentos que permanecem
- Não está comprovada a cobertura visual total do tema escuro em todas as telas.
- A flag e allowlist das notificações não estão habilitadas em produção; código existente é deny-by-default.
- Aceite visual/funcional final ainda não ocorreu.
- PR #17 não deve ser mesclado nem publicado até cumprir esses critérios.

**Observação:** aprovação de CI e presença de componentes não significam entrega visível em produção. A publicação anterior revelou precisamente essa divergência e este gate deve impedi-la no próximo release.

## Script de bloqueio pré-build
Execute `node scripts/security/ui3-pr17-release-env-check.mjs` no contexto privado das variáveis **do build Production** antes de requisitar a única implantação final. Esse comando é somente leitura, não imprime os UUIDs dos destinatários e devolve exit code 1 quando faltar uma flag, houver destinatário inválido/duplicado ou a colaboração pública/privada estiver incoerente. Para o gate de colaboração, declarar `ROTEVO_PR17_COLLABORATION_RELEASE_MODE=enabled` somente depois da homologação G2; `disabled` preserva os recursos ocultos e, portanto, deve receber aceite explícito de escopo. A execução do gate não substitui inspeção visual nem testes autorizados.
