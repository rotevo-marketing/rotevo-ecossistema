# ROTEVO — RLS e privilégios observados (espelho de referência, NÃO migration)

**Escopo:** evidência catalogada por consultas somente leitura ao Supabase de produção em 15/10/2026.
**Uso:** revisão de baseline e construção de testes isolados. **Não aplicar este documento como SQL na produção nem no ambiente local sem reconciliação.**

## Tabelas e políticas observadas

| Tabela | Política | Operação | Critério |
|---|---|---|---|
| profiles | Users can read own profile | SELECT | id = auth.uid() |
| profiles | Users can update own profile | UPDATE | USING e WITH CHECK: id = auth.uid() |
| profiles | Strategists can manage profiles | ALL | USING e WITH CHECK: is_strategist() |
| clients | Client users can read their client | SELECT | vínculo em client_users por client_id e auth.uid() |
| clients | clients_read_own | SELECT | id = profiles.client_id para auth.uid() |
| clients | Strategists can read clients | SELECT | perfil atual role = strategist |
| clients | strategists_read_all_clients | SELECT | perfil atual role = strategist |
| clients | Strategists can manage clients | ALL | USING e WITH CHECK: is_strategist() |
| client_users | Client users can read their own link | SELECT | user_id = auth.uid() |
| client_users | Strategists can manage client users | ALL | USING e WITH CHECK: is_strategist() |
| planning_projects | Client users can read their planning projects | SELECT | vínculo em client_users por client_id e auth.uid() |
| planning_projects | clients_read_own_projects | SELECT | client_id = profiles.client_id para role client |
| planning_projects | Strategists can read planning projects | SELECT | perfil atual role strategist |
| planning_projects | Strategists can update planning projects | UPDATE | perfil atual role strategist |
| planning_projects | Strategists can delete planning projects | DELETE | perfil atual role strategist |
| planning_projects | Strategists can manage planning projects | ALL | USING e WITH CHECK: is_strategist() |

Todas as políticas acima são PERMISSIVE e direcionadas a `authenticated`. Os SQLs integrais para WHERE/EXISTS devem ser extraídos novamente de `pg_policies` para o artefato executável: esta tabela é um resumo fiel dos critérios e **não** uma reconstrução substituta dos predicados.

## Definição de função verificada

A função `public.is_strategist()` é `LANGUAGE sql`, `SECURITY DEFINER`, `SET search_path TO public`, retornando a existência de um perfil com `id=auth.uid()` e `role='strategist'`. EXECUTE foi verificado para `PUBLIC`, `anon`, `authenticated`, `service_role` e `postgres`.

## GRANTs atuais observados

Para as quatro tabelas `public`, `anon`, `authenticated` e `service_role` possuem privilégios de tabela amplos, incluindo `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `REFERENCES`, `TRIGGER` e `TRUNCATE`. Na consulta de privilégios de coluna, `profiles.role` e `profiles.client_id` são atualizáveis para `authenticated`.

**Risco prioritário observado:** RLS de UPDATE próprio em `profiles` + UPDATE amplo nas colunas sensíveis. O resultado é uma indicação fundada de possível escalada de privilégios; testar exclusivamente no ambiente isolado.

**Risco de arquitetura:** `planning_projects.data` é um JSON que pode reunir material interno e conteúdo destinado ao cliente. As políticas SELECT restringem a linha do projeto e não as propriedades individuais do JSON.

## Limites de completude

- O baseline em `docs/security/verified-schema-baseline-draft.sql` é parcial e **não contém** as políticas e GRANTs.
- Este inventário complementa o baseline mas **não instala** nada; não é migrations SQL.
- Ainda faltam validação de paridade dos objetos de catálogo, autoria/ownership, dependências de `auth`, privilégios herdados e execução de testes com identidades fictícias.
- Não mudar privilégios da produção com base nesta análise.

## Próximo portão

1. Obter as definições literais das 16 políticas do catálogo, verificar cobertura de cada objeto e produzir um artefato de testes local revisado (fora das migrations até validação).
2. Comparar os resultados no PostgreSQL local antes de marcar o baseline como fiel.
3. Simular casos de perfis, clientes, projetos, equipe, convites e aprovações com usuários fictícios.
4. Somente após resultado e revisão aprovar mudanças separadas; produção permanece bloqueada.

Referências oficiais:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/local-development/cli-workflows
