# Ecossistema 2027 — Separação entre rascunho e publicação

## Fluxo desenvolvido na branch feature/admin-v2-redesign

1. **Salvar rascunho**: atualiza somente `ecosystem2027.documents[code].content`, carimbo de edição e situação `draft`. Não remove `publishedContent` anterior.
2. **Enviar para revisão**: exige conteúdo persistido, marcando `reviewStatus: review`.
3. **Aprovar**: exige `reviewStatus: review` e ausência de mudanças locais não salvas; define `approved`.
4. **Publicar versão**: exige conteúdo persistido e aprovado; copia esse texto para `publishedContent` e grava `publishedAt`.
5. **Apresentar ao cliente**: o endpoint somente expõe snapshots `publishedContent` dos documentos que estão simultaneamente selecionados e marcados para exibição, quando o projeto está publicado e a identidade pertence ao tenant. Texto editável `content` não é enviado para o cliente.
6. **Prévia do estrategista**: a apresentação usa a versão publicada, não rascunhos em andamento.

As quatro ações permanecem no painel do estrategista. O salvamento do JSON do projeto usa controle de versão `expectedUpdatedAt`, reduzindo sobrescrita de edições concorrentes. O conteúdo é exibido como texto, não HTML executável.

## Limites e próximos controles

- O mesmo estrategista pode enviar para revisão, aprovar e publicar: separação de responsabilidades por pessoas/equipe é evolução futura.
- As transições agora também são verificadas no servidor pela função `validEcosystemDocumentTransition` antes da operação de atualização com controle de versão. O teste integrado exercita aprovação fora de ordem e tentativa de publicar conteúdo diferente do aprovado. Como existe uma API genérica de atualização do projeto, ainda é recomendável migrar futuramente para endpoints documentais específicos e eliminar as permissões diretas de JSON do navegador no Supabase hospedado.
- Um projeto só é exposto para o cliente se status=published e se o módulo consta do escopo de apresentação; a publicação de um documento não publica por si o planejamento inteiro.
- Conteúdo publicado em antigos registros não possui snapshot novo; exige revisão e primeira aprovação/publicação específica. Nenhuma migração automática de conteúdo legado.
- A atualização de grants no Supabase hospedado e homologação real de usuários permanecem tarefas independentes que exigem aprovação antes de implantação.
- A validação de UI em navegadores e testes de acessibilidade ainda não foi concluída por esta rodada.

## Verificações

- `scripts/security/only-ecosystem-2027.test.mjs` protege a projeção exclusiva de `publishedContent` e as ações de publicação.
- `scripts/security/authenticated-local-http.mjs` usa projetos e usuários sintéticos do laboratório, com conteúdo aprovado e rascunho posterior, garantindo que o rascunho não seja exposto e a aprovação anterior permaneça visível.
- Workflows existentes: `security-checks.yml`, `application-build-regression-dev.yml` e `supabase-isolated-schema-smoke.yml`.

## Rodada adicional de proteção

- `src/lib/security/ecosystemDocumentTransitions.ts` implementa o validador no servidor.
- `src/app/api/admin/project/update/route.ts` valida a transição após autenticação e autorização do estrategista, antes da atualização condicional.
- `scripts/security/authenticated-local-http.mjs` passa a simular a sequência completa com usuários e projeto fictícios; tenta publicação antecipada, conteúdo adulterado e manutenção do snapshot após uma nova edição.
- `scripts/security/only-ecosystem-2027.test.mjs` fixa contratos estáticos para evitar remoção acidental da validação da API.
