# ROTEVO 2027 — Revisão integrada de código legado

Data: 16/10/2026  
Branch: `feature/admin-v2-redesign`. Nenhum deploy de produção ou alteração em banco.

## Inventário e decisões de remoção

A auditoria estática original detectou 81 arquivos em `src/Components/modulos` e `src/Components/apresentacao`; a detecção antiga identificava 64 sem importações, mas não resolvia caminhos relativos corretamente.

A nova análise resolve importações ES/CommonJS literais, referências relativas e o alias `@/`, sinaliza carregamentos dinâmicos e distingue candidatos de prova de uso.

**Limpeza controlada nesta branch:**
- 68 componentes legados sem importações detectadas na análise corrigida;
- 10 componentes que se tornaram órfãos após o primeiro conjunto;
- 2 auxiliares de apresentação que ficaram sem consumidores após o segundo conjunto;
- o antigo registro de módulos `src/data/modules.ts`, sem consumidores de runtime;
- o shell `src/Components/PlanejamentoModuleShell.tsx`, sem importadores e com links padrão para demos já removidas.

Total: **82 arquivos** eliminados do working tree de desenvolvimento, recuperáveis no histórico Git. Não foi alterada a estrutura JSON dos projetos existentes nem houve migração de dados.

**Componente preservado:** `EcosystemPresentationOverview.tsx`, a apresentação utilizada pelo Ecossistema de Crescimento 2027.

## Verificações automáticas permanentes

- `scripts/security/legacy-dependency-inventory.mjs --fail-on-orphans`: bloqueia a volta de formulários/apresentações legados não utilizados.
- `scripts/security/legacy-entrypoint-inventory.mjs --fail-on-live-legacy`: bloqueia imports do registro antigo, dos editores de módulos obsoletos, de apresentações substituídas e links às demos excluídas.
- `scripts/security/planning-project-consumer-inventory.mjs`: inventaria os acessos diretos e impede leitura/gravação insegura de JSON de planejamento no navegador.
- `scripts/security/only-ecosystem-2027.test.mjs`: mantém somente a apresentação Ecossistema 2027.
- Build Next.js, TypeScript, testes de API/autorização, testes anônimos e PostgreSQL sintético permanecem no CI.

## Compatibilidade e restrições

- Não excluir ou migrar dados históricos dos clientes com base somente na remoção de componentes que não são importados.
- A presença de registros antigos `modules`, `moduleContent` ou `selectedModules` em JSON histórico deve ser tratada como legado de dados, não como autorização para expô-los no Ecossistema 2027.
- As tabelas e políticas de Gestão de Usuários continuam não aplicadas à produção; nenhuma flag de ativação foi habilitada.
- A remoção está na branch de desenvolvimento. Antes de publicação, revisar navegação e apresentação da preview com usuário autorizado e concluir homologação geral.

## Critério de encerramento

A revisão estrutural fica concluída quando todos os jobs do GitHub Actions do último commit retornarem sucesso. Isso não substitui testes visuais/autenticados da aplicação nem validações de dados reais.
