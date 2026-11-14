# ROTEVO | Migration de laboratório — plano de montagem controlada

**Status: rascunho de laboratório, NÃO executável e NÃO aplicado.**
A estrutura está preparada para conversão em uma migration local exclusivamente depois da revisão de integridade. Não colocar este artefato em `supabase/migrations` nem executar `db reset` com migrations incompletas.

## Fonte verificada
1. `docs/security/verified-schema-baseline-draft.sql`: quatro tabelas `public`, campos, defaults, PK/FK/UNIQUE/CHECK.
2. `docs/security/observed-rls-policies-review-only.sql`: 16 políticas verificadas, com predicados registrados.
3. `docs/security/schema-catalog-inventory-20261015.md`: índices e restrições.
4. `docs/security/observed-rls-and-grants-20261015.md`: inventário de privilégios.
5. `docs/security/local-authorization-readiness.md`: portões de validação.

## Ordem prevista para a migration local
1. Confirmar que `auth.users`, `auth.uid()`, `gen_random_uuid()` e a infraestrutura local do Supabase existem.
2. Criar `public.clients`, `public.profiles`, `public.client_users` e `public.planning_projects` com DDL revisado.
3. Criar `public.is_strategist()` com definição comprovada do catálogo: SQL, `SECURITY DEFINER`, `search_path=public`, verificação de perfil `role='strategist'` para `auth.uid()`. Confirmar owner e EXECUTE no ambiente local.
4. Habilitar RLS nas quatro tabelas.
5. Instalar as 16 políticas aprovadas para **espelhar o estado observado**, não como recomendação de segurança.
6. Reproduzir GRANTs observados de maneira explícita e estritamente local para comparar comportamento; nunca considerá-los seguros por padrão.
7. Confirmar índices, FKs, constraints, triggers, grants por coluna e grants de função após a execução.
8. Criar massa sintética e executar testes de regressão/RLS e API com identidades separadas.

## Critérios de parada
- Qualquer definição ausente ou diferença de dependência impede montagem final.
- O baseline observado possui risco potencial de elevação de `profiles.role` e acesso ao JSON inteiro de `planning_projects.data`. É necessário testar o comportamento **antes da correção** e depois aplicar somente correções locais.
- Não é permitido vincular esta instalação à produção, importar dumps contendo dados, executar `db push`, criar usuários reais ou fazer deploy.
- O diretório local do responsável contém uma instância Supabase iniciada, mas não é acessível diretamente por esta integração; execução dos testes dependerá da estação local ou de runner isolado autorizado.

## Critérios para promover de rascunho a migration de laboratório
- Obter confirmação técnica do DDL, função, grants, policies e particularidades de extensão/owner.
- Garantir que a migration de laboratório não será executada junto às migrations `20261015_*` antes da reprodução do estado legada.
- Realizar validação sintática em ambiente local isolado e comparação com inventário, registrando resultados efetivos.
- Manter as migrations de produção intactas.

## Próxima ação
Preparar o arquivo executável **somente local** a partir dos SQLs de referência, após concluir a revisão de integridade. O próximo avanço efetivo depende de executar os testes na instância local já iniciada no Windows, sem sincronização de produção.

Referências oficiais:
- https://supabase.com/docs/guides/local-development/cli-workflows
- https://supabase.com/docs/guides/local-development/testing/overview
