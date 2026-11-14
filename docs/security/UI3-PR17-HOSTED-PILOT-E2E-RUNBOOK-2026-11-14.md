# Rotevo UI 3.0 | Piloto hospedado de notificações — Procedimento de aceite
Data de preparação: 14/11/2026  
Estado: **pronto para execução por operador autorizado, NÃO EXECUTADO**  
Ambiente exclusivo: Supabase `rotevo-ui3-homologacao` (`tqedxahsqbskninjenfg`)  
PR: https://github.com/rotevo-marketing/rotevo-ecossistema/pull/17

## Objetivo e linha de segurança
Comprovar **positivamente**, com login real no Supabase Auth hospedado, atribuição de atividade a cliente, recebimento do alerta restrito, entrega de URL Google Drive, revisão interna, marcação como lida, revogação e bloqueio de contas de terceiros. O CI local já passou, mas não substitui este gate.

**Regras obrigatórias:**
- Não usar a conta Auth preexistente nem o registro piloto habilitado anteriormente.
- Não executar nenhuma etapa no Supabase de produção (`kadvzjelkyfwouqmlxaa`).
- Não usar dados, projetos ou contas de clientes reais. Proibir envio de e-mails de testes a terceiros.
- Não inserir usuários manualmente em `auth.users` e não colocar `service_role` / secret keys em navegador, GitHub, logs, documentos, PR ou conversa.
- Criar e eliminar usuários **somente** por Supabase Auth Admin, em ambiente de servidor confiável, com acesso escopado a homologação. Docs: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Sem deployment Vercel, merge, flags de Production ou migração de produção durante o teste.

## Smoke test hospedado de Auth (etapa anterior a H01–H14)
O script `scripts/security/ui3-hosted-auth-smoke.mjs` está disponível na branch. Ele **não foi executado contra o Supabase hospedado**; foi verificado sintaticamente em Node.js. Sem flag explícita, só imprime o estado DRY RUN e não realiza chamadas.
- O executor deve ser uma máquina/serviço confiável, **fora do GitHub Actions e da Vercel**. Configure `ROTEVO_HOSTED_SUPABASE_URL` exatamente como `https://tqedxahsqbskninjenfg.supabase.co`, `ROTEVO_HOSTED_ANON_KEY` e `ROTEVO_HOSTED_SERVICE_KEY` no ambiente privado do operador, nunca em arquivos versionados ou mensagens.
- Rode com `ROTEVO_HOSTED_AUTH_SMOKE=I_AUTHORIZE_HOMOLOGATION_ONLY` e `node scripts/security/ui3-hosted-auth-smoke.mjs --execute` **somente após autorização do operador e verificação de backups/controles do laboratório**.
- Ele cria **uma** conta `@synthetic.invalid` via Auth Admin, faz login Auth real, exige lista v2 vazia, negação de marcação de ID alheio e exclui exclusivamente a conta que acabou de criar via Auth Admin. Em caso de falha de limpeza, interromper o gate e reconciliar manualmente.
- Esse smoke test é **apenas um subgate**. Ele não cria fixtures de projetos, atribuições ou notificações e **não substitui os 14 casos E2E positivos** descritos abaixo.

## Critérios preliminares de entrada
1. CI atual 11/11 SUCCESS para o commit de código alvo.
2. Inventariar assinatura `public.rotevo_workflow_list_notifications_v2(integer,boolean)` com **11** campos, `mark_notification_read_v2(uuid)`, `rotevo_workflow.can_view_event_v2`, duas tabelas privadas e três triggers.
3. Conferir que não existem eventos/notificações de teste não identificados; preservar os contadores preexistentes.
4. Fazer snapshot/backup de **homologação** conforme o plano aplicável antes de qualquer DML, e registrar quais fixtures serão criadas.
5. Executar o teste num serviço autenticado destinado ao laboratório, com configuração de DB específica da homologação; nunca apontar variáveis do ambiente de produção para o laboratório.
6. Garantir que o usuário habilitado preexistente do piloto continua inalterado.

## Fixture sintética mínima
- Dois projetos sintéticos A e B, com clientes A e B; utilizar identificadores rotulados e rastreáveis.
- Identidade de estrategista/equipe interna sintética com permissões G2 concedidas **somente** a A; segunda identidade interna sem autorização ao projeto A.
- Duas identidades de cliente de A: A1, explicitamente atribuída, e A2, não atribuída. Uma identidade de cliente de B: B1.
- Senhas únicas e temporárias fornecidas via cofre/ambiente restrito, nunca nos logs.
- Atividade de Tarefas **visível individualmente** a A1, sem liberar o módulo `execution` em geral, e item de Conteúdo da versão atual; criar apenas links Google Drive com identificador fictício, sem arquivos reais.
- Inserir **somente** usuários de teste na tabela privada do piloto, preservando o registro anterior. Deixar o frontend e o ambiente de produção sem flags de piloto até o aceite.

## Casos de teste obrigatórios
| Caso | Ação / resultado esperado |
|---|---|
| H01 | Atribuir a A1 a tarefa pessoal do projeto A: um único evento e uma notificação para A1 |
| H02 | A1 lista v2 com token Auth real e vê somente suas atribuições, inclusive a tarefa sem `execution` geral |
| H03 | A2 e B1 listam v2: não veem a notificação de A1, mesmo se tentarem IDs conhecidos |
| H04 | A2 e B1 tentam marcar a notificação de A1 como lida: RPC retorna `false` |
| H05 | A1 marca a própria notificação como lida: `true`; desaparece apenas da lista de não lidas |
| H06 | Repetição da mesma atribuição/requisição com chave idempotente: não cria alerta duplicado |
| H07 | A1 envia URL sintética do Drive: um único `item_ready` destinado à equipe autorizada e persistência após refresh |
| H08 | Colaborador sem G2 e cliente B não conseguem consultar essa entrega |
| H09 | Revogação do piloto de A1 e novo GET: zero itens visíveis, imediatamente |
| H10 | Revogação de atribuição/compartilhamento e nova consulta: a leitura é bloqueada, sem abrir módulo inteiro |
| H11 | Conta anônima ou sessão inválida não pode executar RPC, API devolve não autorizado |
| H12 | Testar alerta de revisão/ajustes e publicação editorial sem alargar autorização de dados privados |
| H13 | Verificar `action_id` na resposta v2 e navegação para **Tarefas → Atribuídas a mim**, sem expandir o acesso |
| H14 | Depois do teste, confirmar que apenas fixtures foram alteradas e nenhum registro preexistente foi tocado |

## Como executar com segurança
- Operador autorizado configura um runner **server-side** isolado com Supabase URL de homologação, secret key de homologação de uso temporário e geração de credenciais em segredo. Nunca reutilizar chave de produção.
- Criar usuários via `supabase.auth.admin.createUser` com `email_confirm: true` em contas sintéticas controladas. O método deve executar apenas no servidor; o SDK exige chave privilegiada protegida.
- Separar o cliente administrador do cliente que usa os JWTs de A1/A2/B1; `service_role` nunca deve executar as chamadas que pretendem comprovar RLS, pois bypassa RLS.
- Fazer login das contas sintéticas com o SDK regular e token de acesso real, executar RPCs v2, endpoints HTTP da aplicação isolada e asserções sobre destinatário/G2.
- Registrar apenas IDs de casos, códigos de status, totais e hash do commit; jamais JWTs, chaves ou senhas.
- Criar dados com um marcador único de teste e inventariar todos os IDs gerados para limpeza seletiva.

## Desmontagem e preservação
1. Desabilitar os novos membros sintéticos do piloto; não alterar a linha preexistente.
2. Apagar/arquivar **exclusivamente** fixtures identificadas, respeitando FKs e trilha de auditoria. Não apagar eventos de usuários reais.
3. Revogar todas as sessões de teste antes da exclusão Auth; remover os usuários por Auth Admin somente após conferir as dependências e a segurança da limpeza.
4. Invalidar a credencial de teste do runner e remover do ambiente isolado; conferir que não restou em logs.
5. Comparar as contagens e os objetos com o baseline inicial; registrar diferenças justificadas e limpar apenas as autorizadas.
6. Emitir aceite com cada caso H01–H14 PASS/FAIL, documentação de evidências e riscos residuais.

## Bloqueios conhecidos
- As ferramentas Supabase conectadas nesta sessão expõem SQL/migrações, mas **não** uma operação administrativa para criar contas Auth. O teste positivo não deve ser simulado via SQL escrito diretamente em `auth.users`.
- A execução exige um executor confiável com segredo exclusivo da homologação. O agente atual não tem esse executor credenciado.
- Antes de futuras mudanças na produção: backup/restauração validados, matriz de variáveis Vercel, lista explícita de usuários do piloto, migração própria de produção aprovada e autorização de merge/deployment.

**Não confundir este procedimento com um aceite realizado. Até obter evidência H01–H14, o release permanece NO-GO.**
