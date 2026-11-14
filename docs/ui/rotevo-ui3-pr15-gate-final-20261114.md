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

## 2. Diagnóstico de isolamento Git

A comparação `feat/ui3-operational-integration-20261113..main` está `diverged`: 1 commit exclusivo da `main` e 1761 commits exclusivos da branch na consulta deste gate. Arquivo afetado pelo commit exclusivo da main: `vercel.json`. O conteúdo de `git.deploymentEnabled=false` já consta da branch.

**Pendência:** reconciliar ancestralidade sem perda do histórico e sem alterar `vercel.json`; revisar diff/merge-base; congelar novo SHA; repetir CI no SHA candidato antes de qualquer merge. Não resolver via force push ou reset indiscriminado.

## 3. Verificações ainda necessárias no computador administrativo

1. **Storage/roles:** localizar pacote criptografado existente, sem revelar chave; verificar acesso e SHA, restaurar em filesystem isolado e confrontar o inventário de 50 metadados `storage.objects` do clone com 50 objetos e respectivas chaves/paths/hashes. Confirmar que a validação não depende de payloads de arquivos reais expostos em logs. Importar para Storage de homologação somente com autorização separada e procedimento protegido; não usar produção.
2. **Autenticação real no clone:** usar usuários sintéticos separados para estrategista, colaborador G2 e cliente. Os 18 usuários Auth do backup não são credenciais válidas para testes automáticos. Testar RLS real como cada identidade, APIs autorizadas/negadas e acesso entre tenants; não redefinir senhas de clientes.
3. **Paridade com PR #15:** comparar schema restaurado de novembro com a baseline versionada; propostas de SQL da PR são migrações a serem aplicadas APENAS a cópia adicional descartável, após gerar snapshot do clone. Rodar testes de upgrade, approvals, client-actions e regressão. Registrar diffs de colunas, constraints, policies, grants e funções; não copiar IDs/e-mails reais a arquivos públicos.
4. **Constraint NÃO VALIDADA:** obter definição no clone, verificar em leitura se existem linhas antigas não conformes usando consulta que não modifique dados; `VALIDATE CONSTRAINT` somente em cópia descartável e com registro de erros, nunca em hosted sem autorização.
5. **Recuperação operacional:** demonstrar inicialização da stack local, mecanismos de restabelecimento de perfil administrador sintético e dependências externas (Auth config, Storage bytes, chaves não expostas, Edge Functions, Realtime). O ensaio do dump isolado não comprova todos esses itens.

## 4. Gate de proteção e plano de implantação ainda não executados

- Preservar acesso dos dois estrategistas; não alterar identidade de clientes e nem executar reset de senha principal.
- Preparar versão de contingência UI3 **compatível com grants G2 restritos**; não voltar para UI2 depois da revogação de grants JSON.
- Testar contenção de tráfego, aliases e WAF em hostname de laboratório antes da janela de publicação; caso não seja possível conter UI2 com segurança, **NO-GO**.
- Congelar SHA, confirmar CI e Vercel READY do mesmo artefato apenas após autorização de ambiente de teste; revisar pacotes SQL ordenados, flags e plano de rollback.
- Antes de executar em produção, exigir aceite visual humano e autorização expressa para merge, deploy e migração. Não inferir permissão da autorização para auditar.

## 5. Próximo handoff ao Codex (sem dados ou segredos)

Solicitar ao Codex instalado na máquina administrativa que continue a auditoria na cópia local já restaurada, sem repetir o restore e sem reiniciar/remover volumes existentes. Produzir relatório agregado dos cinco itens da seção 3, mantendo o dump, logs completos e pacote Storage apenas em diretórios privados. Registrar códigos PASS/FAIL/BLOCKED e evidências reproduzíveis. Nenhum acesso ao Supabase hospedado.

**Decisão até o fechamento de todos os gates:** NO-GO.
