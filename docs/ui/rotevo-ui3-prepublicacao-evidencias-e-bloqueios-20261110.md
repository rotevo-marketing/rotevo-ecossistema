# Rotevo UI 3.0 | Dossiê de pré-publicação e dependências críticas — 10/11/2026

**Decisão: NO-GO para publicar e NO-GO para qualquer mudança de grants/DDL no Supabase hospedado até a recuperação do banco ser comprovada.** Este documento não contém credenciais, dumps, objetos de Storage ou conteúdo de clientes.

## 1. Estado exato observado

- GitHub PR [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5), branch `release/rotevo-ui3-rc-20261110`, aberto, draft, sem conflito, ainda não integrado à `main`.
- [Vercel preview READY](https://vercel.com/rotevo-marketing/rotevo-ecossistema/UpEFfWhsjFrPknVzC1Qgc1Y1Avjn): SHA `0bd7b9ee64a3f9c2d0ad79b5957a89936b767a0a`, ramo UI3. Não é produção.
- Produção permanece em release anterior, SHA observado `bec8ee26a0a33a579ce223eaffccbb04f7aaf61a`; o código legado usa diretamente `planning_projects.data`. Revogar o SELECT/UPDATE comum **antes** de instalar um app compatível pode interromper a operação existente. Portanto a sequência de corte precisa ser coordenada, não simplesmente revogar grants como primeira mudança hospedada.
- [CI integrado sintético 42933095124](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42933095124) SUCCESS para o SHA `0bd7b9ee`: GoTrue/PostgREST/Storage/Auth, conversa, staff, client, planejamento publicado, contratos, responsividade e axe WCAG 2.1 A/AA. Saídas `ACCESSIBILITY collaboration []`, `client []`, `shared contract ... []`, `published planning []`, `strategist []`; navegação em 320/375/390/430/768/1024/1440 px. Não equivale a leitor de tela humano.
- A execução de CI geral para o mesmo SHA, [42933102052](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42933102052), falhou inicialmente no build por falha intermitente de parsing `next/font`; foi repetido o job específico sem modificação de produto e concluído SUCCESS. Demais cinco verificações estavam SUCCESS. Verificar o resultado completo do rerun antes de promover.

## 2. Segurança hospedada: confirmação somente leitura

- Projeto PostgreSQL 17.11, 5 clientes, 5 projetos, 18 perfis no inventário de contagens.
- `public.planning_projects`: RLS ativado; seis políticas; `authenticated` ainda tem privilégio efetivo de SELECT e UPDATE na coluna privada `data`. O patch testado está em `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`, **não aplicado** no projeto hospedado.
- `public.rotevo_collaboration_messages` **ainda não existe** hospedado; DDL apenas como proposta `docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql`.
- Security Advisor hospedado sinalizou três `SECURITY DEFINER` executáveis por `authenticated` (`is_strategist`, `rotevo_editorial_decide`, `rotevo_editorial_idea_decide`). Analisar os predicados e a necessidade legítima, em vez de revogá-los indiscriminadamente. O patch de RPCs editoriais já foi testado em laboratório sintético e está em `docs/security/sql/ui3-editorial-rpc-hardening-PROPOSAL-ONLY.sql`.
- Não foi aplicado SQL, criado usuário hospedado de teste, alterado arquivo, configuração ou perfil de cliente nesta rodada.

## 3. Mensagens

- API e UI prontas na branch, desativadas por padrão tanto no backend (`ROTEVO_COLLABORATION_ENABLED`) quanto no frontend (`NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED`).
- Suíte sintética: mensagens vinculadas a tarefa/conteúdo; autenticação; papéis e tenant A/B; recurso oculto; revalidação ao descompartilhar; navegação; 67 mensagens em cursor paginado; 10/60 s; 16 POSTs concorrentes resultando em **10 aceitos e 6 bloqueados**, sem escrita extra. Run [42926099312](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42926099312) SUCCESS.
- Nenhuma mensagem de cliente foi migrada nem enviada em produção.

## 4. Por que não modificar o banco hospedado imediatamente

1. Existe relato e manifesto de dump local no Windows com SHA-256, mas a **restauração integral verificável ainda falhou**. A cópia privada dos 50 objetos de Storage foi recuperada em filesystem independente, não em serviço Supabase completo. Dumps/logs/credenciais nunca devem ir para Actions, chat público ou repositório.
2. A produção atual usa a coluna cuja permissão deve ser revogada. Se a mudança fosse aplicada agora, poderia interromper telas da V2, mesmo que não houvesse perda de dados. O rollback não pode reabrir a coluna privada.
3. É necessário validar a compatibilidade de imagem, grants/RPCs, esquema restaurado e uma versão de contingência da aplicação antes da janela. Aprovação genérica para avançar não substitui testes/condições observáveis.

## 5. Sequência final segura, sem liberação automática

1. Em uma máquina administrativa que **tenha** o arquivo privado de dump, ensaiar o restore em ambiente PostgreSQL/Supabase equivalente e isolado, preservando roles, ACLs e dados; produzir relatório privado de recuperação e cruzamento de referências com Storage. Não usar `--no-acl/--no-owner` como prova de restauração integral das permissões.
2. Reconciliar grants efetivos, corpos das RPCs, RLS, triggers e versões de migrations para preparação das operações hospedadas. Não rodar SQL histórico indiscriminadamente.
3. Confirmar regressões, acessibilidade assistiva humana no navegador e uma identidade Equipe hospedada autorizada. O CI automatizado não substitui estes controles.
4. Congelar SHA e preparar uma versão compatível de contingência; aprovar janela de transição; somente então efetuar grants/RPCs/tabela em transações controladas com pós-verificação e publicar o mesmo SHA homologado sem regressão. Feature flags de mensagens ativadas só após a tabela estar efetiva.
5. Validar o domínio final `app.rotevo.com.br`, acesso por cliente, estrategista e Equipe, notificações, contratos, planning, calendário, tarefas, conversas, Storage e logs. Em incidente, desligar flags; não reabrir grants sensíveis nem executar restore sobre produção sem decisão explícita.

**Dependência externa incontornável:** o dump está no computador Windows do responsável, não acessível pelo GitHub/Supabase/Vercel conectados. Nenhuma dessas ferramentas fornece acesso ao sistema de arquivos local ou cria magicamente uma restauração comprovada. Não declarar etapas 1 e 4 concluídas com base em testes sintéticos.
