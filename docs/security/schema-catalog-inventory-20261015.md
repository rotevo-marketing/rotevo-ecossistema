# ROTEVO — complemento de inventário do esquema real (15/10/2026)

Status: metadados consultados exclusivamente em leitura. **Não constitui pg_dump integral ou teste RLS aprovado**.

## Índices confirmados por definição do catálogo
| Tabela | Índice | Definição |
|---|---|---|
| client_users | client_users_client_id_user_id_key | CREATE UNIQUE INDEX client_users_client_id_user_id_key ON public.client_users USING btree (client_id, user_id) |
| client_users | client_users_pkey | CREATE UNIQUE INDEX client_users_pkey ON public.client_users USING btree (id) |
| clients | clients_pkey | CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id) |
| clients | clients_slug_key | CREATE UNIQUE INDEX clients_slug_key ON public.clients USING btree (slug) |
| planning_projects | planning_projects_client_id_slug_key | CREATE UNIQUE INDEX planning_projects_client_id_slug_key ON public.planning_projects USING btree (client_id, slug) |
| planning_projects | planning_projects_pkey | CREATE UNIQUE INDEX planning_projects_pkey ON public.planning_projects USING btree (id) |
| profiles | profiles_email_key | CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email) |
| profiles | profiles_pkey | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id) |

## Restrições verificadas
- `client_users`: PK id, FK client_id → clients, FK user_id → auth.users, UNIQUE(client_id,user_id).
- `clients`: PK id, UNIQUE slug, CHECK status IN ('active','paused','archived').
- `planning_projects`: PK id, FK client_id → clients, UNIQUE(client_id,slug), CHECK status IN ('draft','in_progress','published','archived').
- `profiles`: PK id, FK id → auth.users, FK client_id → clients, UNIQUE email, CHECK role IN ('strategist','client').
- NOT NULL e DEFAULT de cada coluna estão disponíveis no inventário e na consulta read-only do information_schema; preservar suas definições ao construir baseline, sem adivinhar detalhes de DDL.

## Função e autorização
`public.is_strategist()` está definida como função SQL `SECURITY DEFINER` com `search_path=public` e retorno booleano baseado na existência de perfil do usuário atual com `role='strategist'` (usa auth.uid()).

`EXECUTE` é concedido a `PUBLIC`, `anon`, `authenticated`, `service_role` e `postgres`. Isso exige revisão do menor privilégio, mas não é prova isolada de escalada de autorização.

A política de atualização do próprio perfil e os grants amplos de UPDATE em `profiles` são riscos prioritários. O RLS controla as linhas, não estabelece limitação de alteração das colunas sensíveis.

## Lacunas antes de denominar o baseline completo
- Dump DDL revisado e reproduzível, incluindo ordem de criação e dependências.
- Checagem de grants efetivos e objetos de apoio além do esquema public, conforme necessário.
- Comparação de definição integral de constraints/FKs e particularidades ambientais.
- Reprodução local sem dados de clientes; execução de testes pgTAP/API somente depois.
- O histórico de migrations do Supabase remoto permanece vazio conforme consulta anterior; não marcar migrations como aplicadas no remoto.

## Regras operacionais
Nenhum comando de conexão remota, migration, usuário real ou alteração em produção foi executado nesta etapa. Não usar `db pull` como substituto automático nesta fase: ele pode sugerir mudanças no histórico remoto de migrations. Não usar `db push`, `db reset --linked` ou importação de dados reais.

Próxima atividade: revisão de DDL seguro e plano de baseline reproduzível **local**, comparando cada objeto com metadados obtidos. Registrar diferenças; nenhuma hipótese será aceita como definição real.

Referências: https://supabase.com/docs/guides/local-development/cli-workflows ; https://supabase.com/docs/guides/database/postgres/row-level-security
