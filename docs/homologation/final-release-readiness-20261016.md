# ROTEVO 2027 — Checklist de aprovação final da plataforma

Data: 16/10/2026. Ambiente de trabalho: `feature/admin-v2-redesign`.

## Evidências disponíveis
- Preview na Vercel: `https://rotevo-ecossistema-ad27rdtcl-rotevo-marketing.vercel.app`, deployment READY. O carregamento visual pelo navegador externo de consulta não foi confirmado.
- CI: build Next.js, TypeScript, testes HTTP negativos, autorização de API, inventário do legado e PostgreSQL sintético. Verificar a execução mais recente antes de afirmar aprovação.
- Ambiente preview: usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` tanto no preview quanto na produção. `SUPABASE_SERVICE_ROLE_KEY` consta apenas no target production.
- Verificação SQL **somente leitura** do Supabase hospedado: as tabelas `team_members`, `team_project_assignments`, `team_member_permissions` e `team_audit_events` ainda não existem.
- Os privilégios `authenticated` de UPDATE em `profiles.role` e `profiles.client_id` ainda estão presentes.

## O que pode ser considerado aprovado
- Compilação e testes automatizados apenas quando o workflow terminar com sucesso.
- A migração de grants foi exercitada em PostgreSQL descartável, não no banco hospedado.
- A limpeza estrutural do legado não alterou dados reais.

## Critérios ainda pendentes

| Controle | Evidência necessária | Bloqueio |
|---|---|---|
| Navegação e responsividade | Capturas reais nos tamanhos desktop/mobile, sessão admin e sessão cliente | Sem homologação visual por navegador |
| Jornada administrador | Abrir projetos, documentos, tarefas, agenda e aprovações sem alterar dados de cliente real | Acesso autenticado de teste |
| Jornada cliente | Visualizar somente projetos e documentos permitidos | Acesso autenticado de teste |
| Permissões e auditoria de equipe | Migrações de equipe e auditoria aplicadas sob aprovação; testes cruzados em contas fictícias | Estrutura inexistente no Supabase hospedado |
| Escalonamento de privilégios | UPDATE de `profiles.role` e `profiles.client_id` revogado | Alteração de banco não aprovada |
| Prontidão de produção | Backup restaurável, janela de mudança, plano de reversão, logs, consentimento de implantação | Aprovação de release |

## Procedimento mínimo de conclusão
1. Verificar o CI e registrar IDs de execução.
2. Validar preview no navegador com credenciais controladas, priorizando fluxo somente leitura.
3. Corrigir problemas de UX/navegação identificados, repetir CI e nova preview.
4. Após decisão explícita de ativação de banco, confirmar backup, corrigir grants e aplicar migrações revisadas.
5. Rodar verificações RLS e de permissões por papéis com contas artificiais; somente depois habilitar flags administrativas.
6. Obter aprovação final para atualizar o domínio oficial.

**Decisão atual:** candidato de desenvolvimento em preview; não aprovado como release de produção. Não se deve habilitar flags, executar DDL em produção ou declarar E2E autenticado completo sem evidências.
