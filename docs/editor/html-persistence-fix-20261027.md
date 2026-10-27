# Correção do salvamento de HTML personalizado

Data: 27/10/2026. Estado: implementação local validada, ainda não implantada.
Branch: `fix/document-html-persistence-20261027`.

## Causa confirmada em produção

A Vercel registrou `ERR_REQUIRE_ESM` no deployment `dpl_HW4Fsj6WCseoPCeUuRxN3rxQhWYJ`, inclusive em `PATCH /api/admin/planning/document` às 18:47:22 UTC. O carregamento CommonJS de `html-encoding-sniffer` tentou executar o módulo ESM `@exodus/bytes/encoding-lite.js`. A dependência era trazida por `isomorphic-dompurify` → `jsdom@29.1.1`.

A exceção ocorria ao carregar o módulo, antes da validação e da gravação. Por isso a falha não dependia do tamanho do HTML. Também houve registros em `/api/assets/resolve` e na página do planejamento. O cliente não recebia o JSON esperado e substituía a resposta por uma mensagem genérica.

## Implementação

- Fixado `jsdom@26.1.0` no lockfile e override, com dependência direta de desenvolvimento para os testes. Removida a cadeia ESM incompatível sem retirar a sanitização por DOMPurify.
- Mantidos o formato `blocknote-v1`, o tipo `visualHtml` e as propriedades `label`, `markup`, `stylesheet`, `description` e `height`. Não há migração de dados.
- Mensagens específicas para limites de HTML/CSS/documento, caractere nulo U+0000, respostas não JSON, sessão, conflito de versão e falhas de armazenamento. Falhas internas recebem referência de diagnóstico sem registrar conteúdo dos documentos.
- A altura inicial armazenada continua válida. O elemento mede sua altura real e acompanha alterações e largura responsiva. Mensagens são aceitas somente do iframe correspondente e com valor finito dentro da proteção de tamanho.
- A medição usa um script fixo autorizado por hash CSP em iframe de origem opaca. HTML do usuário continua sanitizado; scripts do conteúdo, recursos externos, formulários e acesso à origem da plataforma continuam bloqueados.
- Preservados os snapshots publicados, os outros documentos, os metadados e o controle otimista por `updated_at`.

## Limites mantidos

| Limite | Valor |
| --- | ---: |
| HTML por elemento | 80.000 caracteres |
| CSS por elemento | 20.000 caracteres |
| Título | 140 caracteres |
| Descrição | 4.000 caracteres |
| Altura inicial configurável | 160 a 2.400 px |
| Documento serializado | 1.200.000 caracteres |
| Corpo recebido pela rota | 1.400.000 caracteres |
| Blocos por documento | 2.000 |

## Evidências e limites da validação

- 92 testes selecionados passaram: validação, sanitização, CSP, componente, workflow, contratos do editor, gravação pequena/extensa, reabertura e edição posterior.
- O teste da rota real usa um repositório sintético em arquivo local. Os dados são lidos novamente do disco para conferir persistência exata de HTML/CSS/Unicode e preservação de publicação e outros documentos. O banco Supabase real não foi exercitado por esse teste.
- Compatibilidade CommonJS confirmada com `--no-experimental-require-module`, reproduzindo a restrição que expunha o erro de produção.
- TypeScript, ESLint dos arquivos modificados e `git diff --check` passaram.
- Build local completo passou com respostas simuladas de Google Fonts e configuração pública sintética apontada a `127.0.0.1`. O primeiro build normal foi bloqueado pelo acesso a Google Fonts, não por erro do código. Nenhuma configuração sintética foi gravada no código.
- A aplicação compilada iniciou localmente com carregamento de ESM por require desabilitado. As rotas de documento e resolução de imagens responderam `401` JSON a solicitações anônimas, sem falha de inicialização e sem gravações.
- O teste da altura usa eventos simulados de iframe. A conferência visual no navegador e a persistência no banco do ambiente publicado ainda precisam ser realizadas depois da implantação.

## Publicação pendente

A revisão automática bloqueou a consulta remota ao GitHub em razão da instrução anterior do usuário de usar somente a interface da plataforma. Não foi usada uma rota alternativa para contornar o bloqueio. É necessária autorização explícita para usar GitHub/Vercel e implantar esta correção técnica.

Nenhum cliente, documento, projeto, status ou permissão foi alterado no banco hospedado. Nenhum documento foi publicado para clientes.
