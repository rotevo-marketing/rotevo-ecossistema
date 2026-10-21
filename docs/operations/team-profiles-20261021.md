# Equipe: edição de nome e fotografia — 21/10/2026

Correção solicitada pelo usuário, com publicação no domínio oficial expressamente autorizada após os testes.

- Novo usuário aceita fotografia opcional; a conta continua inativa e exige a troca inicial de senha.
- Equipe inclui Editar usuário para o próprio administrador e demais colaboradores. Permite nome, substituição e remoção de foto; não aceita alterações de e-mail, papel ou permissões por esta rota.
- Perfil e diretório usam user_preferences como fonte comum. O cabeçalho recebe o evento de atualização e também atualiza ao voltar para a janela.
- Fotos ficam no bucket privado existente. O administrador recebe URLs assinadas no diretório; o usuário pode resolver somente sua própria fotografia atribuída. Nenhuma nova política pública, tabela ou migration.
- Gravações usam a versão do perfil para rejeitar edição concorrente (409). Campos adicionais e referências de fotos não autorizadas são recusados.

## Validação

- TypeScript e build Next.js: aprovados; 42 páginas/rotas geradas.
- Regressão de segurança: 251/251 aprovados. A primeira invocação sem opt-in local foi bloqueada por configuração de teste; a execução com ambiente local explícito passou integralmente.
- Novo roteiro HTTP local: 47/47, incluindo cadastro com/sem foto, leitura do arquivo privado, atualização própria/administrativa, remoção, isolamento, concorrência e recusa de elevação de privilégios. Contas e fotos criadas nessa rodada foram removidas no finally.
- Ciclo de acesso preexistente: 51/51, com identidades sintéticas removidas.
- Lint dos arquivos alterados: zero erros; três avisos de uso de img, incluindo componentes preexistentes. URLs assinadas continuam sendo carregadas diretamente, sem publicar o bucket.
- Navegador local: formulário de edição, salvamento do nome, envio e prévia da foto e atualização da lista conferidos com a conta fictícia local.
- Workflow isolado da equipe passa a executar o novo roteiro de perfis, junto do ciclo de acesso existente.

Testes mutáveis exclusivamente locais. Nenhum perfil, fotografia ou cliente real foi alterado para homologação. A checagem final do domínio oficial é de disponibilidade e proteção das rotas, sem criar administrador de teste no banco hospedado.

Evidências locais fora do Git: recovery/team-profile-security-20261021.log, team-profile-build-20261021.log e team-profile-lint-20261021.log (no diretório pai do repositório).
