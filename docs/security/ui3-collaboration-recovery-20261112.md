# Rotevo UI 3.0 — Comunicação bilateral | Recuperação 12/11/2026

## Origem recuperada
- Implementação existente em `src/Components/shared/ProjectConversation.tsx`, `src/app/api/collaboration/messages/route.ts` e `src/lib/collaboration/guards.ts`.
- Esquema original **proposta não aplicada**: `docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql`.
- Testes recuperados: `scripts/security/db-collaboration-isolated.sql`, `ui3-collaboration-integrated-local.mjs`, `ui3-collaboration-browser-local.mjs`, `ui3-collaboration-guards.test.mjs` e `ui3-collaboration-http-negative.test.mjs`.
- Evidência histórica: workflow GitHub Actions 42917476376 (10/11) com seis jobs aprovados; execução integrada de 11/11 registrada no histórico do projeto. Os testes históricos usam infraestrutura descartável e não equivalem à ativação da base hospedada.

## Inventário em 12/11/2026
- Supabase produção `kadvzjelkyfwouqmlxaa`: tabela `public.rotevo_collaboration_messages` AUSENTE.
- Supabase G2 hospedado `tqedxahsqbskninjenfg`: mesma tabela AUSENTE.
- Ambas as bases possuem `planning_projects`, `auth.users`, `client_workspaces` e tabelas de equipe. O G2 hospedado não substitui automaticamente o laboratório descartável original.
- API protegida por `ROTEVO_COLLABORATION_ENABLED`; interface por `NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED`.
- Não usar dados de clientes reais em testes; manter aprovação e colaboração em fluxos distintos.
- **Sem alterações no banco hospedado e sem ativação de feature flags.**

## Critérios de aceite antes de produção
1. Executar SQL **somente no ambiente isolado devidamente autorizado**, com backup e reversibilidade; confirmar índices, RLS, permissões e rate limiting.
2. Validar JWT e isolamento entre cliente A/B, tarefas e conteúdos não compartilhados, módulos não concedidos, reset de senha e equipe sem designação/permissão.
3. Testar envio e resposta por cliente, estrategista e equipe autorizada, persistência após reload, paginação, autoria e vínculo de versão, sem vazar Auth IDs.
4. Testar interface real em desktop/mobile e acessibilidade, incluindo mensagens em Tarefas e Conteúdo.
5. Confirmar que G2 e caminhos de operação existentes continuam funcionais e que o rollback não reabre JSON privado.
6. Separadamente, solicitar aprovação de migração e ativação na produção. Nunca ativar flags do ambiente principal durante a homologação.

## Estado de decisão
**NO-GO para ativação em produção** até os testes de autenticação e persistência estarem comprovados na infraestrutura alvo. Este documento é um inventário; não é uma autorização de implantação.
