# ROTEVO UI 3.0 | Gate de aceite do PR #15 — 14/11/2026

**Estado: DRAFT / NO-GO para produção.** Este documento é um registro de homologação, não uma autorização de implantação. Sem merge, deployment, Preview, SQL hospedado, ativação de flags ou alterações de dados reais.

## 1. Evidências de testes e resultados

| Critério | Evidência | Resultado |
| --- | --- | --- |
| CI Auth, integração, PostgreSQL, build e TypeScript | [GitHub Actions 43586322109](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/43586322109), SHA `3022d9a0` | 10/10 SUCCESS |
| Aparência Sistema e preferência por conta | E2E Playwright com emulação de esquema Claro/Escuro, escolha explícita, persistência após reload | PASS no laboratório do CI; não substitui aceite visual humano |
| Responsividade e acessibilidade automatizada | Sete larguras 320/375/390/430/768/1024/1440 e axe em telas cobertas | PASS no laboratório; escopo parcial |
| Capturas visuais | Artefato `14110607987` do run 43586322109, dez imagens sintéticas | Inspecionado; cards legíveis nas capturas de 390 px; indicador de desenvolvimento Next.js aparece em telas; falta captura limpa e avaliação humana |
| Backup privado do banco de 10/11 | Handoff do Codex, manifest e SHA256 coincidentes, duas restaurações PostgreSQL 17.11 com `pg_restore --single-transaction` e consultas pós-reinício | APROVADO COM RESSALVAS para recuperabilidade lógica; laudo integral reside somente na máquina administrativa |
| Backup privado Storage | [Runbook de pré-produção, seção 7](rotevo-ui3-release-preproduction-runbook-20261110.md) | 3 buckets e 50 objetos / 27.151.977 bytes, pacote AES-256-GCM; recuperação em filesystem e SHA256 individual registrados. Não foi testada recuperação integral na API do Supabase |
| Controle externo Drive | Documento sintético da Rotevo, verificação ACL, captura de leitor autorizado e de acesso negado após remoção | PASS para acesso/leitura/revogação do Google Drive; registro da URL e abertura por dentro da Rotevo continuam pendentes |
| Condição `realtime.messages.messages_payload_exclusive` | Catálogo read-only Supabase produção e homologação, 14/11 | `NOT VALID` em ambos. Não executar `VALIDATE CONSTRAINT` no hosted; avaliar em clone e distinguir condição histórica |
| Configuração de deploy | `vercel.json`: `git.deploymentEnabled=false`, consulta de deployment | Produção permanece no SHA `8cd22a88`; não houve promoção |

## 1.1 Conferência atualizada de grants (somente leitura, 14/11)

Consultas com `has_column_privilege` à produção e homologação hospedadas indicaram **o mesmo estado**:

- `anon`: sem `SELECT` em `planning_projects.id` e sem `SELECT` em `planning_projects.data`;
- `authenticated`: `SELECT` em `id` e `title`, mas **sem** `SELECT` ou `UPDATE` em `data`;
- `service_role`: `SELECT` e `UPDATE` em `data`;
- `planning_projects` tem RLS ativado.

**Divergência histórica relevante:** o runbook de 10/11 relata grants antigos de JSON direto. A condição atual observada já é restritiva, embora a implantação do novo workflow siga incompleta. Não aplicar o REVOKE do runbook automaticamente, nem presumir que o deployment atualmente servido foi homologado contra as permissões atuais. Investigar quando e como ocorreu a mudança e validar a operação autenticada antes de qualquer release. Estes testes por catálogo não substituem RLS efetiva por identidade.

## 2. Diagnóstico de isolamento Git

A comparação `feat/ui3-operational-integration-20261113..main` está `diverged`: 1 commit exclusivo da `main` e 1761 commits exclusivos da branch na consulta deste gate. Arquivo afetado pelo commit exclusivo da main: `vercel.json`. O conteúdo de `git.deploymentEnabled=false` já consta da branch.

**Pendência:** reconciliar ancestralidade sem perda do histórico e sem alterar `vercel.json`; revisar diff/merge-base; congelar novo SHA; repetir CI no SHA candidato antes de qualquer merge. Não resolver via force push ou reset indiscriminado.

## 3. Verificações ainda necessárias no computador administrativo

1. **Storage/roles:** localizar pacote criptografado existente, sem revelar chave; verificar acesso e SHA, restaurar em filesystem isolado e confrontar o inventário de 50 metadados `storage.objects` do clone com 50 objetos e respectivas chaves/paths/hashes. Confirmar que a validação não depende de payloads de arquivos reais expostos em logs. Importar para Storage de homologação somente com autorização separada e procedimento protegido; não usar produção.
2. **Autenticação real no clone:** usar usuários sintéticos separados para estrategista, colaborador G2 e cliente. Os 18 usuários Auth do backup não são credenciais válidas para testes automáticos. Testar RLS real como cada identidade, APIs autorizadas/negadas e acesso entre tenants; não redefinir senhas de clientes.
3. **Paridade com PR #15:** comparar schema restaurado de novembro com a baseline versionada; propostas de SQL da PR são migrações a serem aplicadas APENAS a cópia adicional descartável, após gerar snapshot do clone. Rodar testes de upgrade, approvals, client-actions e regressão. Registrar diffs de colunas, constraints, policies, grants e funções; não copiar IDs/e-mails reais a arquivos públicos.
4. **Constraint NÃO VALIDADA:** obter definição no clone, verificar em leitura se existem linhas antigas não conformes usando consulta que não modifique dados; `VALIDATE CONSTRAINT` somente em cópia descartável e com registro de erros, nunca em hosted sem autorização.
5. **Recuperação operacional:** demonstrar inicialização da stack local, mecanismos de restabelecimento de perfil administrador sintético e dependências externas (Auth config, Storage bytes, chaves não expostas, Edge Functions, Realtime). O ensaio do dump isolado não comprova todos esses itens.

## 3.1 Handoff do Codex: complementação em clone de 14/11/2026 (08:23, informado pelo operador)

**Classificação final desta rodada: RECUPERAÇÃO OPERACIONAL NÃO COMPROVADA.** Evidência transcrita pelo operador de relatório privado `complementacao-recuperacao-rotevo-20261114.md`. O relatório integral continua inacessível por esta conexão; não classificar os testes descritos como homologação independente do ambiente hospedado.

| Controle | Resultado do Codex no clone | Ressalva/impedimento |
|---|---|---|
| Storage criptografado | **NÃO COMPROVADO** | Pacote AES-256-GCM não localizado nas pastas privadas conhecidas; só há registro anterior de validação dos bytes |
| Metadados Storage | **APROVADO COM RESSALVAS** | 3 buckets, 50 objetos e 27.151.977 bytes coincidem com o runbook; sem correspondência individual path/tamanho/SHA256 |
| Auth, roles e grants | **NÃO COMPROVADO** | 18 registros Auth com hash, mas sem login real; roles substitutos NOLOGIN, ausência de `authenticator` e de `BYPASSRLS` para `service_role` no cluster descartável |
| Isolamento de projetos por SQL | **APROVADO COM RESSALVAS** | Estrategista: 2 projetos sintéticos; cada cliente: 1 próprio e 0 do outro; G2 com `projects.read`: 0 por SELECT direto; API/RPC G2 ainda não verificada |
| Upgrade SQL PR #15 | **APROVADO COM RESSALVAS** | 15 propostas SQL aplicadas ao clone `audit_completion_20261114`, SHA local de referência `b99303c6`; retirou SELECT direto de JSON e criou `public.rotevo_collaboration_messages`; sem regressão end-to-end nesse clone |
| `realtime.messages.messages_payload_exclusive` | **APROVADO NO CLONE** | Expressão `payload IS NULL OR binary_payload IS NULL`; 0 linhas, 0 violações; `VALIDATE CONSTRAINT` somente no clone. Não altera a condição NOT VALID hospedada |

Os dois bancos anteriormente restaurados continuam preservados. Nesta rodada, o Codex utilizou clone adicional e reverteu dados sintéticos. Nenhum acesso ao Supabase hospedado, merge ou deployment foi relatado.

**Prioridade 1 — Storage:** localizar o pacote e sua chave armazenada separadamente no computador administrativo (informar somente caminhos locais, jamais segredo), verificar integridade e o inventário objeto a objeto, e testar recuperação via **API de Storage** em stack isolada. **Não** copiar/alterar linhas `storage.objects` diretamente para simular upload.

**Prioridade 2 — Auth e G2:** iniciar stack isolada com Auth/PostgREST/Roles compatíveis; criar identidades totalmente sintéticas, emitir JWT através do serviço Auth e testar APIs do PR #15. A leitura direta de projetos igual a zero para G2 pode ser intencional no modelo de grants restritos; não classificá-la como bug sem testar as APIs/RPCs autorizadas.

**Prioridade 3 — E2E e aceite:** validar a aplicação no mesmo SHA do clone, com casos permitidos e negados e comparativo de schema/policies/grants. Registrar evidências locais agregadas, sem dados reais em logs. Não repetir restauração original nem fazer novas migrações hospedadas.

## 3.3 Backup atual do Storage — restauração isolada aprovada em 14/11 às 09:00

Handoff do operador a partir da auditoria local do Codex. **APROVADA a recuperabilidade do Storage atual**, sem alterar produção e com documentação completa permanecendo privada. Esta evidência supera a pendência anterior de indisponibilidade do pacote antigo, sem apagá-la do histórico.

- Intervalo: 08:55:54.891–08:57:36.381, horário de Brasília, 14/11.
- Projeto de produção verificado por leitura da Storage API (HTTP 200).
- Inventário estabilizado após download: **3 buckets, 50 objetos, 27.151.977 bytes**, 50 downloads bem-sucedidos, nenhuma falha.
- Pacote AES-256-GCM: `rotevo-private-backups/storage-20261114T115553560Z/storage.aesgcm`; SHA-256 do pacote criptografado `7fc0b2459d6802190b3bf53f257d4f314fe4bb5fcd39c67ba12d648d481849b6`. Chave guardada em arquivo privado distinto; nenhum segredo em GitHub.
- Descriptografia autenticada e **50/50 SHA-256 de objetos** conferidos.
- Comparação com metadados do dump de 10/11: 50 objetos coincidentes em bucket, caminho, tamanho, ID, ETag e updated_at; 0 novos e 0 ausentes. **Limite:** dump histórico não tem hashes binários individuais para prova direta da equivalência criptográfica dos bytes de 10/11.
- Em Storage isolado na rede Docker sem portas expostas: **3 buckets privados e 50/50 objetos importados via API, relidos e validados por SHA-256 e tamanho**. Não houve mutação no Storage hospedado.
- Parecer: **PASS recuperabilidade atual de Storage**, com limite de equivalência histórica e sem prova de recuperação integral de todas as configurações externas. A restauração lógica DB e os testes Auth/G2 continuam documentados separadamente.

**Bloqueios independentes de Storage para GO:** corrigir/verificar timeout na regressão ampla do portal em Detalhes; refresh de G2 e entrega, acessibilidade manual e capturas limpas; integrar e congelar SHA com Git e revisar cutover/contingência compatível com grants; autorização expressa de publicação.

## 4. Gate de proteção e plano de implantação ainda não executados

- Preservar acesso dos dois estrategistas; não alterar identidade de clientes e nem executar reset de senha principal.
- Preparar versão de contingência UI3 **compatível com grants G2 restritos**; não voltar para UI2 depois da revogação de grants JSON.
- Testar contenção de tráfego, aliases e WAF em hostname de laboratório antes da janela de publicação; caso não seja possível conter UI2 com segurança, **NO-GO**.
- Congelar SHA, confirmar CI e Vercel READY do mesmo artefato apenas após autorização de ambiente de teste; revisar pacotes SQL ordenados, flags e plano de rollback.
- Antes de executar em produção, exigir aceite visual humano e autorização expressa para merge, deploy e migração. Não inferir permissão da autorização para auditar.

## 5. Próximo handoff ao Codex (sem dados ou segredos)

Solicitar ao Codex instalado na máquina administrativa que continue a auditoria na cópia local já restaurada, sem repetir o restore e sem reiniciar/remover volumes existentes. Produzir relatório agregado dos cinco itens da seção 3, mantendo o dump, logs completos e pacote Storage apenas em diretórios privados. Registrar códigos PASS/FAIL/BLOCKED e evidências reproduzíveis. Nenhum acesso ao Supabase hospedado.

**Decisão até o fechamento de todos os gates:** NO-GO.
