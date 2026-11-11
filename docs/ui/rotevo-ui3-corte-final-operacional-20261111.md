# Rotevo UI 3.0 — Corte final: decisões e execução controlada (11/11/2026)

**Status: PRONTO PARA SOLICITAR APROVAÇÃO DA JANELA APÓS OS GATES ABAIXO; NÃO AUTORIZADO PARA PRODUÇÃO.**
Documento operacional; não contém credenciais nem dados pessoais. Preserva os documentos históricos, que podem conter critérios mais conservadores, e distingue o que foi comprovado do que ainda necessita execução.

## 1. Ambientes e evidências atuais

- **Produção:** Vercel `rotevo-ecossistema`, SHA `bec8ee26a0a33a579ce223eaffccbb04f7aaf61a`, `app.rotevo.com.br`; Supabase `kadvzjelkyfwouqmlxaa`. Conferência read-only: 18 Auth users, 2 perfis estrategistas e 5 projetos. `authenticated` ainda possui SELECT e UPDATE efetivos na coluna `public.planning_projects.data`.
- **Release:** GitHub PR #5 (`release/rotevo-ui3-rc-20261110`) em draft, sem conflitos; código de aplicação/contingência ensaiado no SHA `a66114592c394b9b44b73c835a66f80541b7615a`. Laboratórios de lançamento e contingência aprovados conforme ações do PR.
- **Homologação hospedada:** outro projeto Vercel `rotevo-ui3-homologacao` e Supabase `tqedxahsqbskninjenfg` (Free, sintético). 24 tabelas de aplicação, todas com RLS; 19 migrações após fixtures. Usuário único do Supabase Auth homologado como estrategista/admin; dois clientes e dois projetos sintéticos. Confirmado pelo responsável: login no Painel do Estrategista, listagem dos dois clientes, edição e **Salvar rascunho** do documento 01.01, F5 e conteúdo preservado. A consulta SQL do mesmo projeto confirmou o texto persistido. Nenhuma gravação/publicação de cliente real.
- **G2 isolado:** `authenticated` não pode ler/alterar `planning_projects.data`; `service_role` consegue ler/alterar; simulações SQL negativas para acesso sem vínculo, escalonamento de role e RPCs editoriais passaram. **Não afirmar que isto comprova todas as operações HTTP de cada perfil.**
- **WAF:** Work comprovou 200 → 403 → 200 em hostname exclusivo de teste e removeu a regra. Dois domínios legados com tráfego recente exigem abrangência: `app.rotevo.com.br` e `app.metodoepc.com.br`; verificar aliases adicionais antes da janela.
- **Recovery/SMTP:** URL Configuration do Supabase sintético foi ajustada para `https://rotevo-ui3-homologacao.vercel.app` e dois redirects de `/redefinir-senha`. O SMTP padrão tem restrições; a recuperação de ponta a ponta **não** foi reensaiada no ambiente hospedado. O responsável não quer repetir esse fluxo; registrar o risco residual, não criar serviço pago.
- **Acesso Vercel:** o conector só lista o projeto antigo e retorna 404 para o projeto separado de homologação. O projeto separado está comprovadamente acessível no navegador do responsável. Não confundir falha de autorização do conector com queda da aplicação.

## 2. Gate SQL read-only de 11/11/2026

Comparação direta consultada nos projetos produção e homologação:

| Critério | Produção | Homologação |
|---|---|---|
| `planning_projects`, `client_workspaces`, `editorial_approvals`, `editorial_idea_approvals` | presentes | presentes |
| Assinaturas RPC `rotevo_editorial_decide` e `rotevo_editorial_idea_decide` | presentes | presentes |
| Metadados exigidos do projeto, nove colunas; `data` JSONB; RLS ativo | compatíveis | compatíveis |
| `service_role` SELECT e UPDATE do JSON | sim | sim |
| `authenticated` SELECT e UPDATE do JSON | **sim (legado)** | **não (G2)** |
| `supabase_migrations` | 8 | 19 |

**Conclusão limitada:** preflights básicos dos SQLs de G2/RPC têm os objetos esperados em produção. Não foi feita validação integral de corpos de funções, grants em todos os objetos, efeito de permissões sobre outras rotas ou operação transacional real sobre produção. **Não aplicar automaticamente arquivos `PROPOSAL-ONLY`.**

## 3. Sequência final de implantação; não executar sem autorização específica

1. **Congelar artefatos exatos.** Identificar SHA da build UI3 de produção e SHA da contingência, ambas no projeto Vercel **original** `rotevo-ecossistema` ou compatíveis para uso nele, e reconfirmar suas variáveis de ambiente/flags antes da promoção. O projeto `rotevo-ui3-homologacao` é apenas laboratório; **não mover para ele o domínio de produção**, pois firewall e variáveis pertencem a cada projeto.
2. **Preparar restauração proporcional ao risco.** Preservar acesso administrativo comprovado, inventário de 2 estrategistas, 5 clientes, projetos e objetos privados já copiados, além dos scripts SQL da estrutura. O responsável dispensou restauração **integral de dados sintéticos descartáveis**, mas não autorizou perda indiscriminada de clientes reais. Registrar limitações do backup de banco e condições de contenção e reconstrução mínima. Se a verificação mostrar risco material de perda irrecuperável de dados reais, adiar.
3. **Confirmar WAF no projeto original**, por hostname e sem depender da proteção de Preview. Registrar aliases reais e requisições em curso; incluir `app.rotevo.com.br`, `app.metodoepc.com.br` e aliases adicionais que legitimamente encaminhem à UI2. Registrar reversão exata da regra. Limites e permissões do plano devem ser conferidos imediatamente antes da janela.
4. **Aprovação explícita do responsável** para: janela, eventual indisponibilidade temporária, promoção SHA exato e transações SQL especificadas de grants/RPC. Não confundir autorização da homologação Free com esta.
5. **Bloquear tráfego UI2 antes da troca**, testar os hostnames externamente e drenar requisições. No projeto original, **promover uma build UI3 que utiliza o Supabase de produção**, com flags de colaboração em estado seguro. **Não efetuar merge de PR #5 em `main` antes de conter tráfego**, pois a branch da Vercel original pode autodeployar.
6. Enquanto o WAF estiver ativo, confirmar **pelo domínio efetivo** que a UI2 não responde mais e que a UI3 está na versão esperada. Se incerto, abortar a alteração SQL; UI2 pode ser restaurada antes de G2.
7. Aplicar os SQLs de G2 e hardening editorial reconciliados em transações, auditando pós-condições de `anon`, `authenticated`, `service_role`. Não reexecutar migrações históricas do repositório em produção por diferença de contagem. Não copiar contas/fixtures do Supabase de homologação.
8. Fazer smoke test mínimo sob contenção: login do estrategista, leitura dos 5 projetos existentes, edição sintética autorizada e reversível, leitura de cliente permitido/negado, Equipe, Financeiro e Storage. Se falhar após G2, **manter WAF** e usar somente a contingência UI3 compatível, sem devolver grants amplos.
9. Remover WAF após sucesso e vigiar 401/403/409/503, logs e funcionalidades; registrar SHA, SQL aplicado, horários e decisão. Só depois decidir merge/fechamento de PR, sem alterar a branch `main` antes de planejar novo autodeploy.

## 4. Condições de parada reais

- Não é possível demonstrar **qual deployment e qual banco** estão servindo tráfego após o corte.
- WAF não consegue bloquear todos os hostnames relevantes ou fica sem reversão testada.
- Não existe build UI3 de contingência compatível com grants restritos utilizável no **projeto original**.
- Admin não consegue reautenticar; controle do e-mail já foi confirmado, mas recovery não foi reensaiado no projeto isolado.
- Uma alteração em produção apagaria dados reais essenciais sem via de reconstrução aceitável.
- SQL G2 diverge das permissões efetivas esperadas ou o pós-teste não preserva `service_role`.

**Sem gatilho para exclusão de usuários.** Não fazer limpeza dos 11 perfis sem vínculo, pois não tem relação com a publicação. Não criar SMTP pago só para homologação. Autorizar produção somente com autorização específica do responsável.


## 5. Contingência prévia no projeto original (11/11/2026)

- Branch separada: `release/ui3-fallback-g2-20261111`, criada a partir do SHA `f2ca4c568920c414324f80d7e168e8ca192787d2`. A branch `main` e a produção foram preservadas.
- No projeto Vercel original `rotevo-ecossistema`, **somente Preview** nessa branch recebeu `ROTEVO_COLLABORATION_ENABLED=false` e `NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED=false`. Nenhum valor/segredo Supabase foi alterado.
- Deployment de contingência isolado `dpl_DKhMcggRBe5JWZpuHnmnw43C8TVR`; conferir estado READY, SHA e ausência de endpoints de colaboração antes de promover esta evidência a aprovada.
- **Alerta operacional crítico:** variáveis exclusivas de Preview **não migram automaticamente** para um deployment Production promovido/recriado. O preview com flags falsas **não é suficiente** para marcar a contingência de produção como pronta. Será obrigatório congelar uma build/estratégia de produção com ambas as flags false, testar suas variáveis efetivas e garantir que sua ativação durante a contenção não reabra mensagens. Essa validação é anterior à aprovação da janela.
- Referências oficiais: https://vercel.com/docs/deployments/promoting-a-deployment e https://vercel.com/docs/environment-variables.
