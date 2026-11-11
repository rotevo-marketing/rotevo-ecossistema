# Rotevo UI 3.0 — checkpoint de execução pré-publicação

**Data:** 10/11/2026 (Brasil). **Decisão:** NO-GO para promoção de produção. **Escopo autorizado:** preparar/corrigir permissões, preparar mensagens, homologar UI e contingência, antes de solicitar aviso específico de publicação. Não registrar este relatório como homologação integral concluída.

## 1. Segurança do Supabase — compatibilidade obrigatória

**Leitura hospedada confirmada:** cinco clientes, cinco projetos, cinco workspaces. `planning_projects.data` possui SELECT e UPDATE efetivos por `authenticated`, RLS ativo (6 policies), e as permissões de tabela também incluem DML para `anon` e `authenticated`, limitadas por RLS. `rotevo_collaboration_messages` ainda não existe no hosted. `profiles` não oferece UPDATE direto de `role` ou `client_id` ao papel authenticated. A função `is_strategist()` é usada por policies `profiles`/ `planning_projects`; nunca removê-la isoladamente sem controlar recursão da RLS.

**Achado bloqueante:** a UI2 atualmente publicada em produção (SHA `bec8ee26a0a33a579ce223eaffccbb04f7aaf61a`, Vercel) faz `supabase.from("planning_projects").select(...data)` do navegador no portal do cliente e nos painéis administrativos. A restrição G2 aplicada isoladamente agora interromperia esses módulos. A UI3 candidata já usa APIs autorizadas para esses fluxos. Portanto, há dependência de cutover coordenado: app compatível + grants/RPCs revisados e testados na janela. **Nenhum REVOKE hospedado executado.**

Preparação na branch:
- `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`: proposta estendida para revogar `INSERT/DELETE` diretos de `anon/authenticated` além de `SELECT/UPDATE`, preservando SELECT limitado a metadata e acesso total service_role.
- `docs/security/sql/ui3-editorial-rpc-hardening-PROPOSAL-ONLY.sql`: proposta de negação quando cliente não tem workspace/módulo, ou senha inicial está pendente. A autorização legítima de edição permanece.
- `docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql`: proposta de esquema privado de mensagens e rate limit, ainda não aplicada.

**Regra:** não colocar SQL PROPOSAL ONLY nas migrations automáticas de produção sem revisão do catálogo/ACLs e teste de implantação. Não reabrir grants de JSON como rollback.

## 2. Conversas e limites

API `GET/POST` com token GoTrue, autoria no servidor, isolamento por cliente, projeto e item compartilhado. Threads de tarefas/conteúdo, paginação composta por data + id e interface em ambos os portais. Limitador de 10 mensagens/autor/60s transacional com advisory lock, rejeição HTTP 429.

- [Teste integrado de colaboração e concorrência 42926099312](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42926099312): SUCCESS, 10 inserções e 6 rejeições em 16 envios simultâneos, Auth e PostgREST sintéticos.
- [Seis checks gerais 42926106439](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42926106439): SUCCESS.
- A infraestrutura de mensagem está somente em proposta e o backend/frontend têm flags desabilitadas por padrão; logo, **não funciona ainda no Supabase hospedado**.

## 3. UI/acessibilidade

Homologação local anterior: sete larguras 320–1440 px, contratos, documentos publicados, foco e ARIA e axe-core em cliente e estrategista. Adicionado `scripts/security/ui3-collaboration-browser-local.mjs` para login real sintético, navegação mobile, abertura de tarefa, envio de mensagem, limpeza do campo, foco e varredura WCAG 2.1 A/AA. Correções incrementais do teste: abrir menu no mobile; data de pagamento fictício UTC no laboratório; aguardar atualização React após envio. Resultado final desta suite nova deve ser conferido no GitHub Actions para o exato SHA antes de declarar PASS.

**Ainda não concluído:** teste assistivo manual com leitor de tela, testes autenticados com identidade de Equipe hospedada e navegação contextual de todas as telas no destino final. Não confundir automação axe com avaliação humana.

## 4. Contingência

A organização Supabase é Free; não assumir backup agendado/PITR. Relatórios anteriores indicam cópia privada criptografada dos 50 objetos de Storage (27.151.977 bytes), restauração em filesystem local com hashes aprovados, e dump PostgreSQL criado no computador Windows do responsável com SHA-256 comparado ao manifesto. **Restauração real desse dump não comprovada.**

O arquivo de backup PostgreSQL e a chave do Storage não foram disponibilizados para este runtime. A pasta privada Windows não é alcançável pelos conectores GitHub/Supabase/Vercel nem por esta sessão do container. Não transportar dump/token/senha pelo chat, nem para o repositório ou logs do GitHub Actions. O serviço Supabase disponível não oferece download de pg_dump ao destino privado. Ensaio de backup requer computador/ambiente autorizado com acesso privado ao arquivo e Postgres 17, isolado da rede de produção. Fazer verificação de contagens, chaves, Auth/roles/grants/RLS, funções e arquivos Storage depois do restore, antes de considerar recuperação comprovada.

**Correção importante do rollback:** UI2 publicada depende de acesso direto ao JSON; após G2, reverter Vercel para aquele SHA a quebraria. Desativar duas flags de colaboração para falhas da feature e usar somente fallback de aplicação compatível com G2 validado. Jamais "corrigir" abrindo novamente SELECT/UPDATE de JSON para browser. O SHA de produção e deployment ID foram inventariados, mas uma versão pós-G2 compatível e testada de fallback ainda não foi promovida ou congelada.

## Critérios objetivos para solicitar autorização final de publicação

- Restore isolado **real** do backup aprovado, com relatório privado e verificação de Storage; nenhuma perda não autorizada.
- Validação final do SQL G2, RPCs e mensagens contra catálogo exato da produção; testes pós-migration e fluxo de retorno executáveis.
- Checks verdes no mesmo SHA de código; Vercel READY, teste manual assistivo e usuários fictícios autorizados.
- Fallback seguro pós-G2 e plano de monitoramento, sem reversão a UI2 incompatível.
- Somente após esse conjunto, solicitar decisão para a janela de deploy. Nunca efetuar merge/alias em `app.rotevo.com.br` silenciosamente.

**Estado atual:** progresso técnico substantivo, mas não há base para afirmar que as quatro etapas estão integralmente concluídas. Nenhuma mudança de dados, grants, Auth ou Storage hospedado foi efetuada neste checkpoint.
