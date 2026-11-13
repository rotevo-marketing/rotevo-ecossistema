# Rotevo UI 3.0 | Candidato de release e sequência de implantação segura

**Preparação:** 10/11/2026  
**Branch:** `feat/rotevo-ui2-pilot-20261109`  
**Estado:** **NO-GO** para implantação, documento operacional de preparação.  
**Alvos protegidos:** `app.rotevo.com.br` e Supabase hospedado da Rotevo.  
**Permissões:** nenhuma migração, promoção ou alteração de produção é autorizada por este arquivo.

## 1. Evidência já aprovada

- UI3: três telas iniciais testadas nas larguras 320, 375, 390, 430, 768, 1024 e 1440 CSS px, sem transbordamento. Auditoria `axe-core` WCAG 2/2.1 A/AA, nos fluxos iniciais de Estrategista e Cliente a 390 px, sem violações detectadas após correção de seis itens de contraste. **Não substitui leitor de tela ou auditoria de todas as telas internas**.
- Equipe: login `staff`, projeto atribuído, financeiro negado, foco/Tab e logout no navegador Chromium com Supabase sintético.
- Integração: seis grupos sintéticos com Auth, API, Storage, documentos/HTML e Financeiro.
- Segurança G2: [PostgreSQL descartável `42795642775`](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42795642775), conclusão **SUCCESS**. O workflow executou **o próprio arquivo da proposta SQL** `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql` após montar tabela de 10 colunas, papéis `anon/authenticated/service_role` e RLS ativo. Verificou RLS, compatibilidade de schema, privação de `data`, metadados legíveis e acesso privilegiado preservado. O arquivo também tem `BEGIN/COMMIT` e postflight; **não foi aplicado ao Supabase hospedado**.
- Regressão geral de TypeScript/build: [workflow `42795495481`](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42795495481), **SUCCESS**.

## 2. Preflight do ambiente hospedado: somente leitura

> Executar com acesso administrativo seguro, sem copiar dados de clientes para logs de CI ou chat.

1. Confirmar projeto Supabase, região, nomes de banco e estratégia de backup; fazer backup testado **antes** de qualquer DDL.
2. Confirmar que a tabela `public.planning_projects` preserva as 10 colunas esperadas (`id,client_id,title,slug,description,status,data,published_at,created_at,updated_at`), `data` tipo `jsonb` e RLS ativo.
3. Verificar grants efetivos `anon`, `authenticated` e `service_role` incluindo heranças/`PUBLIC`: situação **atual não segura** esperada para `authenticated.data SELECT/UPDATE`.
4. Inventariar dependências de páginas, funções SQL, permissões de equipe, RPC, Data API/PostgREST, Editor e consumidores externos. Conferir **versão de produção**, não somente a branch de desenvolvimento. Na última revisão, a página administrativa de planejamento em `bec8ee26` selecionava apenas metadados em consulta direta; o levantamento completo de consumidores ainda é requisito.
5. Validar pelo menos um colaborador e dois clientes **sintéticos** em clone isolado equivalente ao schema hospedado, mais estrategista e serviço. Reexecutar a proposta SQL em clone e comprovar operação de editor, versões, publicação, contratos e financeira.
6. Confirmar que as regras de aprovação editorial `SECURITY DEFINER`, os métodos de recuperação de senha e os fallbacks de workspace inexistente mantêm comportamento esperado sob grants restritos.

### Consulta preflight sem dados pessoais
```sql
SELECT c.relrowsecurity AS rls_enabled,
 has_column_privilege('anon','public.planning_projects','data','SELECT') AS anon_private_select,
 has_column_privilege('authenticated','public.planning_projects','data','SELECT') AS user_private_select,
 has_column_privilege('authenticated','public.planning_projects','data','UPDATE') AS user_private_update,
 has_column_privilege('authenticated','public.planning_projects','title','SELECT') AS user_metadata_select,
 has_column_privilege('service_role','public.planning_projects','data','SELECT') AS server_private_select,
 has_column_privilege('service_role','public.planning_projects','data','UPDATE') AS server_private_update
FROM pg_class c WHERE c.oid='public.planning_projects'::regclass;
```

## 3. Critérios explícitos para GO

**Todos obrigatórios:**
- [ ] Identidades Cliente/Equipe verificadas com permissões mínimas e acessos negados; sem usar credenciais de terceiros na conversa.
- [ ] Telas internas e documentos/contratos/faturas publicados visualizados por perfis autorizados em ambiente sintético ou prévia protegida.
- [ ] Leitor de tela e foco/modal/teclado examinados manualmente para fluxos-chave; contraste e responsividade testados na versão exata do candidato.
- [ ] Schema/RPC e migrations equivalentes, teste de aplicação da proposta SQL e rollback ensaiados em clone isolado.
- [ ] Inventário completo de consumidores de `planning_projects.data`, incluindo versão atualmente publicada, sem acesso direto essencial pelo `authenticated`.
- [ ] CI do SHA exato em verde, prévia `READY`, com links/capturas/horários arquivados.
- [ ] Backup verificado, janela de implantação, observabilidade e responsáveis de contingência definidos.
- [ ] Autorização **específica e separada** para modificar grants do banco hospedado e para promover a UI3 à produção.

**Qualquer falha = NO-GO.** Um teste de laboratório sintético não certifica automaticamente o estado da produção.

## 4. Sequência operacional proposta, somente após GO

1. Registrar SHA/alias/versão que realmente atende `app.rotevo.com.br` e congelar alterações concorrentes. Revalidar backup e tempo de restauração.
2. Executar preflight transacional de esquema e grants e aplicar **somente** o SQL aprovado de restrição do JSON; interromper diante de divergência.
3. Executar postflight verificando que `authenticated` e `anon` não leem nem atualizam `data`, que metadados e `service_role` funcionam e que RLS segue ativa.
4. Publicar/promover a release candidata aprovada; validar domínio, autenticação, navegação, documentos publicados, Financeiro e Área da Equipe, incluindo negação direta do JSON.
5. Monitorar erros de 401/403/42501, API/RPC, renderização e operações do editor; registrar tempo, SHA, responsáveIs e aprovação.
6. Se aparecer regressão, suspender operações afetadas, preservar a restrição do JSON e recuperar versão de aplicação compatível. **Não restaurar automaticamente `GRANT SELECT(data)`**, pois isso reabre a exposição identificada; requer plano de contingência separado.

## 5. Pendências que ainda bloqueiam a operação

- O banco real ainda tem `authenticated` com acesso direto ao JSON privado (G2); **nenhuma alteração hospedada foi aplicada**.
- A auditoria assistiva humana e a leitura visual de documentos/contratos/faturas publicados não estão completas.
- O laboratório integrado é recorte sintético, não cópia exata de todas as RPCs/migrations.
- O ambiente hospedado não possui identidade `staff` elegível para homologação integral na prévia Vercel.
- Falta autorização de intervenção no banco e de implantação.

**Próxima decisão:** concluir requisitos pendentes e revisar um pacote de migração/rollback final para aprovação explícita. Este documento não autoriza mudanças reais.
