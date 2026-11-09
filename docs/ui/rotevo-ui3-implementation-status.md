# Rotevo UI 3.0 — Registro de implementação (branch de desenvolvimento)

**Fonte de verdade:** especificações UI3 do estrategista e do cliente discutidas em 09/11/2026. Este documento registra código efetivamente alterado, não um aceite visual ou funcional da plataforma publicada.

## Ambiente e decisão de publicação
- Branch isolada: `feat/rotevo-ui2-pilot-20261109`.
- Produção permanece sem novo deployment nesta rodada por decisão explícita do responsável.
- Não modificar dados de clientes, schemas, RLS ou documentos apenas para redesenhar interfaces.
- Antes de implantação, executar build, TypeScript, contratos, testes autenticados, viewport, teclado e permissão. Solicitar aprovação.

## Implementado na branch (primeira rodada)
1. `src/app/rotevo-ui3.css`: camada UI3 opt-in, paleta da UI2 preservada, hierarquia compacta, espaço contínuo, bordas/ícones leves e sem alcançar o papel do editor estratégico.
2. `src/app/admin/page.tsx`, `src/app/cliente/page.tsx` e `src/app/layout.tsx`: habilitação UI3 e remoção dos cabeçalhos repetitivos das duas áreas.
3. `src/Components/admin/ClientsDirectory.tsx`: cadastro em modal e detalhes do cliente em drawer, sem alterar APIs.
4. `src/Components/admin/TeamDirectory.tsx`: convite e gestão contextual de equipe, mantendo capacidade e permissão do servidor.
5. `src/Components/admin/CentralTarefas.tsx`: criação detalhada em modal e criação rápida pelo título diretamente no workspace com seleção explícita do projeto.
6. `src/Components/admin/OperationalHubs.tsx`: reunião/compromisso em drawer, preservando a agenda e o salvamento já existentes.
7. `src/Components/cliente/ClientDrive.tsx`: pastas em lista compacta com visibilidade existente e link externo autorizado.
8. `src/Components/cliente/ClientCampaigns.tsx`: lista operacional e detalhes em drawer com foco/teclado.
9. `src/lib/security/projectForClient.ts`: informações estratégicas editoriais explicitamente compartilhadas pelo estrategista agora chegam ao cliente, com links HTTPS filtrados e anotações internas excluídas.
10. `scripts/security/client-project-projection.test.mjs`: regressão para o compartilhamento editorial sem vazamento de campos internos.
11. Rotas interceptadas em `src/app/admin/@modal/` e novo `src/app/admin/layout.tsx`: cadastro inicial de planejamento em modal a partir do painel, preservando fallback de URL direta e o fluxo posterior de seleção de documentos.
12. `scripts/security/ui2-visual-contract.test.mjs`: contrato atualizado para a identidade de cabeçalhos compactos.

## Pendente: não declarar UI3 concluída
- Reformulação completa de Visão geral do estrategista e do cliente, com deduplicação operacional de KPIs/atenções.
- Revisão extensa das listas de Projetos, Onboarding e do Kanban, inclusive controle de histórico de tarefas.
- Editor estratégico e fluxo completo dos documentos, cronograma, publicação e apresentação.
- Cadastro/projeto/configuração de acesso em modais/drawers com fluxos autorizados ponta a ponta.
- Conteúdo (admin e cliente) com alternância entre calendário/lista/aprovações e filtros por canal, sem duplicação.
- Campanhas do estrategista, modelo de iniciativa multicanal e vínculos com conteúdos/tarefas.
- Reuniões com atas estruturadas/versionadas, histórico, compartilhamento explícito e possíveis migrações de dados.
- Financeiro do estrategista e do cliente, contratos, permissões de equipe por operação.
- Acessibilidade/UX de modais: testes interativos completos, alerta de alterações não salvas, rolagem, telas móveis e foco.
- Homologação em navegador autenticado e um único deployment consolidado após autorização.

## Regras de implementação
- Não criar funcionalidade ou permissão falsa na UI; toda ação exige backend autorizado.
- Não trocar ausência de dado por zero; manter registros e status financeiros distintos.
- Filtros e listas do Portal do Cliente sempre em projeção autenticada/allowlist, nunca JSON bruto de projeto.
- Não modificar estilos internos de `.se-paper`, `.bn-editor` nem HTML personalizado.
- Não publicar nenhum documento ou alterar a visibilidade de registros durante validação visual.
- Usar ícones Tabler disponibilizados nos componentes tipados, em tamanho discreto, preferencialmente 16–18 px e stroke aproximado de 1,5–1,7.

## Última verificação
Após cada commit, consultar o run da branch em GitHub Actions. Execuções intermediárias com falha de contrato antigo/nomes de ícones foram corrigidas posteriormente. **Conferir resultado do HEAD** antes de afirmar que a versão está validada.
