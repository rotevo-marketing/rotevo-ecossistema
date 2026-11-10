# Rotevo UI 3.0 — Conversas: plano de ativação controlada (10/11/2026)

**Estado: NÃO AUTORIZADO PARA PRODUÇÃO.** Este documento não é um comando para executar mudanças. Código em PR #5 permanece em draft, flags desativadas por padrão.

## Escopo técnico entregue na branch

- API servidor `GET/POST /api/collaboration/messages`; autorização por token GoTrue e perfil, tenant, workspace, visibilidade exata da tarefa/conteúdo, Equipe ativa e permissões apropriadas.
- Componentes em tarefas e conteúdos do Estrategista e do Portal Cliente; mensagem é distinta de decisão formal de aprovação.
- Tabela proposta `public.rotevo_collaboration_messages` com RLS, sem `SELECT/INSERT` diretos para `anon/authenticated`; serviço autorizado exclusivamente pelo backend.
- Histórico com cursor de ordenação composta `(created_at, id)`, 30 registros por página; mensagem exibida como texto, não HTML.
- Limitador transacional de envio proposto: 10 mensagens por autor em 60 segundos, mediante advisory lock por autor na transação e trigger SQL. HTTP 429 na API com mensagem amigável.

## Evidência e fronteiras

- Workflow geral de desenvolvimento no commit `fba62c0a`: [42921303198](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42921303198) SUCCESS, seis verificações, antes do último ajuste de expectativa dos testes.
- Ensaio integrado anterior de chat básico (pré-paginação/limite): [42918918558](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42918918558) SUCCESS.
- Ensaio de paginação e limite: [42921811431](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42921811431) **SUCCESS** após corrigir duas expectativas matemáticas do teste. Confirma 67 mensagens recuperadas em três páginas sem duplicação, cursor inválido rejeitado, 10 mensagens por janela de 60 s e a 11ª rejeitada por HTTP 429, além de isolamento A/B, papéis, módulos e descompartilhamento. A execução anterior [42921295765](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42921295765) falhara apenas pela expectativa antiga após semear mensagens adicionais.
- CI do último código e documentação do PR: [42921964639](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42921964639) **SUCCESS**, seis verificações, incluindo build, TypeScript e testes de segurança. Não equivale à homologação de navegador com usuários reais.
- Testes usam stack descartável com dados fictícios e URLs loopback. Não existe evidência de migração nem envio de mensagens em produção.

## Gates bloqueantes

1. Confirmar SUCCESS do CI e da suíte integrada na mesma árvore do release candidate (ou identificar diferenças estritamente documentais).
2. Reconciliar proposta SQL com schema hospedado, grants efetivos, funções, gatilhos, Auth, RPCs e plano de recuperação; produção não é laboratório.
3. Fechar G2 (permissões do JSON privado `planning_projects.data`) sem reabrir a exposição em rollback; harmonizar RPCs editoriais.
4. Testar UI autenticada, foco, leitor de tela e responsividade no navegador nas larguras previstas; testar carregamento, postagem, falha/429, paginação e retorno ao conteúdo/tarefa.
5. Executar testes negativos em contas fictícias (cliente A/B, staff sem e com permissão, troca inicial de senha) em ambiente isolado equivalente; manter autoria/timestamps imputados ao servidor e nenhuma informação de outros tenants.
6. Avaliar infraestrutura para rate limit, observabilidade de falhas 401/403/409/429/503 e política de retenção; testar concorrência simultânea na janela antes de aceitar o mecanismo como à prova de disputa.
7. Obter autorização **específica** para alterações hospedadas e separada para deployment. Backup existente é relatado como verificado por SHA-256 local, porém **a restauração não foi comprovada**.

## Ativação futura, somente após gates e aprovação

- Preflight, janela de implantação, migration reconciliada e pós-checks de grants/RLS.
- Publicar apenas build compatível com grants restritos.
- Validar API autenticada com contas autorizadas e registros sintéticos, sem editar documentos reais.
- Habilitar `ROTEVO_COLLABORATION_ENABLED=true` **somente** quando schema e testes funcionarem; apresentar interface apenas com `NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED=true` após confirmação.
- Em incidente, desligar flags e reverter aplicação compatível. **Não reabrir** grants privados e não apagar mensagens como rollback automático.

**Confidencialidade:** não publicar dumps, logs de clientes, tokens, e-mails nem conteúdo real no GitHub.
