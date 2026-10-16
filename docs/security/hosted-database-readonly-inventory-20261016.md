# ROTEVO — Inventário somente leitura do banco hospedado (16/10/2026)

**Projeto:** Supabase `kadvzjelkyfwouqmlxaa`.
**Método:** consultas SELECT ao catálogo PostgreSQL, `pg_policies`, `pg_get_functiondef` e Security Advisors. Nenhuma escrita, migration ou alteração de configuração foi realizada.
**Status:** investigação, não aprovação de implantação.

## Riscos confirmados

1. `public.planning_projects` possui RLS habilitado, mas o papel PostgreSQL `authenticated` possui SELECT e UPDATE sobre a coluna JSONB `data`. O papel `anon` também apresenta grants sobre essa coluna; RLS e autenticação devem ser avaliadas em conjunto.
2. A política `clients_read_own_projects` e a política `Client users can read their planning projects` concedem leitura da linha da empresa ao usuário vinculado. RLS restringe linhas, **não propriedades de um JSON**.
3. `public.profiles` possui RLS com a política `Users can update own profile`. O inventário encontrou grants amplos e a migração de restrição por coluna ainda depende de autorização de implantação.
4. `public.is_strategist()` é `SECURITY DEFINER`, usa `SET search_path TO 'public'`, lê `public.profiles` por `auth.uid()` e responde boolean. Os papéis `anon` e `authenticated` possuem EXECUTE. A função é referenciada por políticas de `profiles` e `planning_projects`; alteração indiscriminada pode afetar autorização.
5. Supabase Security Advisor reportou `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable` e proteção de senhas vazadas desativada.

## Implicações e medidas propostas (não implantadas)

- Manter a projeção de campos do portal via `/api/client/projects` e concluir o roteamento dos consumidores administrativos pelo servidor.
- Só após inventário completo dos leitores e escritores, testar a revogação de `SELECT(data)` de `anon` e `authenticated` em laboratório; preservar leitura dos metadados necessários e os fluxos administrativos autorizados.
- Testar restrições de UPDATE em `profiles` preservando edição legítima de `full_name`, e impedir atualizações diretas de `role` e `client_id`.
- Examinar o EXECUTE de `is_strategist()` como operação separada. Revogar `anon` pode ser apropriado, mas requer teste de dependências; conservar o comportamento necessário das políticas para `authenticated`.
- Avaliar habilitar leaked-password protection como alteração de produção separada, sujeita a autorização.

## Critérios de aceite

- Clientes fictícios conseguem acessar metadados/publicações permitidos, mas a tentativa direta de SELECT de `data` é negada pela camada PostgreSQL.
- Estrategistas conseguem salvar módulos, editorial, onboarding e cronograma por endpoints autorizados, inclusive com conflito otimista HTTP 409.
- Um cliente não consegue promover seu papel nem alterar vínculo com outra empresa.
- Criação de cliente fictício válida persiste identidade + profile; duplicação não altera dados existentes; falhas são conciliáveis.
- A revisão de grants e RLS, o rollback e os testes de pós-migração ficam prontos antes de aprovação específica para implantação.

**Decisão atual:** SEM GO-LIVE. O estado de produção ainda não foi corrigido; este documento registra apenas evidências e encaminhamentos.

## Referências técnicas

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
