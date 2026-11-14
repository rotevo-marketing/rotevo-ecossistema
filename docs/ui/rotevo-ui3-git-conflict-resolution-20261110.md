# UI3 | Registro da resolução dos conflitos de integração com main (10/11/2026)

**Método:** integração por árvore revisada no candidato de release, preservando as implementações UI3 aprovadas e adicionando os dois conteúdos não presentes no ancestral do branch. O commit de merge deve ter como pais o candidato UI3 e a main f3fc3a903c15713899dcd84f61bcf418b3452b42, sem alterar o branch main nesta etapa.

## Decisões de conteúdo
- 23 arquivos alterados por ambos os lados foram resolvidos escolhendo a versão UI3 do candidato, porque a main continha componentes V2 substituídos pela arquitetura UI3 de navegação em abas e rotas autorizadas. Essa escolha foi acompanhada por regressões de equipe, onboarding, planejamento, contratos, apresentação, marca e recuperação de senha.
- Documentação histórica exclusiva da main, `docs/security/team-users-release-20261016.md`, foi incorporada na branch UI3 (`76a574bc`).
- Rota exclusiva da main, `src/app/admin/equipe/page.tsx`, foi mantida como **redirect** para `/admin?section=team`, que existe no admin UI3 e aplica autorização própria; mudança `dccb3181`, teste `9c4b0c1`.
- As diferenças `package.json` e `package-lock.json` continuam com a versão UI3 para preservar o lockfile já aprovado pelo `npm ci` e `build`, em vez de misturar dependências entre gerações.
- Não foram restauradas telas antigas do editor V2, nem removidos endpoints, políticas ou testes UI3.

## Lista exata de 23 arquivos com alterações concorrentes preservados pela UI3

1. `package-lock.json`
2. `package.json`
3. `src/app/admin/novo-planejamento/modulos/page.tsx`
4. `src/app/admin/novo-planejamento/page.tsx`
5. `src/app/admin/page.tsx`
6. `src/app/admin/planejamentos/[clientSlug]/acesso/page.tsx`
7. `src/app/admin/planejamentos/[clientSlug]/page.tsx`
8. `src/app/apresentacao/[slug]/page.tsx`
9. `src/app/cliente/page.tsx`
10. `src/app/estrategista/login/page.tsx`
11. `scripts/security/team-lifecycle-local-http.mjs`
12. `src/Components/RotevoTablerIcon.tsx`
13. `src/Components/admin/TeamDirectory.tsx`
14. `src/Components/admin/TeamInviteForm.tsx`
15. `src/Components/admin/TeamMemberControls.tsx`
16. `src/Components/apresentacao/EcosystemPresentationOverview.tsx`
17. `src/app/api/team/admin/transfer/route.ts`
18. `src/app/api/team/assignments/route.ts`
19. `src/app/api/team/directory/route.ts`
20. `src/app/api/team/invite/route.ts`
21. `src/app/api/team/members/status/route.ts`
22. `src/app/api/team/permissions/route.ts`
23. `src/app/equipe/meu-acesso/page.tsx`

## Portas de saída
Antes de qualquer merge do PR à main, confirmar no **novo commit com dois pais**:
- `scripts/security/ui3-main-parity.test.mjs`, testes de ambiente integrado Auth/API/Storage/Financeiro, TypeScript e build;
- CI da proposta de grants, recuperação segura e autorização das RPCs;
- Vercel READY para o SHA de release, ainda apenas preview.

**Esta resolução Git não é GO para produção.** O backup privado restaurável, verificação final de grants/corpos de funções/policies e acessibilidade assistiva precisam ser comprovados antes de migrar o banco ou promover o domínio.
