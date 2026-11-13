# ROTEVO — Consolidação de autorização e preparação local

**Estado:** inventário consolidado para revisão. Este documento não é migration nem resultado de testes.

## Evidências do banco real
- Quatro tabelas public com RLS: profiles, clients, client_users e planning_projects.
- A função public.is_strategist() é SQL SECURITY DEFINER, de propriedade postgres, com search_path public. Consulta profiles pelo auth.uid() e role strategist.
- EXECUTE da função observado para PUBLIC, anon, authenticated, service_role e postgres.
- GRANTs de tabela observados para anon e authenticated incluem SELECT, INSERT, UPDATE e DELETE, além de privilégios adicionais.
- Em profiles existe política de UPDATE do próprio registro, sem filtro de colunas, e privilégios de UPDATE em role e client_id.
- A coluna planning_projects.data é JSONB, e as políticas SELECT não isolam campos internos de conteúdo destinado ao cliente.

## Material de referência versionado
- docs/security/verified-schema-baseline-draft.sql — quatro tabelas, versão parcial não executável por decisão operacional.
- docs/security/observed-rls-policies-review-only.sql — 16 políticas observadas, somente revisão.
- docs/security/schema-catalog-inventory-20261015.md — índices e constraints verificados.
- docs/security/observed-rls-and-grants-20261015.md — inventário resumido.

## Portão para execução local
1. Revisar todos os objetos e dependências antes de transformar arquivos de referência em migrations locais.
2. Não usar credenciais do Supabase de produção no ambiente de teste.
3. Reproduzir somente estrutura, nunca dados reais, com identidades artificiais e serviços de e-mail restritos.
4. Validar RLS e permissões por coluna com pgTAP e testes de API, incluindo casos negativos.
5. Preservar os endpoints de criação de cliente, convite e o portal do cliente nos testes de regressão.
6. Documentar diferença entre configuração observada, correção proposta e resultado efetivamente testado.
7. Não executar migrations na produção, alterar usuários reais, fazer merge em main ou deployment de produção sem autorização explícita.

## Ponto crítico de arquitetura
A documentação oficial do Supabase diferencia privilégios SQL por operação de políticas RLS por linha e recomenda tratar separadamente permissões de colunas. O comportamento de profiles requer testes locais antes de mudanças.

## Próxima ação
Preparar uma migration de laboratório, claramente separada das migrations de aplicação, somente após revisão de integridade e plano de execução local. O banco local está inicializado no computador do responsável, mas este assistente não tem acesso direto à instância Docker do Windows para executar testes sem participação dele.

Referências oficiais: https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/guides/local-development/testing/overview
