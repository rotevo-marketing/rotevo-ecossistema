# Gestão de Usuários — ativação executada no Supabase

Data: 16/10/2026. Projeto: `kadvzjelkyfwouqmlxaa`. Branch: `feature/admin-v2-redesign`.

## Resultado

**Backup privado, restauração, ensaio das migrações e ativação do banco concluídos. A publicação antecipada da Gestão de Usuários sobre a interface anterior foi revertida em 16/10/2026 após esclarecimento do usuário. O desenvolvimento deve continuar na interface V2 da branch `feature/admin-v2-redesign`, sem nova publicação em produção.**

Correção: o domínio oficial voltou à implantação `dpl_6in2DbPJnSeD49oJsMd197TDvvXg`; as flags de cadastro, permissões, vínculos e estado dos membros foram desativadas no ambiente production. O commit de entrega continua salvo no Git; o rollback alterou a implantação servida, sem apagar código ou desfazer a segurança do banco. Os registros de publicação abaixo descrevem o evento anterior à reversão.

Administrador principal configurado e verificado: **Otávio Silva — contato@rotevo.com.br**, membro `admin` ativo. As 12 identidades e credenciais de usuários existentes foram preservadas.

## Recuperação verificada antes da mudança

- O usuário redefiniu a senha PostgreSQL no painel. A nova senha foi informada exclusivamente em janela local mascarada e salva fora do repositório com ACL privada. A falha inicial do Set-Acl no Windows PowerShell foi corrigida sem conceder privilégios adicionais.
- Conexão Session pooler confirmada no painel, porta 5432 e SSL.
- Backup custom PostgreSQL, definições de papéis sem suas senhas e **38 arquivos binários do Storage** guardados em `C:/Users/euota/rotevo-private-backups/rotevo-20261016T220744561Z`.
- Arquivo PostgreSQL de 404.872 bytes; SHA-256 registrado no manifesto privado. Arquivos Storage verificados por tamanho e SHA-256.
- Restauração completa no container `rotevo-restore-20261016`, banco `rotevo_recovered`, **sem rede e sem portas publicadas**. O backup original foi mantido intacto.
- As concessões de associação entre papéis exigiram normalizar o concedente para `restore_admin` na cópia isolada, mantendo os membros e opções; o arquivo original de papéis foi preservado. Nenhuma senha de papel foi exportada.
- **40 tabelas** de public/Auth/Storage/Vault tiveram contagens e impressões digitais de todas as linhas idênticas entre origem e restauração. Vault tinha zero segredos.

## Homologação

- Lote completo aplicado sobre a cópia restaurada em transação e revertido ao final: papéis staff, grants, equipe, auditoria, Storage e bootstrap.
- Validados estrategista de equipe, produtor, gestor e financeiro com perfil restrito `staff`, sem herdar RLS global de estrategista; cliente restrito ao próprio projeto; alterações de papel/empresa bloqueadas; escrita de capas bloqueada a cliente/staff e preservada ao proprietário; atribuições, permissões, inativação e auditoria.
- **38 verificações HTTP autenticadas** de cadastro, duplicação, senha temporária, troca obrigatória, permissões, revogação e token após inativação já passaram localmente e no [workflow #38970417692](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38970417692), com contas sintéticas e sem dados reais.
- O ensaio offline com dados restaurados é separado da homologação Auth/HTTP sintética. Não foram criados colaboradores artificiais no Auth hospedado.

## Aplicação em produção

Migração registrada: **`20261016221513_activate_team_users_secure_20261016`**. O lote inclui os arquivos de grants de perfil, tabelas de equipe, limite de papel staff, auditoria transacional, boundary de privilégios, restrições Storage e bootstrap do proprietário.

- Quatro tabelas de equipe com RLS; permissões administrativas transacionais acessíveis somente ao serviço autorizado.
- Navegador sem UPDATE de `profiles.role`/`client_id`, sem TRUNCATE das tabelas legadas e sem execução anônima de `is_strategist()`.
- Três políticas restritivas adicionais no Storage impedem mutações por cliente/staff, mantendo os uploads legados de estrategistas.
- Verificação: 12 Auth users, 12 perfis, 1 cliente, 1 projeto, 38 objetos Storage e 1 administrador de equipe ativo.
- As quatro tabelas públicas existentes e os dados do Storage permaneceram idênticos ao backup. Três tabelas Auth mostraram atividade normal durante a verificação: refresh_tokens passou de 89 para 90; sessions manteve 26; users manteve 12. Comparação adicional confirmou todos os campos de identidade e hashes de senha de Auth users preservados, excluindo apenas last_sign_in_at/updated_at. Não houve redefinição de senha de usuário da plataforma.

## Publicação e validação final

- Entrega incremental integrada à `main` pelo [PR #2](https://github.com/rotevo-marketing/rotevo-ecossistema/pull/2), commit `f3fc3a903c15713899dcd84f61bcf418b3452b42`. O restante do redesign permanece separado.
- Vercel: `dpl_Cjx1f83nvhg5nq2WjietVpH9FXQe`, estado READY, domínio `app.rotevo.com.br`, sem erro de alias. Build remoto e TypeScript aprovados.
- Build local de produção aprovado; as 38 verificações HTTP autenticadas passaram novamente nesta versão compilada. As identidades sintéticas locais foram removidas.
- Cadastro, permissões, vínculos e estado do membro habilitados exclusivamente no ambiente production. Transferência de administração desabilitada. Exigência global de associação à equipe desabilitada para manter o acesso do estrategista legado existente; APIs novas continuam exigindo administrador ativo.
- As sete APIs públicas de equipe recusaram requisições sem login com HTTP 401. Nenhuma identidade de teste foi criada no projeto hospedado.
- O proprietário entrou pessoalmente na plataforma. A página `/admin/equipe` confirmou Otávio Silva como administrador ativo, botão Novo usuário habilitado e formulário com nome, e-mail, quatro funções e senha temporária.
- Conferência final do banco: 12 usuários, 12 perfis, 1 cliente, 1 projeto e 38 objetos Storage. Hash do backup PostgreSQL reconferido contra o manifesto privado.
- Retorno da aplicação disponível pela implantação anterior `dpl_6in2DbPJnSeD49oJsMd197TDvvXg`, sem desfazer tabelas ou restaurar o banco sobre dados em uso.

## Pendências e limites

1. Próximo passo operacional: o administrador cadastrar o primeiro colaborador real, transmitir a senha temporária por canal seguro e conceder consulta e projetos após a troca de senha. Não foram inventados colaboradores nem enviados convites nesta execução.
2. Homologação de mutações e primeiro acesso realizada com contas sintéticas locais; em produção foram conferidos o diretório autenticado, o formulário e os bloqueios anônimos. Não afirmar que um colaborador real já concluiu o primeiro acesso.
3. O portal atual de staff oferece resumo e títulos de projetos atribuídos. Edição de documentos por esses papéis não foi liberada. Estrategistas legados existentes continuam com seus acessos amplos; não usar esse perfil para novos colaboradores limitados.
4. Advisors restantes: `is_strategist()` SECURITY DEFINER autenticada (necessária ao RLS legado), proteção contra senhas vazadas desativada e aviso informativo de auditoria sem política de navegador (bloqueio deliberado). [Função autenticada](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [auditoria sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
5. Histórico antigo de propostas contém versões de oito dígitos repetidas. O lote foi aplicado uma única vez como migração registrada acima. Não usar db push indiscriminadamente antes de reconciliar essas propostas com o histórico remoto.

Os backups e a conexão privada não foram enviados ao GitHub. Nenhum cliente, projeto, documento ou usuário existente foi excluído.
