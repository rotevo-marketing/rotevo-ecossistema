# HTML personalizado nos documentos estratégicos

## Escopo

Acrescenta um bloco opcional ao editor e ao leitor compartilhado dos documentos de planejamento. Base de integração: `7d218d184df0e281719d135f56db7a2fb3a7331d`, versão que contém o ambiente aprovado. Implementação local em `feature/admin-v2-redesign`, atualizada por fast-forward até essa base. Sem migrações, alterações de permissões, contas, projetos ou conteúdos reais. Sem push ou deployment.

## Como usar

1. No documento, escolher **Adicionar elemento → HTML personalizado**, na seção Mídia. Também disponível no menu `/`.
2. Clicar em **Editar HTML** no elemento.
3. Informar título, HTML ou SVG, CSS separado, descrição textual e altura da visualização.
4. Usar **Atualizar prévia** para conferir; **Aplicar ao documento** atualiza apenas o rascunho local.
5. Salvar o rascunho e seguir a sequência existente de revisão, aprovação e publicação do documento.

Os modelos Fluxo, Mapa mental e Gráfico com escala são ilustrativos. Adaptar os textos, dados e descrições ao planejamento. O CSS pode conter media queries; em telas estreitas, o modelo de fluxo muda de disposição. A altura pode ser ajustada de 160 a 2400 px. Conteúdo maior permite rolagem dentro do elemento.

O leitor do cliente usa o mesmo schema e o mesmo renderizador do editor, sem controles de edição. Somente a versão publicada chega ao leitor. É possível combinar os novos elementos com títulos, textos, tabelas, imagens e blocos já existentes.

## Orientação para agentes que escrevem os documentos

O recurso amplia a apresentação, mas não concede acesso automático ao ChatGPT. Continua sendo necessário acesso autenticado à plataforma, pela interface ou pelas APIs já autorizadas. Não editar o banco diretamente para contornar a revisão.

- Trabalhar apenas no documento e projeto solicitados.
- Inserir fragmentos HTML, não uma página com `head`, `body` e `script`. Colocar os estilos no campo CSS. SVG deve ser estático e autossuficiente.
- Para gráficos, informar valores, unidade, escala e fonte; manter a escala coerente entre dimensões. O modelo de maturidade exemplifica barras com valor dividido por 5.
- Para mapas e fluxogramas, gerar HTML/CSS ou SVG. Sintaxe Mermaid, componentes React e visualizações próprias do chat não são convertidos automaticamente.
- Preencher a descrição com as informações essenciais, inclusive números e relações. A descrição aparece como legenda e integra a versão textual. O texto do HTML também entra na versão textual, sem código ou estilos.
- Conferir o resultado e adaptar ao celular antes de aplicar. Aplicar não equivale a salvar ou publicar.

Formato interno compatível com `richContent` (`blocknote-v1`):

```json
{
  "id": "visual-exemplo",
  "type": "visualHtml",
  "props": {
    "label": "Prioridades",
    "markup": "<h2>Prioridades</h2><p>Texto do planejamento.</p>",
    "stylesheet": "h2{color:#743ddb}",
    "description": "Descrição textual das prioridades apresentadas.",
    "height": 320
  },
  "children": []
}
```

## Contenção e limites

O HTML é filtrado com a dependência DOMPurify já existente e exibido em um iframe com `sandbox` vazio, origem isolada, sem execução de scripts, acesso à página ou permissões adicionais. CSP restritiva bloqueia scripts, rede, imagens remotas, fontes, imports, formulários, objetos e frames internos. CSS fica dentro do frame. A fonte original é tratada apenas como dados; o renderizador sempre sanitiza antes de montar `srcDoc`, inclusive na leitura publicada.

Tags como script, style, iframe, form e foreignObject são removidas do HTML. Estilos devem ir no campo CSS. Recursos externos e bibliotecas JavaScript não são suportados; usar o bloco Imagem existente para imagens do projeto. Não se habilitou `allow-scripts` nem `allow-same-origin`. SVG aceita formas, caminhos, texto e atributos visuais estáticos.

Limites por bloco: HTML 80.000 caracteres, CSS 20.000, descrição 4.000, título 140. Permanecem os limites globais de documento, a autorização por projeto e o controle de concorrência existentes.

## Verificação

- TypeScript e lint dos arquivos alterados; o arquivo de prévia já contém um aviso anterior de uso de `img`.
- Build de produção com configuração sintética local, sem consultar dados reais.
- 35 testes selecionados: 27 regressões existentes, 6 casos de sanitização/validação/publicação e 2 interações de componente em JSDOM.
- Testes de publicação cobrem preservação do conteúdo publicado, retorno do rascunho para revisão e rejeição de publicação alterada sem aprovação.
- Exemplos estáticos: `html-personalizado-exemplos.html`, gerados pelo mesmo construtor do frame usado no componente.

Pendente: conferência visual em navegador conectado ao ambiente de implementação e teste autenticado ponta a ponta antes de disponibilizar aos clientes. O navegador remoto não alcançou o servidor local; a plataforma publicada abriu na tela de login. JSDOM valida interações do componente, não substitui a conferência de layout nem a execução de CSP em navegador real.

Publicação exige pedido específico conforme `AGENTS.md`. Não usar documentos reais como testes de persistência.
