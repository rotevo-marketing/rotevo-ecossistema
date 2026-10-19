# Financeiro V2 — implementação e revisão

Data: 18/10/2026. Base: feature/admin-v2-redesign, 36d4c17.

## Escopo entregue

- Financeiro interno com visão geral, receber, pagar, contratos editáveis, emissão mensal idempotente, vínculos com projetos, caixa, transferências, relatório por categoria, CSV e configurações.
- Confirmação manual parcial ou integral, proteção de concorrência, idempotência por operação, cancelamento condicionado e estorno auditado.
- Consulta do cliente com mensalidades, vencimentos, histórico e investimento mensal da fonte atual de Campanhas.
- Projeto e contrato precisam pertencer ao mesmo cliente. Dados financeiros não são armazenados no JSON de projetos.
- Equipe financeira usa finance.read; operações exigem também finance.write. Administrador precisa de vínculo ativo. Revogação é conferida no banco em cada chamada.

## Segurança e persistência

As tabelas ficam em rotevo_finance, sem privilégios diretos para anon/authenticated e com RLS habilitado. As funções privadas SECURITY DEFINER têm search_path fixo e verificam auth.uid(), perfil confiável, ativação e permissões. Wrappers públicos SECURITY INVOKER expõem somente as operações autorizadas. A API usa o JWT do usuário, sem service_role. O cliente tem função própria com resposta explicitamente restrita.

Não se copia o gasto geral de Campanhas para relatórios mensais. Usa-se snapshots[].spent, preservando ausência como não informado. Não se lança investimento de mídia automaticamente no caixa da agência.

## Prévia de revisão

Rota: /previa/financeiro. Disponível somente com ROTEVO_FINANCE_PREVIEW=true e fora do ambiente Vercel production. Contém dados sintéticos de duas empresas e alternância entre equipe e consulta de cada empresa. Alterações ficam no navegador e não chamam APIs financeiras ou Supabase.

O plano Supabase conectado não permite branches de banco. Por isso a persistência real foi validada exclusivamente no Supabase local; a prévia remota usa um adaptador demonstrativo, identificado na interface. Não é um ambiente remoto multiusuário de homologação.

## Ativação real futura

ROTEVO_FINANCE_ENABLED=true habilita a API somente no ambiente que já recebeu a migração financeira e foi homologado. Não ativar em produção nesta entrega. A migração 20261018122353_finance_v2_private_domain.sql foi aplicada apenas no banco local. Não reaplicar o histórico de migrações antigas.

A implantação de produção deverá avaliar as dependências existentes, backup/restauração, privilégio de colunas de profiles, configuração de Auth e concessões financeiras. O deploy de revisão não autoriza esse lançamento.

## Verificação

- TypeScript e ESLint dos arquivos novos.
- 211 verificações existentes e de domínio aprovadas em execução sequencial local.
- 19 verificações HTTP reais com identidades sintéticas, incluindo pagamento parcial, resposta ao portal, adulteração de client_id recusada e inativação com JWT existente. Fixtures removidas.
- Testes SQL transacionais com rollback: idempotência, competência única, fevereiro, vínculo entre clientes recusado, pagamento parcial, versões antigas/ausentes, sobrepagamento, data futura, cancelamento com saldo pago, estorno, edição contratual sem alteração retroativa, privilégios diretos e acesso anônimo.
- Navegador: visão interna e portal; confirmação de R$ 1.000 em cobrança de R$ 4.800 refletida como saldo de R$ 3.800; edição de mensalidade de R$ 3.500 para R$ 3.700 preservou outubro e emitiu novembro com o novo valor.

## Limites explícitos

- Recorrência por emissão manual mensal, sem cron ou cobrança automática.
- Contrato com vários projetos não tem rateio automático de receita; os filtros mostram vínculos, sem afirmar margem individual.
- O fechamento de competência, conciliação bancária externa e contabilidade fiscal não fazem parte dos fluxos implementados.
- Nenhuma alteração no Supabase hospedado, domínio oficial ou produção foi realizada.

## Publicação de revisão

Deployment Vercel: dpl_HpHpPa4WYX6ndv3RjBGMH8PsZF4m, target preview (null), READY. URL: https://rotevo-ecossistema-ivftdep2t-rotevo-marketing.vercel.app/previa/financeiro . Compilação remota concluída em aproximadamente 44 segundos.

Publicação feita a partir de 152 arquivos de código e recursos locais, sem commit, push ou arquivos de ambiente. Os metadados apontam ao commit-base 36d4c17; a implementação financeira é uma alteração local adicional, não um commit remoto.

A prévia recebeu endpoint e chave fictícios do Supabase e ROTEVO_FINANCE_ENABLED=false. Após a publicação, os overrides fictícios NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY foram renomeados para ROTEVO_FINANCE_REVIEW_DUMMY_URL e ROTEVO_FINANCE_REVIEW_DUMMY_KEY, restaurando a configuração habitual para futuras builds da branch sem mudar a configuração retida pelo deployment já criado. As flags financeiras foram configuradas somente em preview da branch de desenvolvimento. Nenhuma variável de produção foi alterada.

A proteção de login da Vercel foi mantida. A revisão automática recusou criar acesso temporário sem login por exigir autorização específica de expansão de acesso. Nenhum link de bypass foi criado nem se tentou outra forma de remover essa proteção. A inspeção visual foi realizada localmente; a versão remota teve build READY confirmado e redirecionou corretamente à autenticação da Vercel.

A aplicação compilada também passou nas mesmas 19 verificações HTTP autenticadas; as fixtures locais foram removidas. Imagem local da versão compilada: ../rotevo-financeiro-previa-20261018.png (na raiz do workspace).

## Correção da prévia integrada — 19/10/2026

O endereço 29t71usot era anterior ao Financeiro e foi indicado incorretamente. Nova publicação: https://rotevo-ecossistema-9khl7juph-rotevo-marketing.vercel.app/estrategista/login . Deployment dpl_mbzuQXDf4FKS4cr2w59yyhoqVAM2, READY, target null, sem aliases de produção, 153 arquivos locais, sem commit/push.

A prévia usa o login habitual e abre a aba Financeiro após validar o perfil de estrategista. NEXT_PUBLIC_ROTEVO_FINANCE_REVIEW=true somente no preview da branch carrega o módulo integrado demonstrativo. Registros financeiros de revisão ficam no navegador e são identificados como demonstração; ROTEVO_FINANCE_ENABLED=false mantém a API financeira real desativada. O seletor permite conferir as duas visões sintéticas de clientes. Nenhuma migration remota foi aplicada.

Verificações desta correção: TypeScript, ESLint dos componentes alterados, build local e build remoto concluídos; oito testes financeiros aprovados. Navegador remoto confirmou a tela normal de acesso do estrategista no novo endereço. A sessão autenticada do usuário no navegador externo não é compartilhada com esta prévia, portanto a navegação remota após o login ainda depende do login habitual do usuário.

## Contas a pagar — receitas e despesas separadas (19/10/2026)

Substituído o botão genérico por Nova receita e Nova despesa. Receitas exigem cliente; despesas internas exigem descrição, fornecedor/favorecido, categoria, valor, competência e vencimento. Cliente/projeto só aparece quando a equipe escolhe vincular a despesa a um projeto. Salvar direciona para A pagar ou A receber, na competência criada, sem filtros antigos ocultando o lançamento.

Nova despesa oferece repetição mensal por quantidade definida (2 a 60 meses, incluindo o primeiro). Cada competência recebe uma obrigação independente, em aberto, pelo mesmo valor; o vencimento usa o dia original e limita ao último dia do mês, preservando o dia nos meses seguintes. Não há renovação automática após o período e isto não é um cadastro de fornecedor nem conciliação automática. Confirmação manual individual é mantida.

A implementação de demonstração e a função SQL local usam a mesma regra. A migration financeira ainda não publicada foi atualizada; somente a definição da função mutate foi reaplicada no Supabase local, sem reaplicar tabelas ou histórico. Testes SQL com rollback verificaram retry idempotente da série, 31/janeiro → 29/fevereiro → 31/março, ausência de cliente/pagamento, rejeição de 61 meses e de repetição de receita, isolamento do portal e regressões anteriores. Dez testes de domínio passaram, incluindo saldo do caixa e ausência de mudança no pagamento dos demais meses. TypeScript e ESLint passaram. Navegador local confirmou formulário de despesa sem cliente, criação de três parcelas mensais de R$ 129,90 em aberto e formulário de receita com cliente.

Prévia atualizada: https://rotevo-ecossistema-mqz96d5ml-rotevo-marketing.vercel.app/estrategista/login . Deployment dpl_3CBP7WRdu9xBcDvNQKoKZ32byZZ1. Permanece demonstrativa, usando armazenamento no navegador; nenhuma alteração financeira remota, commit, push ou publicação em produção.
Publicação de despesas confirmada READY, target null, sem aliases; navegador remoto exibiu o login habitual do estrategista no endereço novo. Build remoto concluído com sucesso.
