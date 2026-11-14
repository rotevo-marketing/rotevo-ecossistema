# ROTEVO — desenvolvimento V2

- Continuar o painel do estrategista e o ecossistema na branch `feature/admin-v2-redesign`; preservar a identidade V2 aprovada.
- Nesta etapa, implementar e homologar localmente. Não interpretar "pode seguir" ou "pode executar" como autorização para publicação.
- Sem push, implantação, merge na main ou promoção de deployment sem pedido específico do usuário. Agrupar futuras publicações da interface V2.
- Usar somente o Supabase local para testes mutáveis e contas sintéticas. Nunca usar cliente, projeto ou identidade real como fixture.
- O banco hospedado já recebeu a migração de segurança `20261016221513` após recuperação verificada. Não reaplicar o histórico de propostas indiscriminadamente.
- Preservar os backups e os arquivos de conexão privados fora do Git; nunca mostrar credenciais.
- Estado e limites da homologação: `docs/security/team-v2-local-validation-20261016.md`. A entrega antecipada na interface antiga foi revertida; o HEAD da main não representa a versão atualmente servida.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
