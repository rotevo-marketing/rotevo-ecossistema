# Prévia do ambiente de planejamento — 23/10/2026

Solicitação: simplificar a elaboração dos documentos estratégicos e preservar o contexto do painel do estrategista. Entregar simulação navegável e acompanhamento do deployment antes de alterar a plataforma Rotevo.

Base: d16fe2799891927ea65d360cc0cd32f2e8035623, versão servida ao iniciar a tarefa. Branch isolada: feature/strategic-workspace-preview.

## Escopo

Rota /previa/planejamento, disponível em Preview Vercel ou local com ROTEVO_EDITOR_PREVIEW=true. Em ambiente production retorna 404, mesmo se a flag local estiver ativada. Nenhuma rota administrativa existente foi substituída. Sem alterações de schema, migrações, APIs, permissões ou banco hospedado.

- Cabeçalho e navegação visual do estrategista, menu compacto expansível e modo foco.
- Projeto sintético Aurora Consultoria; navegação nas 12 fases e 57 documentos do catálogo.
- Configuração de escopo apenas em memória; não apaga os conteúdos ao retirar documentos.
- Busca e filtros por estado; documento e fase destacados.
- Editor BlockNote reaproveita schema existente: títulos, texto, listas, checklist, tabela, imagem, indicador, gráfico, decisão, recomendação e conclusão.
- Inserção agrupada em Escrita, Dados, Estratégia e Mídia; menu / e formatação contextual.
- Propriedades sob demanda; dados de gráfico editados por linhas, sem exigir sintaxe.
- Salvar, revisar, aprovar e publicar de forma explícita, com confirmação contextual.
- Leitura do cliente deriva exclusivamente da cópia publicada na própria simulação. Rascunhos posteriores preservam a cópia.
- Conteúdo de todos os documentos visitados permanece em memória ao trocar documento ou aba. Recarregar restaura os exemplos. Upload de imagem local limitado a PNG/JPG/WebP, 4 MB, sem upload de rede.
- Cronograma de elaboração e plano de execução separados. Datas e ações são demonstrativas. Ações do plano possuem checkbox funcional na sessão.

## Limites da prévia

Módulos globais fora de Projetos aparecem desabilitados por estarem fora do escopo; menu de perfil explica sua posição e não altera conta. Nenhum cliente real é usado como fixture. Não existe salvamento no servidor, notificação de cliente ou publicação na plataforma operacional. Integração posterior aos dados reais deve reutilizar os contratos existentes de autorização, concorrência, revisão e publicação.

## Validação

TypeScript, ESLint dos arquivos novos, testes de isolamento/publicação e build. Inspeção visual e testes no navegador são realizados no deployment Preview, pois o navegador remoto não alcança o localhost deste executor. O resultado final registra o estado efetivo do deployment.
