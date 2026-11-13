# ROTEVO — Revisão do npm audit de produção — 16/10/2026

**Origem:** artefato `dependency-audit-production` do GitHub Actions `38839223808` (executado no commit `93ae90c3`), gerado com `npm audit --omit=dev --json`. Este relatório é um snapshot e deve ser repetido depois de atualizar dependências.

## Resultado

- Total de entradas de vulnerabilidade: **31**
- Severidade alta: **4**
- Moderada: **27**
- Crítica: **0**
- O workflow foi marcado como sucesso porque o job de auditoria é **informativo**: o próprio `npm audit` retornou código 1.

## Pacotes de alta severidade

| Pacote | Faixa reportada no artefato | Resumo do risco |
|---|---|---|
| `@tiptap/core` | até 3.30.4 | problemas de atributos manipulados e parsing de Markdown |
| `prosemirror-view` | abaixo de 1.42.3 | XSS associado ao tratamento de colagem |
| `source-map-js` | 1.0.0 a 1.2.1 | negação de serviço durante processamento de source maps |
| `undici` | 7.0.0 a 7.29.0 | vulnerabilidades associadas a proxy/TLS e cabeçalhos HTTP |

Outros 27 apontamentos moderados incluem o conjunto de extensões Tiptap, `@tiptap/react`, `dompurify` e `baseline-browser-mapping`. Diversos são dependências transitivas e/ou decorrem de uma mesma cadeia de dependências; não interpretar 31 como 31 explorações independentes.

## Plano de correção

1. Identificar versões e restrições do `package.json` e `package-lock.json` atuais e registrar a cadeia que introduz cada pacote.
2. Atualizar primeiro os pacotes do editor de texto relacionados ao ProseMirror/Tiptap em conjunto, usando versões compatíveis, sem forçar major upgrades cegamente.
3. Atualizar as dependências transitivas afetadas por `undici`, `dompurify`, `source-map-js` e `baseline-browser-mapping` dentro das faixas compatíveis.
4. Executar `npm ci`, `npx tsc --noEmit`, testes de autorização/isolamento, build Next.js, edição e salvamento dos módulos, renderização editorial e interações de conteúdo.
5. Rodar `npm audit --omit=dev` novamente; documentar qualquer risco remanescente e seu contexto real de exposição.

**Status:** análise realizada, atualizações de pacotes **não aplicadas**. Requer testes de regressão separados antes de aprovar dependências novas.

## Advisories de referência

- https://github.com/advisories/GHSA-c8x8-7fp4-3x9w
- https://github.com/advisories/GHSA-68fv-2mgg-jv7q
- https://github.com/advisories/GHSA-vmh5-mc38-953g
- https://github.com/advisories/GHSA-p88m-4jfj-68fv
- https://github.com/advisories/GHSA-cp6q-959q-f8rh
