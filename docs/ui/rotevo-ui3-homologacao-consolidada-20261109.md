# Rotevo UI 3.0 | Matriz consolidada de homologação

**Corte técnico:** 09/11/2026 (horário de São Paulo).  
**Repositório:** `rotevo-marketing/rotevo-ecossistema`  
**Branch exclusiva:** `feat/rotevo-ui2-pilot-20261109`  
**CI de homologação ampliada:** [GitHub Actions #42737283479](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42737283479) — **SUCCESS**, commit `95550beb`.  
**Escopo:** consultas de código, testes automatizados isolados e build. Sem edição de registros reais, migração ou promoção de produção.

## 1. Evidências aprovadas automaticamente

| Eixo | Evidência/testes | Resultado |
| --- | --- | --- |
| Navegação UI3 | Contratos de sidebar, `section`, Back/Forward, documentos, modais e teclado; regressões DOM JSDOM | Aprovado no CI |
| Documentos HTML | `document-html-persistence.test.cjs` executa a rota de gravação com repositório sintético em disco; grava/reabre HTML curto e extenso, altera CSS, preserva releases, checa limites, concorrência e falhas | Aprovado em fixture isolada |
| Sanitização HTML | `visual-html.test.mjs` e `visual-html-component.test.cjs`; scripts, SVG, links, CSP, tamanho, Unicode, visualização | Aprovado em testes isolados |
| Planejamento e publicação | Transições de aprovação, isolamento de versões publicadas, releases e documentos de 2027 | Aprovado em contratos |
| Financeiro | `finance/domain.test.mjs`, `finance/lifecycle.test.mjs`, `finance-publication.test.mjs`; pagamentos parciais, duplicidade, estornos, recorrência, contas, competênc﻿ias, caixa, leitura e modo desconectado | Aprovado em dados sintéticos |
| Cliente, projetos e módulos | `client-project-projection.test.mjs`, `isolated-client-journey.test.mjs` e `client-project-api-behavior.test.mjs`: JWT, papel cliente, filtro de tenant, URL manipulada, senha inicial, restrição de módulos | Aprovado em fixtures |
| Arquivos privados | `client-assets-behavior.test.mjs`: módulos ausentes/desabilitados, tenant diferente, fatura invisível/desvinculada, documento não publicado, contrato não referenciado, colaborador sem projeto | Aprovado em fixtures |
| Equipe e autorização | `team-project-access-behavior.test.mjs`, `staff-access-boundary.test.mjs`, `admin-route-contract.test.mjs`, `auth-schema-preflight.test.mjs`: permissões, RLS previsto, membros inativos, restrição de mutações | Aprovado em código e fixtures |
| Operação e planejamento | Ações, calendário, campanhas, onboarding, dependências de tarefas, projeções administrativas e identidade | Aprovado em contratos |
| Qualidade técnica | TypeScript `npx tsc --noEmit` e `npm run build` (Next.js) | Aprovados no CI |

O workflow executa as suítes anteriores e **16 especificações adicionais** numa matriz offline, sem apontar para Supabase hospedado. Variáveis de configuração do CI utilizam endpoints e chaves-placeholder locais.

## 2. Correções incluídas nesta rodada

- `src/lib/operations/assets.ts` (commit `e44584cd`): negada consulta de arquivo de planejamento ou financeiro quando não existe **autorização explícita** no workspace para o módulo respectivo. Não foram modificados documentos nem permissões persistidas.
- `scripts/security/client-assets-behavior.test.mjs` (commits `83986ba9` e `635c8af7`): seis testes comportamentais da resolução de autorização de arquivos em papéis e tenants sintéticos.
- `scripts/security/client-project-api-behavior.test.mjs` (commit `9f12b39c`): cinco testes de requisição da API do cliente com token ausente, conta de estrategista/staff, senha inicial pendente, tentativas de troca de tenant pela URL e associação incorreta.
- `.github/workflows/rotevo-ui2-pilot.yml` (commits `aaa872c9`, `b340f338`, `95550beb`): suíte ampliada e repetível em todos os pushes de código na branch.

## 3. Verificações reais já documentadas pelo Work

A execução autenticada anterior observou na prévia da Rotevo a navegação nos dez módulos do estrategista, cinco clientes e cinco projetos, 38 tarefas, renderização de HTML extenso, ocultação de rascunhos, foco/teclado, menu móvel e correções visuais. A revalidação da prévia `90d69cc` confirmou CSS, reflow aproximado em 340/454/681 px, seletor de projetos e modais. **Essas observações pertencem às versões examinadas pelo Work** e não equivalem à revalidação visual dos commits de segurança mais recentes.

## 4. Matriz de aceite pendente: não converter em aprovado

| Prioridade | Requisito | Condição de aprovação |
| --- | --- | --- |
| Bloqueante | Cliente autenticado | Entrar com conta **cliente** autorizada, validar páginas, módulos, documentos, conteúdo, aprovações e negações por outra conta/tenant |
| Bloqueante | Colaborador autenticado | Entrar com conta **staff** ativa e restrita; comprovar atribuições, leitura/edição permitidas, ações administrativas negadas, troca de senha e inativação |
| Bloqueante | Banco e RLS | Testar rotas e políticas contra **instância Supabase local/isolada** com dois tenants e perfis sintéticos, inclusive consultas por IDs de terceiros |
| Bloqueante | Persistência end-to-end | Gravar/reabrir HTML curto e extenso pela aplicação completa com sessão sintética, concorrência e restauração; os testes de rota + disco já foram aprovados |
| Bloqueante | Financeiro conectado | Exercitar, em banco sintético, faturas, parcialidade, estorno, documentos, recorrência, duas contas de clientes e perfil somente leitura |
| Bloqueante | Release e rollback | Aprovação explícita, comparação com produção atual, flags e políticas corretas, plano reversível e verificação pós-release |
| Importante | Acessibilidade/responsividade | 320, 375, 390, 430, 768, 1024, 1440 px; leitor de tela, foco, Tab/Shift+Tab, contraste e movimento reduzido |
| Importante | Observabilidade | Investigar falha inicial de consulta/sessão após autenticação observada anteriormente; não assumir causa |
| Decisão de compatibilidade | Workspace legado | `emptyWorkspace()` habilita módulos por padrão quando não existe registro do workspace em alguns endpoints. Revisar com dados sintéticos e regra de negócio antes de optar por *deny-by-default* universal, pois restringir unilateralmente pode ocultar serviços de clientes legados |
| Evolução separada | Arquitetura futura | Deduplicação plena da visão geral, modelo multicanal, atas juridicamente imutáveis, automações de tarefas e integrações Google |

**Nota:** o CI de fixtures não comprova autenticação real, isolamento efetivo no Supabase hospedado, experiência com leitor de tela nem integridade de fluxos de pagamento externos. O estado de prévia `READY` comprova build/deployment, não aceite funcional.

## 5. Orientações para completar no Work

1. Usar exclusivamente a prévia da branch mais recente, mantendo a proteção Vercel.
2. Acessar contas autorizadas **pelo formulário seguro**, nunca inserir senha nos chats ou nos logs.
3. Executar exclusivamente testes de leitura nos dados reais; para alterações usar Supabase local, fixtures e usuários sintéticos.
4. Registrar por cenário: identidade/role, tenant, projeto, endpoint, ação, esperado, observado, captura, commit e status.
5. Corrigir na branch e repetir todas as regressões, sem promover a `main` nem alterar flags de produção.
6. Somente ao encerrar todas as pendências bloqueantes, apresentar aceite e plano de release para autorização específica.

## 6. Estado de implantação

Sem merge na `main` e **sem publicação deliberada de produção** nesta rodada. A Vercel gera prévias automaticamente via GitHub. O estado de produção deve ser conferido novamente na preparação do release, nunca inferido de uma prévia READY.
