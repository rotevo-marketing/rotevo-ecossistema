# Financeiro V2 — revisão consolidada de 19/10/2026

## Entrega para revisão

Prévia: https://rotevo-ecossistema-r2bwt361z-rotevo-marketing.vercel.app/estrategista/login
Deployment: dpl_8iW9b2uJAsMh3WUcv9SmGe5sHQps. Projeto Vercel existente rotevo-ecossistema, equipe rotevo-marketing. Publicação de revisão sem target de produção ou aliases, baseada em 156 arquivos locais. Sem commits, push ou merge. O SHA nos metadados é o commit-base; a implementação financeira continua em alterações locais adicionais.

## Fluxos disponíveis

- Receitas e despesas separadas, com pagamentos parciais/totais confirmados manualmente, cancelamento sem apagar histórico e estorno de confirmação.
- Correção de descrição, valor, vencimento, categoria, referência e observações em lançamentos sem pagamentos; versões antigas recusadas. Cliente, projeto e competência do lançamento não mudam nessa edição. Pagamentos exigem estorno antes de corrigir.
- Fornecedores: cadastro, contato, CPF/CNPJ opcional, observações internas, edição, busca, saldo a pagar vinculado, arquivamento e reativação. Arquivamento requer assinaturas ativas previamente pausadas ou encerradas.
- Assinaturas: cadastro com fornecedor, categoria, valor, vigência e dia de vencimento; emissão manual por competência sem duplicidade; reajuste para novas emissões; pausa, reativação e encerramento definitivo. Alterações não reescrevem contas emitidas nem cancelam obrigações anteriores automaticamente. Fornecedor arquivado impede reativação da assinatura.
- Despesas avulsas também podem ser repetidas por um período definido de até 60 meses. Essas contas são independentes e não viram uma assinatura gerenciada automaticamente.
- Contratos com clientes, vínculo opcional com projetos, emissão de mensalidades, edição de condições, pausa e encerramento, sem modificar cobranças anteriores.
- Visão geral com valores em aberto, resultado efetivo do mês, atrasos e compromissos dos próximos sete dias. A receber e A pagar têm busca, situação, cliente/projeto e filtros de vencimento que abrangem todas as competências.
- Contas financeiras com cadastro, edição de nome e arquivamento sem alterar saldo inicial ou histórico; contas arquivadas não aceitam pagamentos nem transferências. Transferências internas não geram receita ou despesa.
- Relatórios por categoria, CSV com referência/categoria e proteção contra fórmulas; previsão consolidada de caixa de seis meses a partir do saldo atual e contas já emitidas. Vencidos separados; não inclui contratos ou assinaturas ainda não emitidos. Projeção é consolidada, independente do filtro de cliente/projeto.
- Configuração de categorias e registro de atividades. Histórico de pagamentos e recebimentos com referência.
- Portal cliente somente mensalidades, confirmações e investimento mensal de campanhas, sem fornecedores, assinaturas internas, referências, contas, notas ou permissão de escrita. Campanhas continuam sendo a fonte do investimento, sem duplicação no caixa.

## Validação

- 219 testes locais de regras, autorização, segurança, contratos de interface e finanças: todos aprovados, nenhuma falha.
- 39 verificações HTTP com Auth local, JWT e PostgreSQL reais: todas aprovadas; fixtures sintéticas removidas.
- SQL transacional com rollback: geração idempotente, vencimento no último dia do mês, reajuste preservando o emitido, pausa/encerramento, arquivo de fornecedor, edição de fatura, versão obsoleta, restrições de acesso direto, escrita do cliente recusada e projeção segura.
- As duas migrations financeiras foram verificadas também em instalação do domínio a partir do zero dentro de transação local com rollback, preservando o domínio local anterior ao final.
- TypeScript e ESLint de todos os componentes e módulos financeiros aprovados.
- Navegador local: cadastro de fornecedor, assinatura, emissão de conta de R$ 149,90, edição para R$ 159,90 com referência, filtros e projeção de caixa conferidos.

## Persistência e limites

A interface publicada usa dados demonstrativos identificados e armazenamento no navegador. Os fluxos de persistência foram implementados e testados no Supabase local. O login da aplicação usa a configuração habitual; a API financeira remota permanece desativada por ROTEVO_FINANCE_ENABLED=false, e o módulo integrado de revisão é habilitado somente no preview da branch.

Migrations: 20261018122353_finance_v2_private_domain.sql e 20261019125535_finance_payables_lifecycle.sql. Nenhuma migration foi aplicada ao Supabase hospedado; nenhuma variável de produção, domínio oficial, proteção de acesso ou dado financeiro real foi alterado. Não houve criação de link de bypass de autenticação.

Homologação visual não equivale à ativação operacional: armazenar dados reais exige um ambiente financeiro persistente separado e sua homologação. Integração bancária, cobrança automática, notificações externas, escrituração fiscal, conciliação e uploads de comprovantes não fazem parte desta entrega. Não há envio automático de mensagens nem pagamentos automáticos.

## Publicação verificada

Deployment confirmado READY, target null e sem aliases de produção. Navegador remoto confirmou os botões Nova receita / Nova despesa, abas Fornecedores / Assinaturas, alertas de vencimento e a assinatura demonstrativa com Editar/reajustar, Pausar e Encerrar. Tela de acesso do estrategista conferida no novo domínio. Testes visuais funcionais de criação e edição foram feitos com dados sintéticos localmente, sem usar conta real como fixture.
