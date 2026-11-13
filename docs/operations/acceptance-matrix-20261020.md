# Matriz de aceitação — roteiro de 26 etapas

O roteiro mutável foi executado com identidades sintéticas no Supabase local e repetido em banco descartável do GitHub. O Preview hospedado recebeu somente o administrador temporário autorizado e consultas, sem alterar os clientes/projetos existentes. Não confundir esses escopos.

| Etapa | Evidência executável/verificada |
|---|---|
| 1. Entrar como administrador | operations-local-http.mjs; team-lifecycle-local-http.mjs; login do administrador temporário no Preview |
| 2. Criar cliente fictício | operations-local-http.mjs: create client A/B (201) |
| 3. Criar usuário | create-client-access (200), login dos dois clientes; ciclo de primeiro acesso na suíte team |
| 4. Criar projeto | project/create (201) para A e B |
| 5. Vincular ao cliente | client_id dos projetos e consultas cruzadas negadas |
| 6. Definir serviços | client-workspace, projeção e revogação de módulos |
| 7. Criar planejamento | ecosystem2027 com escopo metodológico no projeto criado |
| 8. Editar/salvar | planning/document save, richContent e persistência por atualização condicional |
| 9. Publicar documento | review → approve → publish; publicação do projeto; rascunho posterior preserva snapshot |
| 10. Leitura do cliente | presentation autenticada por cliente A; tabela/imagem e síntese executiva conferidas localmente no navegador |
| 11. Cadastrar entrega | project/update executionTimeline |
| 12. Atualizar situação | planned → in_progress via API |
| 13. Acompanhamento | client/projects retorna in_progress |
| 14. Criar conteúdo | editorialCalendar com versão 01 |
| 15. Solicitar aprovação | awaiting_client, visibleToClient |
| 16. Decidir como cliente | RPC rotevo_editorial_decide; aprovação e changes_requested em versões distintas |
| 17. Retorno à Rotevo | histórico persistido; decisão invalida edição concorrente; overview classifica ajustes |
| 18. Campanha | marketingCampaigns híbrida com canais e ações |
| 19. Resultados | cliente consulta investimento 120 e 3 contatos; nota interna excluída |
| 20. Reunião/link | operationalAgenda; link HTTPS e modal/calendário conferidos |
| 21. Contrato | workspace com contrato e histórico; não compartilhado excluído |
| 22. Drive | pasta autorizada incluída, privada excluída e isolamento A/B |
| 23. Financeiro | operations-finance-local.mjs e operations-final-local.mjs; contratos/recorrência/baixas parciais/parcelas |
| 24. Pagamentos/documentos | duas baixas manuais; fatura/comprovante privados; quatro downloads locais autorizados |
| 25. Visão Geral | overview-management.test.mjs; dados reais autorizados nos painéis local e Preview |
| 26. Novo login/persistência | logins independentes dos clientes; recarregamento no navegador; novo login administrativo no Preview final |

Complementos: tests scripts/finance/domain.test.mjs e lifecycle.test.mjs (16/16); a suíte scripts/finance/http-isolated.mjs cobre o ciclo de fornecedores, assinaturas, contas a pagar e permissões no stack local.

Resultados e logs estão no relatório de execução. Os 251 testes de scripts/security não substituem as suítes financeiras/HTTP independentes. O Preview final não foi submetido à repetição mutável das 26 etapas, por preservar os registros existentes e as restrições de homologação local.
