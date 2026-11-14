# ROTEVO — Inventário de campos | Essência do Projeto (lote 1/5)

Data: 15/10/2026. Fonte: inspeção direta dos componentes na branch feature/admin-v2-redesign. **Somente mapeamento de estrutura, não allowlist aprovada**.

| Módulo (slug) | Contrato tipado observado | Campos estruturais confirmados |
|---|---|---|
| Especialista (`dna-do-especialista`) | `SpecialistData` | `fields: Record<string,string>`; `photo: string`; `characteristics: {title,description}[]` |
| Empresa (`dna-da-empresa`) | `CompanyData` | `fields: Record<string,string>` |
| DNA de Conteúdo (`dna-de-conteudo`) | `ContentDnaData` | `fields: Record<string,string>`; `secondaryIdeas: string[]` |
| Tom de Voz (`tom-de-voz`) | `ToneVoiceData` | `characteristics: {title,description}[]`; `toneChoices: Record<string,string>`; `vocabulary: Record<string,string>`; `emotions: string[]`; `observations: string`; `references: {image,title,link}[]` |
| Identidade Visual (`identidade-visual`) | `VisualIdentityData` | `fields: Record<string,string>`; `colors: {name,color,code}[]`; `visualReferences: {image}[]`; `externalReferences: {image,title,link}[]` |

## Chaves explicitamente vistas no formulário

- Especialista: `quemEoQueFaz`, `especialidadesExpertise`, `trajetoriaProfissional`, `historiaPessoal`, `marcosConquistas` (amostra inicial, não lista completa).
- Empresa: `quemEAEmpresa`, `oQueFaz`, `historia`, `posicionamento`, `diferenciais`, `publico`, `problemasQueResolve`, `transformacao`, `propostaDeValor`, `missao` (amostra inicial).
- DNA de Conteúdo: `posicionamentoUnico`, `propostaUnicaValor`, `maiorTransformacao`, `bigIdea` observadas.
- Tom de Voz: inclui pares de escolhas, vocabulário, emoções, referências e observações.
- Identidade Visual: `direcaoVisual`, `fontesETipografia`, `elementosVisuais` entre as chaves vistas.

## Pontos de revisão para publicação segura

1. **Não copiar o objeto completo** do módulo como snapshot público por padrão.
2. `fields` dinâmico exige enumerar todas as chaves efetivamente usadas no componente e no renderizador antes de autorizar cada uma.
3. `photo`, `image` e `link`: validar URLs, acessibilidade, autorização e eventual presença de materiais privados.
4. `observations`, narrativas pessoais e referências: podem conter notas de trabalho; classificação de visibilidade deve ser explícita e revisada.
5. Testar integridade de `characteristics`, `secondaryIdeas`, `colors` e arrays de referências após serialização.
6. Comparar renderizadores de apresentação dos cinco módulos, além dos tipos dos formulários, antes de finalizar a lista positiva.

## Critérios para avançar

Mapear integralmente as keys de formulários e adaptadores de apresentação; definir para cada campo `candidato_publicavel`, `interno`, `revisao_obrigatoria`, ou `derivado`. A classificação ainda **não foi aprovada nem executada**. A próxima frente será concluir o levantamento detalhado desses cinco módulos, antes de autorizar a modelagem SQL.

Sem edição de interface, sem alteração de privilégios ou migrations e sem deployment. A identidade visual V2 e Tabler Icons permanecem preservados.

Referências oficiais: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/database/postgres/column-level-security
