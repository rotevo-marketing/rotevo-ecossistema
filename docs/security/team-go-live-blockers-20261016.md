> Registro histórico de preparação. Para o estado posterior à ativação do banco, ao rollback da publicação e à homologação local V2, consulte [a validação atual](team-v2-local-validation-20261016.md). As pendências abaixo descrevem a situação da rodada original.

# Fechamento de usuários — estado verificável e bloqueios de implantação

Data: 16/10/2026. Alterações de código na branch de desenvolvimento, sem intervenção no Supabase hospedado.

## Diagnóstico conclusivo do Supabase hospedado (consultas somente leitura)

- As migrações registradas são zero; tabelas `team_members`, `team_project_assignments`, `team_member_permissions` e `team_audit_events` não existem.
- `profiles.role` aceita apenas `strategist` ou `client`.
- Há dois perfis legados com papel estrategista, mas isso não comprova qual sessão está sendo usada pelo proprietário.
- UPDATE sobre `profiles.role` e `profiles.client_id` continua concedido ao papel `authenticated`.
- Políticas legadas `Strategists can manage ...` e função `is_strategist()` permitem acesso amplo baseado unicamente no papel `strategist`, sem verificar `team_members.active`, vínculos de projeto ou permissões.
- Conceder `strategist` a colaboradores limitados antes de refazer o RLS dá acesso amplo **diretamente via Supabase**, independentemente de menus ocultos e APIs administrativas.
- Não foi possível verificar por ferramentas disponíveis um backup restaurável do banco hospedado.

## Entregue na branch

- Cadastro administrativo de usuário com senha inicial de ao menos 12 caracteres, novo usuário Auth criado com flag de troca inicial e membro inativo; compensação do Auth quando falha o vínculo.
- Primeiro acesso e troca da senha via API autenticada, com o alvo derivado exclusivamente do JWT verificado.
- Ação `Novo usuário` em Equipe, desabilitada enquanto capacidade de cadastro não está autorizada pelo backend.
- CI com contratos de autorização, build, TypeScript e PostgreSQL sintético.

## Bloqueio de ativação sem risco indevido

**Não habilitar `ROTEVO_TEAM_INVITES_ENABLED`**, provisionar colaboradores ou conferir papel `strategist` para eles antes de:
1. Confirmar backup restaurável e plano de recuperação com operador.
2. Integrar `profiles` com papel de equipe **sem** conceder acesso global de estrategista, ou implementar RLS que exige membro ativo e atribuição específica para todos os acessos diretos.
3. Revisar as políticas legadas de `profiles`, `clients`, `client_users` e `planning_projects` para negar privilégios a contas limitadas, inclusive transições e inativações.
4. Exercitar login de administrador principal, colaborador limitado e cliente em ambiente com identidades artificiais; conferir bloqueios de consultas diretas ao Supabase.
5. Executar a migração de grants `profiles`, migrações de equipe/auditoria, provisionar o administrador inicial depois da confirmação inequívoca da conta e somente então ativar flags administrativas.
6. Executar teste ponta a ponta de criação, troca de senha, liberação de projetos, inativação e acesso de cliente.

**O código de cadastro não é homologação operacional.** A declaração de conclusão depende do ciclo de cadastro e controle de acesso comprovado.
