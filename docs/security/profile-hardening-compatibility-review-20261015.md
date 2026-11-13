# ROTEVO — revisão de compatibilidade da proteção de perfis
Data: 2026-10-15. Escopo: branch `feature/admin-v2-redesign`. Nenhuma operação em produção.

## Regra sob validação
A migração proposta `supabase/migrations/20261015_harden_profile_authorization.sql` remove UPDATE amplo de `anon` e `authenticated` sobre `public.profiles` e libera ao usuário autenticado somente `full_name`, sujeito à RLS. Ela **não foi implantada**.

## Fluxos revisados no código
1. `src/app/api/admin/create-client-access/route.ts`: utiliza cliente `service_role` no servidor para inserir/atualizar `profiles` com `role`, `client_id`, `email`, `updated_at`. O novo bloqueio de UPDATE ao papel `authenticated` não elimina esse fluxo privilegiado. Este fluxo exige testes de regressão completos antes de implantar.
2. `src/app/admin/planejamentos/[clientSlug]/acesso/page.tsx`: verifica `profiles.role` para restringir o acesso; invoca a rota administrativa acima; também constrói SQL de manutenção manual que atualiza `role` e `client_id`. Esse SQL deve permanecer restrito a operador de banco autorizado, nunca executado pelo navegador com a chave anônima.
3. `src/Components/admin/TeamDirectory.tsx`: lê `team_members`; não edita `profiles`.
4. `src/Components/admin/ClientsDirectory.tsx`: insere em `clients`; não edita `profiles`.

## Resultado e limites
- Testes SQL da migração protegida: GitHub Actions `38836418444`, sucesso.
- Teste HTTP de edição legítima de `full_name`: `38836525153`, sucesso.
- Testes HTTP adicionais que negam alteração direta de `role` e `client_id`: introduzidos no commit `b4900936`; **aguardar a conclusão da execução `38836795898`**.
- A revisão acima abrange somente os arquivos explicitamente examinados; não prova inexistência de outros pontos de escrita no repositório.
- Os testes CI reproduzem um esquema em laboratório; não verificam o estado atual do banco hospedado.

## Gate para produção
Não executar migração até revisar fluxos de cadastro/edição, conferir grants e policies de produção por leitura autorizada, demonstrar rollback e obter autorização explícita. Não habilitar convites nem realizar deployment como parte deste documento.

## Revisão complementar de telas (2026-10-15)
Arquivos efetivamente examinados:
- `src/app/admin/page.tsx`: consulta `profiles` para autorização; alteração observada é de `planning_projects`, não de `profiles`.
- `src/app/cliente/page.tsx`: consulta `profiles.role` e `profiles.client_id`; não grava em `profiles` no trecho inspecionado.
- `src/app/estrategista/login/page.tsx`: autenticação e consulta de perfil; nenhuma atualização de `profiles` identificada.
- `src/app/admin/planejamentos/[clientSlug]/page.tsx`: consulta `profiles`; operações de UPDATE encontradas em outras entidades, como `planning_projects`.
- `src/Components/admin/ProjectOnboarding.tsx`: atualização de `planning_projects`, não do perfil.
Na amostra acima, nenhuma dependência de UPDATE amplo do papel `authenticated` em `public.profiles` foi encontrada. **Esta constatação é limitada aos arquivos lidos e não substitui pesquisa exaustiva nem testes de produção.**

Pendente para decisão de implantação: testar regressão completa da rota `create-client-access` no cenário de criação autorizada sem efeitos externos, incluindo compensação, e analisar caminho de manutenção SQL da tela de acesso.
