# Validação final isolada e público proposto

Data: 19/11/2026. Base: a41b7c01828b6b71c2feb05af352cf0016a78b69.

## Segurança do workflow

`ui3-portals-final-validation.yml` usa apenas `contents: read`, checkout sem persistência de credenciais e runner hospedado Ubuntu. Não associa GitHub Environment, não referencia Secrets, não usa OIDC nem permissões de escrita. Não contém CLI Vercel, publicação npm, push Git, comandos Supabase vinculados ou acesso a banco hospedado.

O push dispara apenas esse workflow GitHub na branch `fix/client-portals-mirroring-20261118`, restrito aos arquivos de CI/propostas envolvidos. `vercel.json` permanece com `git.deploymentEnabled=false`. A main e a integração Git/Vercel não são alteradas.

O job `locked-build` executa npm ci, TypeScript, lint dos componentes afetados e build com URL Supabase de loopback e chaves fictícias. O job de navegador instala o mesmo lockfile e ferramentas de navegador em diretório temporário separado. Reutiliza o preparador de banco isolado já aprovado e acrescenta as dependências dos portais. Não repete os 66 testes antigos.

A autenticação do navegador usa contas sintéticas criadas no Supabase local descartável do runner. O script recusa URLs diferentes de 127.0.0.1, bloqueia requisições externas do navegador e salva apenas capturas/relatório sem senhas ou tokens. As ferramentas Playwright não alteram package.json ou lockfile da aplicação. A configuração Google fica desabilitada.

Os dois testes locais de segurança do workflow passaram antes do envio ao GitHub. Uma execução de CI pendente ou falha não constitui build ou homologação visual aprovada.

## Preservação de inscrições desabilitadas

A regularização e o provisionamento passam a usar `ON CONFLICT(user_id) DO NOTHING`. O lote seleciona apenas contas sem inscrição anterior. Um registro `enabled=false` permanece falso, inclusive em repetição do provisionamento após uma revogação posterior. O estado não é interpretado como cliente novo. Não foi criado novo campo, tabela ou mecanismo paralelo de permissão.

O preflight distingue `preserve_disabled`, `preserve_enabled`, `exclude_inactive` e `propose_new_enrollment_after_link_review`. Apenas clientes ativos, com vínculo consistente e sem inscrição anterior, são candidatos à inclusão após autorização. O padrão continua fechado no modo `pilot`.

## Público exato proposto, conforme leitura de produção

| Cliente/usuário | Estado atual | Alteração proposta, pendente de autorização |
|---|---|---|
| Ana Paula Santiago | Perfil associado, sem client_users, sem inscrição | Criar o vínculo ausente e uma inscrição nova habilitada |
| Flávia Benetele | Perfil associado, sem client_users, sem inscrição | Criar o vínculo ausente e uma inscrição nova habilitada |
| Jackson Bruno Psicologia | Perfil associado, sem client_users, sem inscrição | Criar o vínculo ausente e uma inscrição nova habilitada |
| Piffer Desenvolvimento Pessoal ME / Elania Piffer | Perfil associado, sem client_users, sem inscrição | Criar o vínculo ausente e uma inscrição nova habilitada |
| R. Rubim Consultoria Ltda. / Rosane Rubim | Vínculo consistente e inscrição habilitada | Nenhuma |
| Otávio Silva / estrategista | Inscrição habilitada no piloto | Nenhuma |

Não foram encontradas inscrições atualmente desabilitadas na leitura efetuada. A proteção foi adicionada para preservar qualquer desabilitação existente no momento da aplicação e as futuras. A lista deve ser reconferida pelo preflight na janela autorizada; não se aplica automaticamente este snapshot se houver mudanças.

Nenhum registro, vínculo, piloto, Secret ou flag de produção foi alterado. A expansão global da API permanece sem ativação. As 18 tarefas reais da Elania não são fixtures; o navegador gera tarefas novas somente no banco descartável, com IDs distintos dos registros reais.
