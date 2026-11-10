# Gestão de Usuários — publicação incremental

Base: `main` em `b38862dd18ebae12364db2823cbf704a2ffa67a3`.
Origem do módulo homologado: `feature/admin-v2-redesign` em `9077c0c5fc930e2ebae783314eb434f147799d4f`.

Esta entrega preserva o painel e o portal publicados e acrescenta `/admin/equipe`, cadastro de colaboradores, troca obrigatória da senha temporária e consulta dos projetos atribuídos. Não inclui as demais alterações do redesign.

## Pré-condições já executadas

Backup PostgreSQL privado, cópia dos 38 objetos Storage, restauração isolada e comparação integral de 40 tabelas foram concluídos antes da migração remota `20261016221513_activate_team_users_secure_20261016`. Otávio Silva (`contato@rotevo.com.br`) foi confirmado como único administrador ativo da equipe. Nenhuma credencial de usuário da plataforma foi redefinida. Evidências detalhadas estão em `docs/security/supabase-activation-executed-20261016.md` na branch de origem.

## Configuração da entrega

- Ativar em produção: `ROTEVO_TEAM_INVITES_ENABLED`, `ROTEVO_TEAM_PERMISSIONS_ENABLED`, `ROTEVO_TEAM_ASSIGNMENTS_ENABLED`, `ROTEVO_TEAM_MEMBER_STATUS_ENABLED`.
- Manter transferência de administração desabilitada.
- Manter a exigência global de associação à nova equipe desabilitada para preservar o acesso do estrategista legado existente. As APIs administrativas novas exigem administrador ativo; colaboradores novos recebem perfil `staff`, sem privilégios globais de estrategista.
- A interface concede somente `projects.read`, correspondente à consulta de títulos dos projetos atribuídos. Edição de documentos não faz parte desta entrega.
- A chave de serviço permanece exclusivamente no servidor. Nenhum backup ou arquivo de conexão privada integra esta branch.

## Validação e recuperação

A homologação HTTP usa somente Supabase e aplicação locais, com alvos exatos e identidades sintéticas removidas ao final. Cobre cadastro duplicado, primeiro acesso, senha antiga recusada, isolamento entre clientes/projetos, revogação de permissão, inativação com token já emitido e auditoria transacional.

Retorno da aplicação: implantação anterior `dpl_6in2DbPJnSeD49oJsMd197TDvvXg`. O esquema aditivo permanece compatível com a aplicação anterior; não reverter tabelas nem restaurar o banco sobre produção para desfazer somente a interface.

O estado final da implantação e os testes desta entrega serão registrados após sua conclusão.

Validação desta versão: build de produção e TypeScript aprovados; 38 verificações HTTP autenticadas aprovadas contra a aplicação compilada, com limpeza das identidades sintéticas.
