# Ativação da Gestão de Usuários — execução de 16/10/2026

**Resultado: preparação e testes locais avançaram; produção não foi alterada.**

## Estado confirmado por consultas sem escrita

- Projeto `kadvzjelkyfwouqmlxaa`, PostgreSQL 17.6, ativo.
- Zero migrações no histórico; quatro tabelas públicas legadas, sem tabelas de equipe.
- 12 usuários Auth, 12 perfis, 1 cliente, 1 projeto, 0 vínculos client_users e 38 objetos Storage.
- Proprietário confirmado: Otávio Silva, `contato@rotevo.com.br`, com perfil estrategista e e-mail coincidente no Auth. Não foi alterada sua senha nem seu acesso.
- `authenticated` mantém UPDATE em `profiles.role` e `profiles.client_id`.
- **Novo achado confirmado:** `anon` e `authenticated` possuem TRUNCATE nas quatro tabelas legadas. RLS não protege TRUNCATE. Não foi tentada exploração em produção.
- Advisors: execução de `is_strategist()` por anon/authenticated e proteção contra senhas vazadas desativada. A execução autenticada da função é usada pelo RLS legado e não deve ser revogada sem substituir essas políticas.

## Recuperação: pendência concreta

O backup local encontrado em `Rotevo-Backup-Antes-Ecossistema-2027` é uma exportação parcial JSON; não é um arquivo pg_dump recuperável. Docker/Supabase local estão operacionais. Não foram encontradas variáveis de conexão PostgreSQL, pgpass ou serviço libpq nas localizações verificadas; o `.env.local` do checkout antigo contém somente URL/anon key de frontend.

Foram consultados os chats “Retomada técnica do desenvolvimento”, “Continuidade dos testes de segurança” e “Validação Isolada Supabase”. A recuperação disponível omite várias respostas, retornando referências de conteúdo. Nos textos recuperáveis não há caminho de credencial nem prova de restauração. Também foi consultado o chat técnico de Docker.

Preparado `scripts/security/export-private-supabase-backup.ps1`: usa cliente PostgreSQL 17 já instalado no Docker, configuração libpq privada montada somente para leitura, SSL, diretório com ACL restrita ao usuário Windows, arquivo custom, lista e SHA-256. Não envia a senha em argumentos. **Somente análise sintática executada; nenhuma conexão de produção nem exportação foi executada.** O script exige configuração privada no host direto do projeto; se a máquina exigir session pooler, revisar/configurar o host antes de utilizá-lo. Não inclui roles do cluster ou binários do Storage. A estrutura de arquivo não comprova restauração.

## Correções preparadas e testadas

Migração adicional `20261016210140_activation_privilege_boundary.sql`, gerada pela CLI e aplicada **somente no banco local sintético**:

- Retira TRUNCATE/REFERENCES/TRIGGER do navegador nas tabelas legadas.
- Retira INSERT/DELETE/UPDATE de perfis, inclusive grants individuais de colunas, e repõe apenas UPDATE de full_name.
- Retira grants herdados de escrita/TRUNCATE nas tabelas novas de equipe; mantém SELECT condicionado pelas políticas existentes.
- Explicita acesso de service_role às tabelas e sequência de auditoria.

O contrato de teste da consulta de equipe foi corrigido para aceitar arquivos CRLF no Windows, preservando a checagem da ordem de autorização.

## Evidências desta execução

- **133/133 testes Node aprovados**, excluindo a suíte HTTP anônima que exige servidor em execução. São testes de contrato e comportamento, não homologação E2E.
- Novo banco `rotevo_activation_20261016` no container local `supabase_db_rotevo-security-local`, com estrutura legada e identidades totalmente fictícias. Nenhum dado real foi copiado.
- Executado `activation-boundary-isolated.sql`: migrações de grants, equipe, staff, auditoria, correção adicional e bootstrap. Resultado PASS.
- Cobertura SQL: grants de TRUNCATE negados, alterações de role/client_id negadas, nome próprio editável, staff sem acesso SQL global a projetos/clientes/diretório, cliente restrito ao próprio projeto, atribuição e permissão auditadas, inativação persistida, dados sintéticos preservados e bootstrap do proprietário sobre identidade fictícia coerente.
- O banco de teste foi mantido para inspeção. Não constitui restauração do banco real, sessão Supabase Auth real ou teste de senha temporária.

## Próxima execução necessária

1. Disponibilizar conexão PostgreSQL em arquivo privado com permissões restritas, sem enviar senha pelo chat e sem redefinir senha do banco sem avaliar os consumidores existentes.
2. Executar backup completo privado; inventariar extensões/roles e copiar binários Storage. Restaurar em destino novo isolado e verificar tabelas, contagens, Auth, constraints, RLS e dados representativos sem exibi-los.
3. Reexecutar segurança sobre a cópia restaurada. Rever estrategistas legados: hoje preservam acesso amplo e não são bloqueados globalmente por team_members.active.
4. Homologar por HTTP/UI cadastro, duplicação/compensação, senha temporária, troca inicial, permissões/projetos, revogação e inativação com JWT já emitido. O staff atual possui apenas resumo restrito: não há edição de documentos habilitada para esse papel.
5. Somente após recuperação e segurança comprovadas, aplicar o lote revisado em transação, configurar o administrador e ativar as flags gradualmente. Não executar `db push` indiscriminado: há propostas antigas e migração editorial fora deste lote; arquivos antigos usam versões com oito dígitos repetidos e precisam de empacotamento/histórico coerentes antes da execução.

Nenhuma migração, bootstrap, criação/inativação de conta real, flag de produção ou deploy foi executado nesta rodada. A autorização atual do usuário cobre o avanço condicionado; a pendência é técnica (recuperação e homologação), não nova aprovação genérica.

## Continuidade: homologação autenticada local

- Pipeline do commit `e42583a` confirmado com sucesso: [Security checks #38967090423](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38967090423).
- As configurações adicionais verificadas (credenciais salvas e diretórios temporários Supabase) não forneceram senha PostgreSQL de produção. `start-secrets` é parte do ambiente local; não comprova acesso remoto.
- Preparadas as migrações selecionadas no banco de API **local** existente, que possuía duas identidades de laboratório e nenhum cliente/projeto. As flags foram habilitadas somente na configuração local ignorada pelo Git.
- Executado `scripts/security/team-lifecycle-local-http.mjs`: **38 verificações autenticadas aprovadas** com Supabase Auth, REST e APIs Next.js reais, todos em loopback. O teste cria e remove somente IDs fictícios gerados pela execução.
- Cobertura: cadastro com perfil `staff` e membro inicialmente inativo; duplicação sem exclusão do usuário existente; login com senha temporária; bloqueio antes da troca mesmo após ativação; rejeição de alvo arbitrário na troca; nova senha aceita e antiga rejeitada; troca não repetível; diretório/cadastro negados ao staff; concessão, vínculo, revogação de projeto/permissão; isolamento de REST direto; tentativa de elevar role negada; inativação nega token emitido anteriormente; sete mutações têm os sete eventos de auditoria correspondentes.
- A primeira execução falhou apenas pela expectativa incorreta de oito eventos no teste; ajustado para comparar os sete eventos efetivamente solicitados. Segunda execução integral aprovada e fixtures removidos.
- Ampliada a suíte para incluir cliente real do Auth local: somente seu projeto visível; diretório e área da equipe negados; alteração de role e client_id recusada. Corrigida a ordem de limpeza (usuários/perfis antes dos clientes referenciados). Execução final com 38 verificações e limpeza aprovada; inventário posterior: 2 identidades anteriores preservadas, 0 identidades lifecycle, 0 clientes, 0 projetos e 0 eventos de auditoria.
- Workflow dedicado adicionado para repetir esse ciclo em Supabase descartável sem conexão com produção. O resultado local não substitui a confirmação desse novo workflow no GitHub, a homologação visual integral nem a restauração de dados reais.
- Login local renderizado no navegador; o fluxo completo de interface de cadastro/troca ainda não foi homologado no navegador.
- Backup de produção, restauração real, migração e bootstrap hospedados seguem pendentes da conexão privada e da recuperação comprovada.
- Usuário informou que não possui/não sabe localizar a senha do banco. Revisão do código não encontrou conexão PostgreSQL direta no aplicativo, apenas Supabase API; isso não prova ausência de consumidores externos. Redefinição de senha não executada. Foi aberta a página de configurações do banco para o usuário.
- Teste sem credenciais com `pg_isready` no Docker não recebeu resposta do endpoint direto. Exportador atualizado para aceitar Session pooler na porta 5432, com host copiado do painel e validado explicitamente, usuário contendo o ref do projeto e SSL. Nenhum host de pooler foi inventado; conexão real permanece sem teste.

Referências: [RLS e TRUNCATE (PostgreSQL)](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [backup/restore Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase).
