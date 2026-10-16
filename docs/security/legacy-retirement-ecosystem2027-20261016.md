# ROTEVO — Descontinuação do planejamento antigo e foco exclusivo no Ecossistema 2027

**Decisão do proprietário (16/10/2026):** o planejamento legado foi preservado em backup externo e não deve continuar sendo desenvolvido. A aplicação passa a ter o Ecossistema de Crescimento 2027 como arquitetura única.

## Executado na branch feature/admin-v2-redesign

- Substituída a página `/apresentacao/[slug]` por implementação orientada somente ao `ecosystem2027`.
- Removida a bifurcação `LegacyPresentationV2`; projetos que não incluem `ecosystem2027` não são apresentados por essa rota.
- `projectForPresentation` agora projeta somente metadados seguros e códigos de documentos escolhidos e apresentados; não entrega `moduleContent` legado a clientes.
- Excluídas as rotas demonstrativas antigas em `src/app/admin/planejamentos/demo/`.
- Adicionado contrato `scripts/security/only-ecosystem-2027.test.mjs` para bloquear o retorno das rotas e da apresentação legada.
- Ajustadas as verificações HTTP fictícias para projeto Ecossistema 2027 e rejeição de projeto sem `ecosystem2027`.

## Dependências ainda a substituir — não confundir com a arquitetura 2027

- `src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx` contém seleção e edição de `moduleContent`, `planningModules` e campos legados. Revisar os pontos de gravação e a implementação do novo editor antes de apagar os componentes antigos.
- Arquivos `src/Components/modulos/*`, `src/Components/apresentacao/*`, `src/data/modules*` e componentes de marca anteriores precisam de inventário de referências. Alguns podem ser compartilhados pela implementação atual; excluir apenas depois de comprovar ausência de consumidores.
- Avaliar eliminação ou simplificação de `selectedModules` antigo e da lógica bifurcada nas páginas administrativas. Remover somente depois de substituir por `ecosystem2027.selectedDocumentCodes`.
- Os testes de projeção exclusivamente legados devem ser reescritos ou eliminados quando não houver dependência de segurança legítima compartilhada.
- Realizar regressão de criação, leitura, edição e apresentação dos novos documentos; manter os controles de autenticação e isolamento já implementados.

## Limites

Não foram excluídos registros reais, buckets de armazenamento, contas do Supabase hospedado, migrações históricas necessárias ao esquema nem versões/backup fora da branch de desenvolvimento. O backup declarado pelo proprietário ainda não foi tecnicamente verificado por este processo. Qualquer limpeza física do banco em produção exige inventário e autorização explícita para os alvos.

**Política:** não investir em ajustes funcionais do planejamento legado; somente remover com segurança suas dependências. O desenvolvimento funcional seguinte deve priorizar os módulos novos do Ecossistema 2027.
