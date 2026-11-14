# ROTEVO 2027 — Ativação controlada do Supabase atual

**Documento de execução condicionado a aprovação explícita. Nenhuma etapa abaixo foi aplicada ao banco hospedado.**

## O que já foi verificado

- O Supabase hospedado tem `profiles` e as tabelas legadas; as quatro tabelas novas de equipe e auditoria ainda não existem.
- O papel `authenticated` atualmente pode atualizar colunas sensíveis de `profiles`; prioridade de segurança.
- A correção proposta de grants e o SQL de equipe/auditoria passaram por testes em PostgreSQL descartável, incluindo execução de concessões, vínculos, inativação e sucessão administrativa.
- GitHub Actions verifica TypeScript, build, contratos de autorização, HTTP anônimo e isolamento de PostgreSQL; não simula toda a experiência de uma instalação real autenticada.
- Uma preview Vercel foi disponibilizada para **inspeção visual**, não para alterar dados reais.

## Sequência mínima para aplicação autorizada

1. **Congelar janela de mudança** e identificar um operador administrativo de recuperação. Confirmar backup restaurável, versão das migrações, janela de rollback e disponibilidade do login atual.
2. Executar apenas o arquivo de pré-verificação `supabase/checks/team-activation-readiness-readonly.sql` e validar grants e existência de tabelas. Interromper diante de diferenças inesperadas de esquema.
3. Revisar eventuais fluxos que editam `profiles` no navegador e compatibilidade com `20261015_harden_profile_authorization.sql`.
4. Com aprovação específica, aplicar a restrição de UPDATE em `profiles` **antes** de habilitar qualquer API administrativa. A proteção do papel é prioritária.
5. Aplicar em ordem `20261015_team_roles.sql` e `20261016_team_access_audit.sql` somente após revisão final de RLS, grants e comportamento em ambiente isolado.
6. Provisionar o primeiro administrador por procedimento manual verificado, nunca por autoatribuição do navegador. Confirmar perfil legado `strategist` válido e evitar ficar sem responsável.
7. Verificar cada rota e tabela com contas de teste segregadas; confirmar leitura negada a clientes não vinculados, escrita negada a não admins, logs transacionais e recuperação de sessão.
8. Só então configurar `ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED=true` no ambiente autorizado e testar **antes** de habilitar mudanças de equipe. Liberar uma flag por vez: permissões, vínculos, estado, convites e transferência. Não habilitar flags no preview que aponta ao banco hospedado.
9. Monitorar logs e acessos após cada liberação. Encerrar a mudança somente quando houver evidência de login, listagem, edição, autorização cruzada negada e trilha de auditoria.

## Retorno em caso de problema

- Desligar flags de edição imediatamente caso alguma API opere indevidamente.
- Não restaurar grants irrestritos de `profiles.role` / `client_id` como rollback informal: isso reabre o risco crítico. Corrigir o consumidor incompatível ou usar procedimento administrativo restrito.
- Migrações de tabela com dados não devem ser revertidas por DROP improvisado. Usar snapshot/backup e procedimento documentado de recuperação após avaliar perda de dados.
- Registrar hora, commit, migração aplicada, execução responsável, logs e evidências dos testes.

## Casos de homologação prática direcionada

| Ator ou situação | Verificação essencial |
| --- | --- |
| Administrador ativo | Carrega equipe, atribuições e permissões; realiza mudanças auditadas |
| Colaborador com `projects.read` | Vê exclusivamente projetos vinculados |
| Colaborador com `projects.write` | Edita projeto vinculado, mas não pode publicar/excluir |
| Colaborador inativo | API administrativa não libera leitura ou escrita após enforcement |
| Cliente | Acessa somente os próprios projetos e apresentações permitidas |
| Sem JWT/expirado | Nenhuma rota administrativa libera dados ou mudança |
| Mudanças de equipe | Concessões, revogações e transferências têm evento de auditoria |
| Transferência admin | Não há perda de todos os administradores ativos |
| Página em navegador | Interface trata 401/403/409/503 sem mostrar sucesso falso |

## Limite de conclusão

**Preparação concluída não equivale a migração aplicada.** São atividades separadas: homologação de SQL em PostgreSQL descartável, testes autenticados direcionados, decisão de implantação e implantação efetiva. O último passo exige autorização explícita para operar no Supabase hospedado.
