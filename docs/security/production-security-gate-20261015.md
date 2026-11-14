# ROTEVO — Gate de segurança pré-implantação (revisão 2026-10-15)

**Status: NÃO APTO PARA IMPLANTAÇÃO.** Documento de revisão da branch `feature/admin-v2-redesign`, não constitui autorização para modificar Supabase hospedado nem publicar Vercel.

## Evidências verificadas
- GitHub Actions `38837293872`: security checks (development), sucesso.
- GitHub Actions `38836795898`: laboratório Supabase isolado, sucesso; protege `profiles.role` e `profiles.client_id`.
- Migração de grants `supabase/migrations/20261015_harden_profile_authorization.sql`: proposta e exercitada localmente; não aplicada no projeto hospedado.
- `docs/security/client-access-reconciliation-runbook-20261015.md`: procedimento documentado; não é automação de reconciliação.

## Bloqueios obrigatórios

| Código | Prioridade | Bloqueio | Critério verificável de resolução |
| --- | --- | --- | --- |
| G1 | Crítica | Permissões de `public.profiles` possivelmente permitem escalonamento no banco hospedado | Inventário autorizado *somente leitura* dos grants/RLS atuais; migração revisada e testada; aprovação explícita e janela de implantação |
| G2 | Alta | `public.planning_projects.data` exposto a cliente pelo SELECT da linha inteira | Modelo de visualização do cliente que não revele JSONB interno; teste de confidencialidade entre diferentes papéis |
| G3 | Alta | `public.is_strategist()` usa SECURITY DEFINER e requer revisão de permissões EXECUTE/search_path | Checagem de privilégios e função em ambiente isolado, com baseline de produção somente leitura |
| G4 | Alta | Fluxo Auth + `profiles` não é atômico; respostas ambíguas ainda exigem intervenção | Testes de falhas integradas e procedimento auditável de reconciliação demonstrado; nenhuma exclusão de contas pré-existentes |
| G5 | Alta | Compatibilidade de migrations e RLS de equipe/convites/editorial não comprovada no banco hospedado | Validar dependências, migrações e grants contra inventário atual, testar reversão e exigir autorização separada |
| G6 | Alta | Testes negativos não substituem teste positivo completo de criação de acesso | Ambiente descartável: estrategista autorizado cria usuário do cliente fictício, perfil fica íntegro, repetição não sobrescreve registro |
| G7 | Média | Auditoria npm de dependências em CI é informativa, mesmo quando workflow está verde | Avaliar achados atuais; plano de atualização sem alteração automática de dependências |
| G8 | Alta | Plano de rollback de produção ainda não ensaiado para migrações propostas | Ensaio de backup/restauração e rollback compatível com restrições do Supabase, sem perda de dados, com aprovação do operador |

## Decisão de escopo
- A implantação mais urgente seria a proteção dos grants em `profiles`, **mas somente após** inventário de produção e aprovação específica. Não fazer deployment como consequência automática de CI verde.
- `team_roles.sql` e `editorial_approvals.sql` são migrações futuras separadas e não devem entrar automaticamente numa implantação de segurança do perfil.
- A interface de Equipe, Reuniões e Financeiro só retorna ao cronograma após gate essencial, sem reintroduzir o planejamento legado.
- Manter a rota de convite restrita; não enviar convites reais durante testes.
- Em qualquer alteração de auth/permissões, preservar UI V2 e ícones Tabler.

## Pacote mínimo para uma futura decisão Go/No-Go
1. Inventário de grants, políticas, funções e dependências coletado com permissão de leitura.
2. Matriz de testes de usuários fictícios por papel (leitura, escrita, criação, revogação).
3. Scripts de migração revisados, ensaiados no banco descartável e ordenados.
4. Plano de rollback/reconciliação revisado com verificação pós-implantação.
5. Identificação de responsáveis e aprovação explícita do usuário para cada ação no ambiente hospedado.

**Nenhuma das validações de CI acima equivale à confirmação de que a produção está corrigida.**
