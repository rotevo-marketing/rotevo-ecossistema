# Portais dos Clientes UI 3.0: retomada e candidato consolidado

Data: 19/11/2026. Branch: `fix/client-portals-mirroring-20261118`.

## Integridade recuperada

O checkout foi encontrado limpo no commit local `472d75def6fd85b52cc60ed56598be6d4229640a`. Os 29 arquivos da entrega anterior e a evidência dos 62 testes aprovados estavam preservados. Não houve reinício do desenvolvimento nem repetição dessa suíte. A retomada acrescenta somente a correção das mensagens de autenticação do cliente, seus testes e este relatório.

A produção foi consultada novamente: `27c1681ddbe1d1f647547f36cc808a49872c8107`, deployment `dpl_EvYz522ucWob8dDQLD3gPkEbv1jG`, READY. O GitHub informa que esse release está 72 commits à frente de `main` (`0fe4cb0ee2a94301a4b2ee78823ac81f0d307604`) e zero atrás. Portanto, ele já contém a main consultada; não há motivo para substituir esta base pela main antiga. O 02.01 não publicado continua separado.

As correções de espelhamento, atribuições, notificações, atualização automática, comunicação bilateral, projeção segura e confidencialidade auditada permanecem como descritas em [relatório de 18/11](ui3-portal-standardization-review-20261118.md).

## Login de Elania Piffer

### Verificado diretamente

- O usuário informou que a mensagem no computador da Elania é “E-mail ou senha inválidos”, enquanto a mesma conta acessa em outro computador.
- A conta está confirmada, sem bloqueio ou exclusão. O perfil tem papel cliente e aponta para o cliente correto.
- Nos logs de autenticação há logins bem-sucedidos dessa identidade em 18/11 às 17:57:59 e 17:59:16, horário de Brasília, com retorno 200. Não foram executados logins com credenciais reais nesta investigação.
- Na janela analisada do projeto, 18/11 07h a 19/11 07h de Brasília, há 11 recusas `invalid_credentials` no fluxo de senha e uma recusa `refresh_token_not_found`. As falhas não identificam a conta no conjunto consultado. Não é possível atribuí-las à Elania, ao computador dela ou a um IP específico.
- O formulário publicado converte todo erro retornado por `signInWithPassword` em “E-mail ou senha inválidos”. Isso inclui erros de rede ou disponibilidade. Logo, a mensagem relatada, isoladamente, não comprova senha incorreta.
- A autenticação não consulta `client_users` para validar a senha. O vínculo ausente é uma pendência real para funcionalidades do portal, mas não explica diretamente essa mensagem de autenticação.
- A configuração de firewall da Vercel não pôde ser lida: o conector retornou `404/not_found` com indicação de acesso insuficiente. Não se concluiu que o firewall está ausente nem que ele causou o problema. Não havia CLI autenticada disponível para a mesma consulta.

### Correção preparada

`src/lib/auth/loginFeedback.ts` classifica retorno de credenciais inválidas, excesso de tentativas, serviço indisponível, conexão, armazenamento do navegador e falha desconhecida. `src/app/page.tsx` utiliza essa classificação sem modificar o mecanismo de autenticação, a senha digitada, o isolamento ou as permissões.

O texto bruto do provedor não é exibido nem registrado; tokens, senha e e-mail não são adicionados a logs. A senha permanece exatamente como digitada, sem remoção automática de espaços. O e-mail mantém a normalização já existente. Um retorno sem usuário confirmado não concede entrada.

Essa correção evita um diagnóstico falso, mas não permite declarar resolvido o acesso no computador da cliente sem reproduzir a tentativa nele.

### Verificação mínima no computador afetado

1. Abrir `https://app.rotevo.com.br` em janela anônima no próprio computador da Elania. Digitar o e-mail e a senha manualmente, sem preenchimento automático, conferindo Caps Lock, layout de teclado e espaços. O botão Mostrar já existente permite conferência local; não enviar a senha em mensagens.
2. Se persistir, testar outro navegador atualizado no mesmo computador. Se necessário, comparar pela internet do celular para distinguir computador/navegador de rede. Não desativar antivírus ou proteções globais como procedimento de teste.
3. Informar horário da tentativa e somente status HTTP/código do erro da chamada de autenticação, se disponíveis. Não compartilhar HAR, cabeçalhos Authorization, tokens ou payload com senha. Sem isso, senha salva divergente, entrada diferente e bloqueio local continuam hipóteses, não causas confirmadas.

## Revisão de segurança e banco

O estado atual das associações foi confirmado por SELECT: Rosane possui um vínculo consistente; Elania, Flávia, Jackson e Ana Paula continuam sem `client_users`, embora tenham perfil associado. As 18 tarefas ativas do projeto da Elania continuam presentes. Não houve atualização, exclusão ou conversão de nenhuma delas.

As propostas SQL anteriores foram revisadas e preservadas sem alterações nesta retomada:

- Preflight: identidades, conflitos, piloto, definições e ACL para conferência antes da execução.
- Estruturas: helper de visibilidade, provisionamento transacional exclusivo de serviço, elegibilidade e contagem de notificações; adequações das sete funções existentes mantendo identidade, G2, tenant, versão e revogação.
- Associações: inserção idempotente dos vínculos válidos e expansão explícita do piloto, sujeitas à aprovação específica. Não altera perfis ou tarefas, não cria atribuições artificiais e não publica documentos.
- Rollback: restaura as sete definições anteriores e preserva os registros. Alterações de estados do piloto dependem do snapshot conferido, sem exclusões indiscriminadas.

O modo proposto `ROTEVO_NOTIFICATIONS_AUDIENCE=enabled_clients` continua pendente de autorização. Não houve alteração de Secrets, credenciais ou banco de produção. A revisão estática não substitui a execução das propostas em Postgres descartável.

## Testes e limitações

| Evidência | Resultado |
|---|---|
| 62 testes direcionados da entrega anterior | Evidência preservada; não repetidos |
| Classificação de falhas de login | Aprovada |
| Formulário real em React/JSDOM: senha exata, e-mail normalizado e rota do cliente | Aprovado com autenticação simulada |
| Erros retornados ou lançados de conexão, sem mensagem falsa de credenciais | Aprovado |
| Recusa de credenciais e retorno sem usuário, sem navegação indevida | Aprovado |
| Novos testes desta retomada | 4 aprovados, zero falhas |
| TypeScript após o ajuste | Aprovado |
| ESLint do formulário e helper alterados | Zero erros e zero avisos |
| Build com dependências exatas | Pendente: instalação/build anteriormente bloqueados por npm/DNS/EPERM; não repetidos |
| Postgres/Supabase descartável e RLS real | Pendente: acesso ao pipe do Docker novamente recusado por permissão |
| Visual autenticado, responsividade e temas dos cinco portais | Pendente: navegador interativo indisponível |
| Login no computador afetado | Pendente de reprodução local, horário e código do erro |

São 66 testes distintos aprovados nas duas entregas, não uma homologação integral em banco ou navegador reais. Não foram usados usuários, projetos ou calendários reais como fixtures.

## GitHub sem deployment

A configuração `git.deploymentEnabled=false` foi confirmada no arquivo local e na main remota e será preservada no candidato. A documentação oficial da Vercel confirma que `false` desabilita deployments automáticos para todas as branches. Os workflows versionados têm filtros de branch que não incluem esta branch; não foi aberto PR nem disparado workflow remoto.

A branch remota ainda não existia na conferência inicial. Como o Git do terminal falhou em DNS (`getaddrinfo() thread failed to start`), a consolidação remota usa o conector GitHub, com conteúdo conferido contra a árvore local, mantendo a main intacta. O commit remoto pode ter metadados/SHA diferentes dos commits locais; a integridade é verificada pelo SHA da árvore completa. O commit local anterior permanece recuperável.

Não se alteram `vercel.json`, a integração Git/Vercel, aliases, domínios ou regras de firewall. Não se cria deployment de preview, staging ou produção. A publicação final continua exclusivamente manual no painel e depende de autorização expressa.

## Publicação final pelo painel, somente após autorização

1. Concluir as verificações técnicas pendentes e aprovar especificamente os SQLs, a regularização de vínculos e a configuração de público. Antes da aplicação autorizada, garantir ponto de recuperação atual, conferir drift com o preflight e validar permissões após aplicar apenas os scripts aprovados.
2. Confirmar qual branch já está configurada como Production Branch, sem mudar a configuração. Se necessário, após autorização, disponibilizar nela o commit aprovado por avanço fast-forward, mantendo `git.deploymentEnabled=false`. A comparação atual mostra que main é ancestral do release, mas a relação deve ser conferida novamente no momento da promoção. Não fazer force-push.
3. Abrir o projeto `rotevo-ecossistema` em `https://vercel.com/rotevo-marketing/rotevo-ecossistema`, entrar em Deployments e escolher Create Deployment. Informar o SHA final aprovado e selecionar a configuração da branch de produção existente.
4. Antes de confirmar, verificar que o destino é Production e usa as variáveis de Production. Se a interface oferecer somente Preview, parar e conferir a referência/branch; não criar uma publicação intermediária para depois reconstruir.
5. Criar um único deployment, aguardar READY e conferir o SHA servido por `app.rotevo.com.br`. Não alterar os aliases do Método EPC. Preservar o deployment anterior para rollback.

Referências oficiais: https://vercel.com/docs/project-configuration/git-configuration e https://vercel.com/docs/git#creating-a-deployment-from-a-git-reference.

Nenhuma dessas etapas de aplicação de banco ou publicação foi executada. A autorização de desenvolvimento não é autorização de publicação.

## SHA-256 das propostas preservadas

- `ui3-portal-standardization-preflight.sql`: `00dd9f78cea797630e1184c5d5987d3a29fb903534b70f5abb7315f521278b33`
- `ui3-portal-standardization-structures-PROPOSAL-ONLY.sql`: `0470a494941ad8fca4ef112d6cb36f9387321f8c9215f5b027e7b862acd0a991`
- `ui3-portal-standardization-associations-PROPOSAL-ONLY.sql`: `dc933ac6d5809af83f196f4be7097e50e4b56598baa476e87d2aa6011145e569`
- `ui3-portal-standardization-functions-ROLLBACK-ONLY.sql`: `cec9a39ec473895facb7d506135659210bdeb473ee81fffeb17b5baf5e903bfc`
