# Rotevo UI 3.0 | Plano de encerramento, identidade de Equipe e liberação controlada

**Data de verificação:** 10/11/2026  
**Branch:** `feat/rotevo-ui2-pilot-20261109`  
**Estado:** **NO-GO** para produção enquanto os gates abaixo permanecerem abertos. Documento operacional; não autoriza mutações hospedadas.

## 1. Causa comprovada do bloqueio de login da Equipe

Consulta ao banco hospedado, **somente por contagens agregadas** (não reproduzir identificadores de usuários ou e-mails):
- `public.profiles`: 16 perfis `client`, 2 `strategist`, **0 `staff`**.
- `public.team_members`: 1 registro, ativo.
- Vínculos entre `team_members.user_id` e `profiles.id` com `profiles.role='staff'`: **0**.

Consequência: nenhum usuário atualmente satisfaz o conjunto de condições para `/api/team/my-access`: identidade autenticada, perfil `staff`, registro `team_members` ativo e, para títulos de projetos, `projects.read` mais atribuição explícita.

O login `/estrategista/login` **já roteia corretamente** contas `staff` para `/equipe/meu-acesso`. A mensagem antiga de falta de permissão de estrategista era ambígua quando nenhuma conta staff estava provisionada. Copy ajustada na branch em `src/app/estrategista/login/page.tsx`, com teste em `staff-access-boundary.test.mjs`.

O endpoint de convite `/api/team/invite` está intencionalmente protegido por `ROTEVO_TEAM_INVITES_ENABLED`, exige administrador ativo e cria colaborador inicialmente `active=false` com troca inicial obrigatória de senha. **Não ativar o recurso, criar usuários, converter clientes ou conceder permissões no banco hospedado apenas para passar no teste.**

### Critérios para homologar Equipe
1. Por procedimento administrativo separado e expressamente autorizado, disponibilizar identidade de **teste** com `profiles.role='staff'`, `team_members.active=true`, perfil inicial de senha concluído e permissões mínimas, sem herdar `strategist`.
2. No navegador Work, entrar por `/estrategista/login` usando formulário seguro; conferir redirecionamento para `/equipe/meu-acesso`, dados agregados e projetos atribuídos.
3. Confirmar negação de `/admin`, projetos alheios, escrita sem `projects.write`, financeiro sem `finance.read` e contas inativas. Registrar capturas sem nomes e e-mails reais.
4. Não criar nem ativar usuário real dentro desta homologação; remover teste após aceite por processo administrativo autorizado.

## 2. Situação de G2: JSON de planejamento privado

A consulta de catálogo de produção confirmou:
- `has_column_privilege('authenticated','public.planning_projects','data','SELECT') = true`.
- `has_column_privilege('authenticated','public.planning_projects','data','UPDATE') = true`.
- `has_column_privilege('service_role','public.planning_projects','data','SELECT') = true`.

RLS limita linhas, não propriedades do JSON. A UI3 projeta dados aprovados, mas o caminho PostgREST de consulta direta ao JSON próprio continua tecnicamente possível. A branch mantém a proposta **não executada** `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql` e o plano `docs/security/ui3-planning-data-grant-remediation-20261109.md`.

**Pré-requisitos obrigatórios para alterar grants do banco hospedado:** reconciliação completa de migrations e consumidores, backup verificado, ambiente espelho local com Auth/PostgREST/Storage/RPC equivalentes, execução do SQL de proposta, teste de editor/conteúdo/contratos/financeiro e rollback de aplicação que **não reabra SELECT(data)**.

### Gate pré-implantação (executar somente leitura)
```sql
SELECT
 has_column_privilege('authenticated','public.planning_projects','data','SELECT') AS unsafe_private_read,
 has_column_privilege('authenticated','public.planning_projects','data','UPDATE') AS unsafe_private_update,
 has_column_privilege('authenticated','public.planning_projects','title','SELECT') AS client_project_metadata_read,
 has_column_privilege('service_role','public.planning_projects','data','SELECT') AS trusted_service_read,
 has_column_privilege('service_role','public.planning_projects','data','UPDATE') AS trusted_service_update;
```
**O GO exige:** ambas as flags `unsafe_private_*` falsas, metadados permitidos e escrita/leitura do serviço preservadas, além de provas da aplicação. Não aplicar mudança sensível sem autorização específica.

## 3. Matriz visual restante

Testar a versão **exata** do release candidate em 320, 375, 390, 430, 768, 1024 e 1440 CSS px, viewport medido, nos portais Estrategista e Cliente e na Área da Equipe. Confirmar scroll horizontal, contraste 4.5:1 para texto pequeno, teclado (Tab, Shift+Tab, Enter, Escape), modais, foco retornado e leitor de tela em ao menos fluxo central por perfil. Quando não existir documento publicado/contrato na conta real, utilizar fixture sintética na UI isolada; não publicar dados reais apenas para gerar amostra.

## 4. Sequência de implantação e retorno seguro (não executada)

1. Revalidar `main`, SHA e alias do domínio de produção; preparar janela, backup, alertas e dependências. Congelar alterações concorrentes durante a janela.
2. Confirmar CI completo, Supabase integrado com schema equivalente, regressões e autorização de deploy + grants de produção **separadamente**.
3. Aplicar alterações de esquema e grants sob transação revisada, com preflight e postflight; nunca fazer rollback automático que restaure grants permissivos a `authenticated`.
4. Publicar build homologado da UI 3.0 e verificar o domínio real, não só `READY` no deployment; smoke tests de administrador, cliente e equipe, gravação/reabertura do editor em fixture autorizada, telas prioritárias.
5. Se houver regressão, interromper escrita/release e reverter a **aplicação** para versão compatível mantendo o bloqueio do JSON, ou usar plano de contenção previamente aprovado. Caso a versão anterior necessite de JSON direto, bloquear operações afetadas temporariamente e acionar contingência, **não** reabrir vazamento.
6. Registrar versões/SHAs, resultados, responsáveis, horários e plano de comunicação pós-release.

## 5. Posição final

- Segurança e integrações sintéticas amplamente aprovadas; Work confirmou navegação administrativa e Portal Cliente com acesso próprio; contrato/planejamento publicados e 7 viewports ainda requerem verificação visual específica.
- Equipe está bloqueada **por falta de conta staff existente**, não por falha comprovada do roteador.
- G2 continua ativo na produção; ainda não há aprovação para migração ou release.
- **NO-GO** até todos os testes e autorizações. Nenhuma alteração hospedada foi feita ao criar este documento.
