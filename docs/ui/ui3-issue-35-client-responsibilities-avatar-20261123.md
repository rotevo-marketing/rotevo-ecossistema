# Rotevo UI 3.0 | Issue #35 — Central de responsabilidades do cliente e fotos dos responsáveis

Data: 2026-11-23
Base publicada preservada: `4c3d818a45a812f8048048ce994ef9249a91764c`
Branch isolada: `fix/ui3-client-assignment-only-tasks-20261123`
Status: candidato para homologação isolada; **não publicar sem autorização específica**.

## Objetivo aprovado
- Cliente deve ver na Central de Tarefas e nos filtros Hoje/Atrasadas **apenas atribuições formais**, e não a execução operacional da Rotevo. O título, o prazo, o status e as instruções exibidos provêm da atribuição, não da tarefa interna vinculada.
- Preservar as decisões de aprovação, a agenda, o envio/validação por Drive, os dados, as políticas de isolamento e a UI das Issues #33/#34.
- No painel do estrategista, foto do cliente atribuída ao campo **Responsável** nas linhas de atribuição formal (Lista e Kanban); no Portal do Cliente, foto da conta autenticada no campo Responsável. Iniciais como fallback se indisponível.

## Implementação
- `src/Components/cliente/ProjectTimeline.tsx`: linhas da Central criadas exclusivamente de atribuições formalmente retornadas pela fonte autenticada; dados próprios de instrução, vencimento e status; avatar do perfil do cliente fornecido pelo contexto do portal. Descrições/checklists de tarefas internas não são inseridos nas linhas da Central.
- `src/Components/cliente/ClientOverview.tsx` e `src/app/cliente/page.tsx`: mesmas fontes no resumo e no módulo completo, foto da própria conta; sem alteração no calendário/aprovações.
- `src/Components/admin/CentralTarefas.tsx`: usar foto do cliente já carregada em `clientPhotos` ao renderizar atribuições em Lista/Kanban, somente quando o identificador do usuário responsável corresponder ao usuário da atribuição.
- Regressões atualizadas no contrato de visão geral, validação por navegador sintético e workflow GitHub Actions de leitura, sem permissão de publicação.

## Controles e limitações
1. Nenhum SQL, migration, Secret, dado real, configuração Production, `main` ou deployment foi alterado.
2. `vercel.json`: `git.deploymentEnabled=false`.
3. Homologação sintética **não comprova** que cada cliente real possui fotografia cadastrada, nem que a imagem armazenada está válida e acessível. Se o usuário não tiver foto resolvível, permanecem as iniciais. Para cliente com múltiplos usuários, a foto institucional do cliente não deve ser confundida com perfil individual, ponto a verificar durante homologação real.
4. A antiga projeção de acompanhamento continua preservada em código/dados, mas deixou de alimentar a Central de Responsabilidades; criar área separada dependeria de autorização posterior.
5. Implantação única Production, avançar main e homologação com dados reais dependem de aprovação posterior.

## Evidências
- Homologação das atribuições sem a foto: [GitHub Actions 45268236159](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/45268236159), dois jobs aprovados.
- Validação integrada da mudança de avatar: [GitHub Actions 45269795830](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/45269795830), ambos os jobs aprovados no SHA de implementação `29023987379fcb8bf65e8a8847d4053daecd1535`.
- SHA posterior `baf59a666444d609feec3e579a5bc5a3bd8e43c1` adicionou teste de contrato específico de foto. Não confundir aprovação do SHA anterior com a do SHA final; conferir a execução deste último candidato antes de aprovar publicação.

## Critérios de aceite para publicação
- Workflow executado com sucesso para SHA candidato final, TypeScript/lint/build e testes de navegação autenticada, com relatório.
- Evidência de que `main` mantém o SHA-base e zero deployments do candidato.
- Aprovação humana explícita antes de qualquer atualização de `main` ou publicação.
