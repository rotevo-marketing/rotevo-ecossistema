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
