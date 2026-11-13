# ROTEVO — Contrato de publicação segura (proposta V1)

Status: especificação de arquitetura para revisão, **não aplicada**. Branch: feature/admin-v2-redesign.

## 1. Propósito e fronteira de confiança
Separar dados internos dos estrategistas dos conteúdos explicitamente aprovados para consumo pelo cliente. O controle deverá ser aplicado no Supabase e nos endpoints, jamais depender de ocultação por interface.

### Constatações da revisão
- Portal `src/app/cliente/page.tsx` lê `planning_projects.data` completo, incluindo projetos `draft`.
- Apresentação `src/app/apresentacao/[slug]/page.tsx` consulta `planning_projects` e usa `moduleContent`.
- Editor `src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx` mantém atualizações em `planning_projects.data.moduleContent`.
- Testes locais: 26 verificações de autorização aprovadas; outras 5 reproduzem exposição de informações internas ao próprio cliente. PASS no teste de caracterização significa exposição reproduzida, **não** ausência de risco.
- Não há comprovação de que o schema local reproduza integralmente produção ou de que haja testes integrados das APIs.

## 2. Contrato de dados proposto
### Fonte interna (não pública)
`planning_projects` mantém edição, rascunhos, comentários internos e `data` integral; cliente e `anon` não terão SELECT direto dessa origem quando o novo fluxo estiver funcional.

### Projeção publicada (proposta — modelagem a aprovar)
Uma tabela independente de snapshots publicados, contendo: identificador do snapshot, project_id, client_id, revision, payload_publicado, estado, published_at, revoked_at e timestamps. Os nomes são conceituais; não representam tabelas existentes.

Critérios:
- Payload por lista positiva: incluir somente módulos, metadados e recursos aprovados; não simplesmente copiar `data` integral.
- Registrar a versão liberada; futuras edições internas não serão divulgadas automaticamente.
- Manter publicação anterior até aprovação explícita de nova versão, salvo revogação.
- Revogar deve impedir leituras futuras no banco/API. Cópias já obtidas não podem ser apagadas remotamente.
- A identidade do usuário deve ser verificada em cada leitura; o cliente só acessa publicação autorizada do seu tenant.
- Acesso administrativo via serviço no servidor, com validação explícita do solicitante; chave service role nunca no browser.

## 3. Estados e transições propostas
- Rascunho interno: não acessível ao cliente.
- Preparado para publicação: revisão sem liberar dados.
- Publicado: snapshot explicitamente aprovado disponível ao cliente vinculado.
- Nova revisão em desenvolvimento: snapshot anterior permanece disponível.
- Revogado: nenhuma nova leitura do snapshot pelo cliente.

A política sobre `archived`, link de apresentação, cache e auditoria de publicação precisa de definição antes da migration.

## 4. Contrato das superfícies
- Editor estratégico: continuar lendo/escrevendo dados internos, sem alterações visuais desnecessárias.
- Portal do cliente: usar somente projeção publicada e metadados públicos previstos, jamais `planning_projects.data` diretamente.
- Apresentação: utilizar projeção publicada e autorização tenant-aware; preservar os componentes visuais existentes.
- Administração: publicação, revisão e revogação por ação autorizada e auditada.
- Proibir `SELECT *` sobre fontes internas em endpoints destinados ao cliente.

## 5. Segurança e testes mínimos
- RLS + GRANTs mínimos tanto na tabela de snapshots quanto na tabela interna.
- Testes de usuário A/B, anônimo, estrategista, projeto draft, publicação, nova edição, versão substituta, revogação e alteração de cliente.
- Verificar acesso direto via REST/API, não somente renderização de interface.
- Testar `security_invoker` se for adotada view; cuidado com views definer e funções privilegiadas.
- Regressão: editor, módulo, publicação/despublicação, login cliente, apresentação, convites e acesso administrativo.

## 6. Portões de implementação
1. Identificar o contrato atual de cada consulta e os módulos que compõem `data`.
2. Aprovar lista positiva de campos publicados, sem presumir que todos os módulos podem ser expostos.
3. Criar migration **somente de laboratório** e testes pgTAP/integração; não aplicar à produção.
4. Adaptar leitores de cliente e apresentação na branch feature/admin-v2-redesign.
5. Validar regressões e revisar requisitos visuais V2/Tabler.
6. Deployment de prévia agrupado quando existir lote visual válido.
7. Publicação em main, app.rotevo.com.br, migrations remotas ou usuários reais somente com autorização explícita.

## 7. Decisões ainda abertas
- Publicação de planejamento inteiro versus aprovação por módulo.
- Conteúdo e tratamento de campos auxiliares para dashboard (calendário, onboarding, imagem de capa).
- Comportamento exato do link de apresentação e rascunhos já compartilhados.
- Regras de versionamento, histórico e auditoria.
- Migração segura dos dados existentes sem copiar registros reais ao laboratório.

Referências:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/column-level-security
- https://supabase.com/docs/guides/database/views
