# Missão operacional Rotevo V2 — acompanhamento

Base: 5f9cd3b791ea55a9cd04ddf1c46d93c57a5081c0, feature/admin-v2-redesign, 20/10/2026.
Backup do código: ../recovery/operation-before-5f9cd3b-20261020.zip.

## Inventário inicial confirmado
- Auth/login/recuperação, projetos, execução, calendário editorial e campanhas possuem código persistente; precisam de homologação integrada.
- ClientsDirectory cria, mas não edita/arquiva nem conecta acesso na lista.
- Portal: Visão Geral, Conteúdo, Campanhas, Reuniões, Contrato, Drive e Financeiro exibem novos layouts demonstrativos.
- Planejamento: leitor real usa publishedContent; BlockNote ainda é protótipo isolado.
- Financeiro: duas migrations testadas localmente, domínio privado e API recusando todos os ambientes Vercel; UI de revisão com localStorage.
- Banco hospedado: nove tabelas public observadas com RLS, apenas migration 20261016221513 registrada. Nenhuma alteração estrutural nesta missão até o momento do inventário.
- Aprovações: tabela/migration proposta no código, ausente do inventário hospedado; aprovação não pode ser anunciada como operacional.
- Contratos legais, Drive por cliente, módulos contratados e anexos privados exigem persistência e autorização adicionais.
- Histórico acessível parcialmente; a conversa Work “Auditar arquitetura do Financeiro” corresponde a esta tarefa. Respostas antigas recuperadas como marcadores não oferecem seu texto integral.
- Referências consultadas: comando integral, AGENTS.md, três PDFs oficiais em ../sources, código atual e documentação local Next/Supabase/Vercel.

## Ordem de execução
1. Contratos de dados, autorização e migrations aditivas testadas no stack local.
2. BlockNote persistente e snapshots publicados, preservando editor anterior.
3. Gestão de clientes/serviços/contratos/Drive e perfil.
4. Conteúdo/aprovação, campanhas amplas, reuniões e execução integradas.
5. Financeiro real com confirmação manual e documentos autorizados.
6. Dashboard adaptativo sem dados de simulação; testes completos com dois clientes locais.
7. Backup/verificação antes de qualquer alteração estrutural hospedada; publicar e testar somente Preview. Produção depende de aprovação final.

Não declarar PRONTA PARA OPERAÇÃO antes de verificar todos os fluxos obrigatórios.

## Retomada após interrupção de energia
- Código e backup local preservados. TypeScript validado novamente após os incrementos abaixo.
- ClientsDirectory usa API administrativa com gravação condicional por updated_at, edição e gestor de serviços/contratos/Drive/acessos.
- Criação de projetos permite selecionar cliente existente por ID/slug, sem sobrescrever seu cadastro.
- Portal: Contratos, Drive, Conteúdo, Campanhas e Reuniões agora usam registros autorizados; os componentes demonstrativos originais foram preservados nas prévias.
- Aprovação editorial utiliza RPC atômica por versão. Leitor de planejamento e arquivos privados respeitam revogação de módulos.
- Campanhas recebem tipo online/offline/híbrido, canais, ações, resultados e próximos passos, com compartilhamento explícito. Reuniões recebem modalidade, local, duração, ata/material e compartilhamento explícito.
- 50 verificações HTTP reais passaram no Supabase local, com dois clientes sintéticos e limpeza apenas dos registros gerados. Incluem publicação rica, isolamento, aprovação/versionamento, execução, campanha híbrida, reunião, contratos, Drive e revogação.
- 8 testes de validação operacional passaram. A homologação integral, perfil, Financeiro integrado ao layout final, Visão Geral adaptativa, inspeção visual e publicação Preview ainda estão em andamento.
- Nenhuma migration hospedada, commit, push ou deployment foi efetuado nesta retomada até este registro. Produção permanece sem alteração.

## Fechamento técnico após a retomada

Este registro substitui as observações temporárias de progresso acima: sete migrations foram ativadas pelo conector Supabase após backup restaurado e validado; o Financeiro e os módulos do Portal utilizam persistência real e autorização no servidor. O domínio oficial não foi promovido.

A compilação final foi aprovada, incluindo TypeScript. Regressão final: 250/250; integração HTTP na compilação: 64/64. Suites financeiras adicionais anteriores: 24 verificações, mais 19 de parcelas/perfil/revogação e 10 de histórico editorial. Lint: zero erros e 22 avisos. Auditoria de dependências de produção: zero vulnerabilidades no momento verificado.

As tentativas de regressão sem os destinos locais explícitos foram bloqueadas pela proteção dos testes; outra tentativa no servidor dev teve dois timeouts de compilação. A execução final usou servidor compilado local e passou integralmente. Não foram criados testes mutáveis no Supabase hospedado.

A inspeção visual local validou edição/publicação rica, documento executivo, ocultação/liberação, apresentação, portal financeiro, contratos, perfil e navegação móvel. As evidências de imagens e logs ficam em `../recovery/`, fora do repositório. Consulte o relatório final e o manual para limites de homologação e publicação.

## Conclusão da conferência autenticada

A autorização específica do usuário permitiu criar o administrador temporário; login e 13 consultas autenticadas passaram. A inspeção visual encontrou next.config.ts ainda priorizando o modo review. Corrigido em ac69c12: configuração de build e API agora compartilham o mesmo gate. Regressão 251/251, domínio financeiro 16/16 e HTTP financeiro local 39/39; build/TypeScript e checks GitHub aprovados. Preview final dpl_H3eamaESYSvi1ckaiQLQrkg67bfn, fonte ac69c12d571412ab33ecc4db392dfe5c059e69fd. Tela conectada conferida no navegador. Administrador, perfil, vínculo e sessões temporárias removidos; 13 usuários, 1 cliente e 2 projetos originais preservados com fingerprints iguais. Domínio oficial sem promoção. Relatório e matriz de aceitação registram o escopo e as ressalvas.
