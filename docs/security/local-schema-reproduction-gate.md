# Rotevo | Gate para reprodução local do esquema

Status: preparação; **nenhum dump executado, nenhuma migration aplicada, nenhum teste executado**.

## Condição bloqueante
O repositório não possui baseline estrutural completo das quatro tabelas legadas (profiles, clients, client_users, planning_projects). Não executar as migrations de 15/10 isoladamente e não reconstruir objetos por suposição.

## Exportação somente esquema
Executar a exportação com o comando oficial `supabase db dump` em uma estação controlada, usando opção de somente esquema (comportamento padrão do comando) e arquivo de saída local. Conferir `supabase db dump --help` na versão instalada antes de selecionar flags e conexão. **Não usar `--data-only`**. O arquivo bruto não deve ser enviado ao GitHub nem compartilhado sem revisão de segurança.

As credenciais de produção nunca devem ser colocadas em comandos, logs, arquivos versionados ou respostas. Evitar `supabase link` para uma execução destinada exclusivamente a testes locais; usar um procedimento de exportação autorizado e de menor privilégio. Não executar nenhum comando de escrita no projeto remoto.

## Revisão do artefato
- Confirmar que não há COPY, INSERT ou conteúdo de usuários/clientes.
- Conferir CREATE TABLE, índices, constraints, FKs, grants, RLS, policies, funções, extensões e dependências em auth.
- Remover ou adaptar somente elementos ambientais após revisão técnica; documentar qualquer diferença.
- Armazenar a cópia revisada localmente, sem segredos. Criar hash e registro de origem.
- Antes de versionar qualquer DDL, realizar revisão explícita dos objetos sensíveis.

## Ativação do ambiente isolado
Após aprovação do baseline: iniciar stack local de Supabase CLI/Docker sem vínculo remoto; confirmar endereços e chaves **locais**. Aplicar baseline revisado, seguir ordem de migrations e criar dados sintéticos. Só então executar `supabase test db --local` com pgTAP, além de testes via API com tokens de identidades fictícias.

## Primeiros testes obrigatórios
1. Cliente não pode alterar profiles.role/client_id.
2. Cliente só altera seu próprio full_name.
3. Cliente A não lê registros de cliente B.
4. Cliente não lê chaves internas de planning_projects.data por API.
5. Administrador inativo não convida nem acessa projetos.
6. Aprovação editorial só para conteúdo próprio publicado para validação, uma vez por versão.
7. Regressão de criação de acesso de cliente e login.

## Critério de conclusão
Cada cenário terá resultado observado, identidade sintética, grants/policies implicados, evidência e status. Não declarar PASS sem execução efetiva. Não liberar produção nem fazer deployments automaticamente.

Referências: https://supabase.com/docs/reference/cli/supabase-db-dump e https://supabase.com/docs/guides/local-development/testing/overview
