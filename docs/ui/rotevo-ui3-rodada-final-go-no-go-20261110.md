# Rotevo UI 3.0 — Fechamento da rodada 01–03 e release gate (10/11/2026)

## Identificação
- Repositório: `rotevo-marketing/rotevo-ecossistema`
- Branch estável de candidato: `release/rotevo-ui3-rc-20261110`
- PR de integração com main: [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5), **DRAFT / mergeable=false / dirty** no último preflight. Não executar merge forçado.
- Ambiente Vercel preview do candidato: READY. Produção `app.rotevo.com.br` continua no SHA `bec8ee26`, sem promoção UI3.
- Nenhum serviço pago criado; nenhuma modificação em dados/grants/identidades hospedadas.

## Etapa 01 — reconciliação do Supabase

**APROVAÇÃO parcial e delimitada:** catálogo do Supabase hospedado comparado com laboratório PGlite gratuito usando snapshot `scripts/security/ui3-hosted-catalog-snapshot.mjs`, derivado apenas de consultas metadata read-only, sem linhas de clientes:
- 24 tabelas, 162 campos (nome, tipo e nulabilidade), 36 entradas de tabelas/policies/RLS e 15 funções (schema, nome, argumentos e SECURITY DEFINER) com **paridade exata** no CI [42809470419](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809470419), SUCCESS.
- Histórico hospedado com oito migrations; a montagem do laboratório seleciona DDL relevante e usa arquivos históricos com versões diferentes. Não executar migrations antigas em produção por suposta ausência em `supabase_migrations` sem revisão.
- Comparação **não** cobre totalmente corpos/atributos de funções, `USING/WITH CHECK` de policies, grants em outros objetos, triggers, índices, defaults, ou serviços gerenciados de Auth/Storage. Isso continua um limite explícito de produção.

## Etapa 02 — segurança, contingência e recuperação

- [42809566139](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809566139), SUCCESS: SQL de restrição JSON passa no esquema compatível; em schema drift aborta transação sem privilégios parcialmente alterados; teste posterior demonstra retorno de software mantendo `SELECT/UPDATE` de `planning_projects.data` negado a papéis comuns e funcionalidade de `service_role` preservada.
- [42807510496](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42807510496), SUCCESS: patch SQL **PROPOSAL ONLY** das RPCs editoriais foi validado com Auth/PostgREST local, incluindo negação quando não existe workspace, negação de troca inicial de senha e aprovações legítimas preservadas.
- O Supabase hospedado ainda permite `SELECT/UPDATE` direto do campo privado para `authenticated` e as definições antigas das RPCs permanecem. **A correção não foi aplicada hospedada.**
- **Bloqueio de dados/continuidade:** esta rodada não produziu nem validou um backup privado atual, completo e restaurável. Há relato de backup histórico antes da mudança de Equipe em outubro, mas ele **não** constitui backup de implantação da UI3 de novembro. Antes de qualquer alteração hospedada, executar backup externo privado, confirmar restauração e tratar separadamente os bytes de Storage; jamais publicar dumps ou credenciais no GitHub público.
- Planos e instruções: `docs/ui/rotevo-ui3-release-preproduction-runbook-20261110.md`.

## Etapa 03 — reconciliação da main e candidato final

- Seis commits exclusivos da `main` contêm recursos da V2 e gestão de Equipe. A UI3 preserva os comportamentos de Equipe, convites, permissões, recuperação de senha e marca na nova interface em abas. [42809880079](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809880079), SUCCESS, inclui quatro grupos de testes estáticos específicos e toda a matriz de build/SQL.
- O ancestral comum dos branches é `5a7d434b`; a comparação 3-way identifica **23 arquivos alterados de ambos os lados** e **dois exclusivos da main**. O registro histórico `docs/security/team-users-release-20261016.md` foi preservado na branch de candidato. A rota legada `/admin/equipe` foi substituída por aba no admin UI3; não restaurar código V2 sem revisão explícita.
- PR [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5) aberto como draft, não mergeável devido a conflitos. Nenhum merge para `main` ocorreu. **Reconciliar conflitos manualmente**, mantendo os testes verdes e a arquitetura aprovada.
- Candidato tem prévia READY; no mesmo código, [42810603480](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42810603480) SUCCESS (regressões, TypeScript, build) e [42810585033](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42810585033) SUCCESS (7 grupos Auth/API/Storage/Financeiro, UI sintética, planejamento publicado HTML/CSS, Contratos e sete viewports). O último commit pode ser apenas documental, sem alterar esses arquivos testados.

## Aceite e decisão de implantação

**NO-GO real de produção**: faltam backup privado/restauração e evidência de recuperação do ambiente hospedado, revisão final de autorização além da metadata, avaliação assistiva manual e identidade hospedada da Equipe, solução sem conflitos para PR #5 e aplicação/revalidação das propostas G2/RPC hospedadas. Não transformar aprovação de laboratórios em autorização técnica para publicar.
 
**Próxima sequência segura**: resolver conflitos do PR sem merge automático; obter backup privado e validar restauração (fora dos artifacts públicos); fechar os testes manuais e auditados; aplicar grants/RPCs com transação, pós-testes e plano de retorno; promover somente o SHA aprovado na Vercel; monitorar domínio e portais.

**Referências**: `docs/ui/rotevo-ui3-homologacao-consolidada-20261109.md`, `docs/ui/rotevo-ui3-main-reconciliation-20261110.md`, `docs/ui/rotevo-ui3-release-preproduction-runbook-20261110.md`.


## Atualização de release — PR sem conflitos, validação de segurança (10/11/2026)

Este adendo substitui o estado `mergeable=false / dirty` indicado acima. Após inspeção 3-way do ancestral comum e dos arquivos concorrentes, a branch de RC incorporou o histórico exclusivo da main, manteve os componentes aprovados de UI3 para os 23 arquivos com mudanças concorrentes e preservou o link legado `/admin/equipe` como redirecionamento para `/admin?section=team`. As escolhas e riscos estão em `docs/ui/rotevo-ui3-git-conflict-resolution-20261110.md`.

O commit de reconciliação Git `ddc93dc5935b78a24214ccde9e7f016632836284` tem dois pais e foi aplicado apenas a `release/rotevo-ui3-rc-20261110`. O PR [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5) agora retorna `mergeable=true`, mas continua draft e não deve ser mesclado à main sem aceite técnico.

O teste `scripts/security/ui3-main-parity.test.mjs` foi corrigido para verificar o parser real `new URLSearchParams(...).get("section")` em vez de variável não existente. O laboratório visual passou a testar também as teclas ArrowRight, Home, End, foco e relação ARIA das abas de Contratos. Não constitui teste manual com leitor de tela.

Um job antigo de `security-checks.yml` falhou por ausência de `npm ci` no grupo que importa `isomorphic-dompurify`; a causa foi corrigida adicionando instalação de dependências travadas. A execução [42815189969](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42815189969) encerrou com **SUCCESS em seis jobs** (incluindo TypeScript, build e segurança). A última execução integrada de teclado ainda precisa ser concluída e conferida no seu próprio SHA antes de ser declarada aprovada.

**Backup:** a pesquisa no Drive conectado não encontrou arquivo atual identificável como backup restaurável de novembro. Isso não prova inexistência em outros locais. O conector do Supabase disponível não fornece uma exportação segura de bytes do banco e do Storage para destino privado. Nenhum dump de dados de clientes foi feito, transmitido ao chat ou colocado em artifact público. O requisito de backup/restauração de produção continua aberto.

**Estado:** merge conflict resolvido no PR de rascunho; segurança de CI aprovada; produção `app.rotevo.com.br` e banco hospedado sem alterações; NO-GO devido a backup/restauração, SQL hospedado G2/RPC e acessibilidade humana pendentes.


### Fechamento das execuções do candidato (10/11/2026)

- [GitHub Actions 42815189969](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42815189969): **SUCCESS**, seis jobs de Segurança, incluindo build, TypeScript, dependências, autorização e isolamento sintético. O workflow foi corrigido para instalar dependências travadas antes do teste operacional que importa `isomorphic-dompurify`; a falha antiga não persiste.
- [GitHub Actions 42814518276](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42814518276): **SUCCESS**, sete grupos integrados reais locais e homologação visual em Chromium. Logs confirmam `PASS shared contract keyboard ArrowRight/Home/End, focus and ARIA tabpanel mapping`, quatro abas, planejamento publicado `ACCESSIBILITY published planning []` e os três portais sintéticos.
- Pull request [#5](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/5): mergeable=true, draft mantido, integração com a `main` **não executada**. A condição `unstable` ainda exige revisão das verificações de branch antes do merge.
- A Vercel reportou prévia **READY** para o candidato; produção continua `bec8ee26` com aliases preservados.

**Bloqueio real restante:** falta backup **atual, privado e restaurável**, incluindo bytes do Storage, e avaliação assistiva humana; sem essas provas não se deve aplicar grants/RPCs hospedadas nem promover a UI3. O conector Supabase não fornece a saída segura de um `pg_dump` para um destino privado e não é aceitável transportar dados reais via logs públicos. A pesquisa de nomes de arquivo no Drive conectado não identificou backup atual de novembro, sem excluir possíveis cópias em outros locais.
