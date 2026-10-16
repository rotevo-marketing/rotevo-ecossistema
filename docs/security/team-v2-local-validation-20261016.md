# Gestão de Usuários — homologação local da interface V2

Data: 16/10/2026. Branch: `feature/admin-v2-redesign`.

## Escopo deste lote

Concluir a integração do cadastro e da consulta restrita na aba Equipe do novo Painel do Estrategista. Sem publicação, push, alteração de configurações remotas ou escrita no Supabase hospedado. Este relatório sucede os documentos anteriores de preparação para o escopo aqui testado, sem transformar funcionalidades futuras em funcionalidades concluídas.

## Comportamento entregue

- Cadastro somente por administrador ativo; colaborador começa inativo, com perfil restrito `staff` e troca inicial de senha obrigatória.
- A função Estrategista, Gestor, Produção ou Financeiro organiza a equipe; ela não concede os privilégios globais do estrategista legado.
- Nesta etapa, somente `projects.read` pode ser concedida. A interface apresenta "Consultar nomes dos projetos atribuídos". Edição, tarefas, conteúdo, reuniões e financeiro ficam indisponíveis também para novas concessões pela API.
- Concessões anteriores de operações indisponíveis continuam revogáveis e a revogação é auditada.
- Vínculos mostram nomes dos projetos; permissões mostram rótulos compreensíveis, em vez de identificadores técnicos.
- A área restrita permite sair e voltar ao login. Ela não oferece documentos nem operações de edição.
- A inativação mantém a identidade existente e impede novas consultas autorizadas, inclusive com token já emitido. Não equivale a apagar a conta ou impedir toda tentativa de autenticação no Supabase.

## Matriz da entrega

| Perfil | Acesso nesta etapa |
| --- | --- |
| Administrador ativo | Diretório, cadastro e controle de acesso da equipe |
| Colaborador novo com qualquer função | Somente nomes dos projetos atribuídos, após troca de senha, ativação e concessão de consulta |
| Colaborador inativo | Sem acesso à consulta restrita |
| Cliente | Portal e projeção dos projetos da própria empresa; sem gestão da equipe |
| Estrategista legado | Acesso existente preservado; migração desse papel é um trabalho separado |

## Evidências dos testes

- 133 verificações locais de contrato e comportamento aprovadas.
- 49 verificações HTTP autenticadas aprovadas, incluindo oito concessões indisponíveis recusadas, ausência de gravações indevidas, revogação de concessão anterior, isolamento entre projetos/clientes, senha antiga recusada, inativação com token existente e auditoria.
- Navegador local: login do administrador no painel V2, abertura da aba Equipe, cadastro pelo formulário e confirmação da conta inativa sem concessões.
- Login do colaborador com senha temporária redirecionou para `/primeiro-acesso`; o formulário foi conferido visualmente. A substituição efetiva da senha foi exercitada pela API autenticada usada por esse formulário, e a senha temporária foi recusada depois.
- Conferência manual final na aplicação compilada: o usuário digitou e enviou uma senha fictícia pelo formulário de primeiro acesso. O navegador bloqueou inicialmente uma senha com menos de 12 caracteres. Após o envio válido, houve saída da sessão e redirecionamento para `/estrategista/login?senha_atualizada=1`. A consulta administrativa confirmou a remoção da exigência de troca inicial e uma nova tentativa com a senha temporária foi recusada. A senha nova não foi lida nem solicitada pelo chat. A fixture adicional usada nessa conferência também foi removida.
- Navegador local: novo login do colaborador, ativação pelo administrador, concessão da consulta, vínculo de um projeto e exibição somente do respectivo nome na área da equipe.
- Navegador local: revogação removeu o projeto da consulta após nova requisição; remoção do vínculo e inativação foram confirmadas no diretório e no banco local; a sessão do colaborador passou a receber bloqueio de acesso.
- Navegador local: login do cliente exibiu a empresa correta e somente seu projeto. A API confirmou que esse cliente não pode consultar o diretório da equipe.
- As identidades, os projetos, as empresas e os eventos sintéticos desta homologação foram removidos; as sessões fictícias do navegador foram encerradas.

## Limites e continuidade

Esta homologação cobre o fluxo limitado descrito acima. Os módulos operacionais de colaboradores, a migração dos estrategistas legados, transferência de administração e outras funções não foram liberados. Nenhum teste mutável usou cliente ou usuário real.

O site continua na implantação anterior após o rollback já realizado. As opções novas de cadastro em produção continuam desabilitadas. Uma eventual publicação deve integrar a interface V2 inteira em lote e depende de autorização específica do usuário.

## Verificação da aplicação compilada

Build de produção e TypeScript aprovados. A aplicação compilada foi iniciada somente em `127.0.0.1:3000`: as 49 verificações HTTP autenticadas passaram novamente, assim como os 10 testes de recusa de acesso anônimo. A limpeza dos dados sintéticos também passou. Nenhuma implantação foi solicitada.

O lote está pronto para revisão local da V2 dentro desse escopo limitado, incluindo a submissão manual da nova senha pelo navegador. Não restam ações humanas pendentes para os testes descritos neste relatório. A futura publicação agrupada permanece separada e não está autorizada nesta rodada.
