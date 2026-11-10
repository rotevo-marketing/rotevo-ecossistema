# Rotevo UI 3.0 | Bloqueio G2: JSON privado de projetos acessível diretamente

**Data da revisão:** 09/11/2026  
**Estado:** **NO-GO para publicação da UI 3.0**, até corrigir e comprovar a confidencialidade do campo `planning_projects.data`  
**Tipo:** análise de permissão e proposta de remediação; **nenhuma migração executada**

## 1. Evidência atual (leitura sem dados de clientes)

Consulta das permissões do Supabase hospedado:
- `has_table_privilege('authenticated','public.planning_projects','SELECT')` → `true`;
- `has_column_privilege('authenticated','public.planning_projects','data','SELECT')` → `true`;
- existem políticas `SELECT` que tornam visíveis ao cliente os registros de projetos vinculados ao seu tenant;
- as políticas RLS restringem **linhas**, e não separam campos internos do `JSONB` de cada linha.

**Conclusão:** o cliente autenticado tem potencial acesso, via Data API/PostgREST, ao JSON privado do **próprio** projeto, independentemente da projeção segura da UI 3.0. A avaliação não utilizou credenciais de cliente para explorar esse caminho nem leu o conteúdo privado de nenhum projeto. O laboratório já tinha identificado esse comportamento no teste de caracterização `supabase/tests/database/planning_data_exposure_characterization_test.sql`.

Essa constatação não prova acesso a dados de **outros tenants**, que permanece bloqueado no modelo de RLS inspecionado. Também não prova uma exploração realizada.

## 2. O que já foi feito no código

- Portal do Cliente lê `/api/client/projects`, autenticado e filtrado pelo `client_id` derivado da identidade, usando `projectForClient` com allowlist.
- Visão Geral do Estrategista, Planejamento, Editorial e cronogramas principais migraram leitura/escrita privada para endpoints administrativos autorizados. A página do Planejamento ainda lê **metadados sem JSON** diretamente por RLS.
- A branch já contém `docs/security/tests/planning-data-column-grant-proposal-local.test.sql`, experimento de GRANT por coluna, que **não é migração aprovada**, e a matriz legada `docs/security/planning-json-admin-compatibility-matrix-20261015.md`.
- `scripts/security/ui3-raw-json-release-gate.test.mjs` impede que os principais leitores conhecidos voltem a usar JSON direto no navegador, mas **não corrige por si só** os grants do banco.

## 3. Sequência obrigatória de remediação

1. **Inventariar TODOS os consumidores diretos e indiretos** de `planning_projects.data`, em UI, API, funções SQL, regras RLS, Editor, aprovações, tarefas e relatórios. Não supor que os consumidores revisados esgotam o repositório.
2. **Preparar instância Supabase isolada**, com migrações reconciliadas e identidades sintéticas: estrategista administrador, colaborador com leitura, colaborador sem acesso, cliente A, cliente B e conta com troca obrigatória de senha.
3. **Ensaiar os grants por coluna** com o teste já registrado em `docs/security/tests/planning-data-column-grant-proposal-local.test.sql`. Ao revogar `SELECT` da coluna `data` do papel PostgreSQL `authenticated`, preservar leitura de colunas de metadados necessárias. Observar que `authenticated` é um papel compartilhado por estrategistas e clientes: o ajuste pode quebrar leitores/atualizadores administrativos diretos.
4. **Executar testes positivos e negativos em RLS real**, nunca somente mocks: clientes A/B só veem metadados de seus projetos; nenhum pode selecionar o JSON; estrategista conserva visualização, edição, publicação e persistência através dos endpoints; staff respeita projeto/permissões; aprovações editoriais mantêm decisões legítimas.
5. **Testar o ciclo documental completo** em ambiente isolado: HTML grande, versão do documento, `expectedUpdatedAt`, concorrência, aprovação, publicação e reabertura.
6. **Testar as funções editoriais** `rotevo_editorial_decide` e `rotevo_editorial_idea_decide`; usam `SECURITY DEFINER` com verificações de `auth.uid()`, `client_id` e conteúdo compartilhado. A regra atual trata workspace inexistente como compatível para o módulo Conteúdo e deve ser harmonizada em migração analisada, sem desabilitar os fluxos legítimos.
7. **Preparar migration com rollback ensaiado**, backup e plano de incidente, observabilidade pós-implantação e aprovação específica antes de alterar grants e rotinas hospedadas.

## 4. Gate de liberação

**NO-GO** se qualquer cliente puder ler `planning_projects.data` por consulta direta, mesmo que a interface esconda suas informações; se a política romper a edição do estrategista; se faltar teste com dois tenants; ou se rollback puder reabrir exposição sem revisão explícita.

**GO somente após** prova ponta a ponta da negação do JSON, preservação do administrativo, regressões GitHub Actions aprovadas, homologação visual por perfil e autorização específica para implantação.

## 5. Recursos oficiais

- [Supabase: teste de RLS com pgTAP](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)
- [Supabase: controle de acesso por linha](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: ambiente local isolado](https://supabase.com/docs/guides/local-development)

Nenhum dado real foi alterado, nenhum segredo foi registrado neste documento e não houve publicação em produção.


## 6. Revisão final de compatibilidade, 10/11/2026

O inventário `node scripts/security/planning-project-consumer-inventory.mjs` encontrou **19 chamadas diretas** à tabela e **zero `UNSAFE_BROWSER_PROJECT_JSON_ACCESS`**. É um inventário estático, não prova de ausência de qualquer consumidor SQL externo. A matriz histórica recebeu uma atualização para a branch UI3.

O ensaio `scripts/security/ui3-full-sql-compat-local.mjs` executa 14 arquivos SQL selecionados, incluindo o baseline legado e funções financeiras/editoriais originais, em PostgreSQL WASM descartável. Foram aprovados sete grupos: carga conjunta, grants, ciclo financeiro, persistência JSONB curta/extensa com CAS e RETURNING, aprovações editoriais, recusa de conteúdo oculto/versão antiga e isolamento de outro tenant. Auth é representado por funções locais de claims e Storage por tabelas mínimas; não equivale ao Supabase completo, PostgREST, login real ou homologação HTTP do editor.

A proposta SQL passou a remover também privilégios de tabela herdados de `PUBLIC` e grants explícitos da coluna `data`. Revogar somente o grant de tabela de `authenticated` não elimina essas outras origens de acesso. O laboratório semeia essas permissões amplas antes de aplicar a proposta e confirma que o servidor mantém SELECT/UPDATE. **O arquivo continua PROPOSAL ONLY, fora de migrations e nunca executado no ambiente hospedado.**

Reprodução local sem conexão externa: instalar `@electric-sql/pglite@0.5.16` com `npm install --prefix /tmp/rotevo-sql-validation --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.16`; executar `ROTEVO_SQL_LAB_MODULE=/tmp/rotevo-sql-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/security/ui3-full-sql-compat-local.mjs`. A base é somente em memória. O mesmo ensaio foi acrescentado ao job existente de regressão.

**Pendências mantidas:** conciliar todas as migrations com o schema hospedado; teste integral Auth/PostgREST/Storage/editor com identidades sintéticas; harmonizar fallbacks de workspace nas RPCs editoriais e financeiras; revisar senha inicial nas RPCs financeiras acessíveis diretamente; ensaiar rollback seguro e obter autorização específica para grants hospedados. Não alterar `SECURITY DEFINER` ou revogar EXECUTE indiscriminadamente: as aprovações legítimas dependem dessas funções e devem conservar suas verificações internas. O gate G2 continua **NO-GO**.


## 7. Revisão da apresentação e plano de implantação/retorno, 10/11/2026

A revisão adicional comprovou duas lacunas no handler `/api/presentation/project`: permitia a identidade com troca inicial de senha pendente e, sem workspace, usava `emptyWorkspace()` como configuração de serviços. O teste comportamental do handler original falhou nesses dois cenários antes da correção e passou nos quatro cenários depois. A branch passou a recusar a troca pendente antes de criar o cliente privilegiado e a negar planejamento sem módulo explicitamente configurado. Nenhuma conta/workspace hospedado foi modificado.

O laboratório integrado seleciona os mesmos 14 arquivos do manifesto `scripts/security/ui3-sql-baseline.mjs`, adiciona a proposta de grants somente ao projeto temporário não vinculado e usa GoTrue, PostgREST, Storage e rotas Next.js originais. A criação de identidades, uploads, revisões, publicações e lançamentos desse laboratório é exclusivamente fictícia. Não é espelho reconciliado de todas as migrations do ambiente hospedado; evidência de execução e limites constam na homologação consolidada.

Plano revisável, sem autorização de execução hospedada:

1. Congelar uma referência de código validada; conferir consumidores externos, funções, owners, grants efetivos e schema equivalente, sem exportar dados reais para fixtures públicas.
2. Homologar os perfis e dimensões restantes e os contratos HTTP/Storage; concluir a harmonização de senha inicial e workspace nas RPCs diretamente expostas. Não transformar funções SECURITY DEFINER ou revogar EXECUTE indiscriminadamente.
3. Obter aprovação específica para a alteração hospedada, com janela, responsáveis e backup privado verificável. Aplicar a restrição transacional com preflight/postflight; nenhum papel comum pode terminar com SELECT/UPDATE em data, inclusive via PUBLIC/herança.
4. Validar negações com identidades sintéticas autorizadas e editor via servidor, incluindo concorrência, publicação e assets; monitorar 401/403/409/503 e falhas de edição. Não editar documentos reais como teste.
5. Em incidente, suspender o avanço e retornar somente a build comprovadamente compatível com grants restritos e com as guardas de autenticação preservadas. Se não houver build compatível, exigir decisão de segurança e contenção revisada. **Não restaurar grants amplos de JSON como rollback automático.**
6. Distinguir abortar uma transação incompleta de reverter uma restrição já confirmada. Um abort retorna ao estado prévio e não resolve uma exposição que já existia; manter o bloqueio da implantação até nova validação.

O teste legado `planning-data-revocation-rollback-local.test.sql` caracteriza a restauração de permissões inseguras em transação fictícia; **não é um runbook de retorno para produção**. O ensaio operacional completo de retorno seguro ainda precisa ser concluído em schema equivalente. G2 continua NO-GO enquanto os grants hospedados permanecerem amplos.
