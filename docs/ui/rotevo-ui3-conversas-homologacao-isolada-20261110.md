# Rotevo UI 3.0 | Conversas em tarefas e conteúdo: homologação isolada — 10/11/2026

**Decisão:** PASS para o recorte de integração sintética, **NO-GO para ativação e produção**.

## Candidato e evidências reproduzíveis

- PR #5, branch `release/rotevo-ui3-rc-20261110`; nenhum merge na main.
- Commit que incluiu o ensaio integrado: `b94731a680a74d075bd8b7d91c7c3c8257385367`.
- [GitHub Actions 42918918558](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42918918558): **SUCCESS** na stack local descartável (GoTrue, PostgREST, banco, Next.js, Storage e navegador).
- O log registra `PASS integrated collaboration: real Auth, tenant isolation, reset/role/module/visibility gates, server-only grants, writes, reload, thread separation, and de-sharing`.
- O mesmo workflow registrou os sete grupos integrados preexistentes, incluindo documentos com HTML/CSS extenso, aprovação editorial, financeiro e objetos privados sintéticos.
- [GitHub Actions 42918925732](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42918925732): **SUCCESS**, seis jobs (auditoria de dependências, TypeScript, build, testes HTTP e segurança em PostgreSQL descartável).
- Um ajuste posterior de acessibilidade no painel adicionou `useId()` para evitar ids duplicados e recuperação após falha de consulta; precisa dos checks do SHA posterior antes de ser declarado verificado.

## Implementado somente na branch candidata

- API `/api/collaboration/messages`: `GET/POST` com token válido, consulta de identidade no servidor e teste de troca obrigatória de senha antes de criação do cliente privilegiado.
- Conversa contextual por `projectId`, `resourceType` (`task|content`) e `resourceId`; persistência independente do JSON privado do planejamento.
- Checagem de visibilidade explícita e unicidade do recurso, módulo presente no workspace, tenant do cliente, permissões/atribuição ativa da equipe e escopo do estrategista.
- Respostas com `Cache-Control: no-store`; limites de conteúdo; autor e horário determinados por servidor.
- Componentes de interface em tarefa (painéis Cliente/Estrategista) e conteúdo (Cliente/Estrategista), condicionados a `NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true"`.
- Backend condicionado a `ROTEVO_COLLABORATION_ENABLED==="true"`; por padrão ambos permanecem desligados.
- Proposta isolada `docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql` com RLS e privilégios somente para `service_role`. **Não é migration em produção** e não foi aplicada ao Supabase hospedado.

## Cenários integrados aprovados no runner descartável

1. Login de identidades fictícias de cliente A/B, estrategista, staff com e sem acesso e conta com senha inicial pendente.
2. Leitura e inserção diretas à tabela pelo navegador negadas; acesso somente pela API autenticada.
3. Cliente A envia mensagem e estrategista responde; servidor persiste autor/papel/hora e a consulta reabre as mensagens na ordem esperada.
4. Cliente B não lê nem escreve na tarefa de A, inclusive ao fornecer explicitamente o UUID de A.
5. Conteúdo e tarefa não compartilham a mesma thread.
6. Recursos internos/ocultos/inexistentes são negados.
7. Staff sem permissão de escrita não envia; staff com leitura explícita vê somente projeto atribuído.
8. Desabilitação do módulo e descompartilhamento ocultam o histórico e negam novas mensagens.

## Limitações ainda abertas

- A pilha do GitHub é sintética, não uma cópia fiel de todas as migrations, dados, relações e políticas do projeto hospedado. Nenhum login real de cliente foi utilizado.
- A proposta de tabela ainda não foi convertida em migration revisada nem ensaiada em restauração isolada equivalente ao ambiente hospedado.
- Não há interface de paginação do histórico além das últimas 50 mensagens; `before` na API é básico, sem cursor total por timestamp + id.
- Não há rate limiting específico de envio, exclusão/edição auditável de mensagens, anexos ou notificações.
- Não houve teste manual assistivo com leitor de tela ou QA autenticado na prévia Vercel para a conversa.
- A confidencialidade da coluna `public.planning_projects.data` e o hardening das RPCs editoriais continuam bloqueios independentes de produção.
- O backup privado de novembro teve SHA-256 localmente relatado, mas restauração de banco não comprovada; ausência de ensaio completo precisa ser considerada antes da alteração hospedada.
- Nenhuma alteração do banco hospedado, Storage real, contas, perfis ou permissões foi feita neste teste.

## Próximo gate

1. Fechar CI do HEAD exato após o último ajuste de UI.
2. Endurecer testes e operação de paginação/rate limiting e concorrência antes de ativar serviço com uso real.
3. Reconciliar o schema real, grants, Auth/Storage e as duas propostas de segurança; testar com identidades sintéticas no ambiente mais fiel disponível.
4. Preparar migração e plano de retorno seguro; obter autorização **separada e explícita** para alterações hospedadas e publicação.
5. Habilitar as duas flags apenas após observabilidade, testes funcionais/autorização e aceite.

**Este arquivo registra testes concluídos em ambiente sintético; não autoriza alteração da produção.**
