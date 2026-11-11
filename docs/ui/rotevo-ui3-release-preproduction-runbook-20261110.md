# Rotevo UI 3.0 — Procedimento pré-produção e publicação controlada (10/11/2026)

**Status:** NO-GO para produção até todos os itens obrigatórios serem comprovados. Este documento não concede autorização para executar SQL ou promover Vercel. Não contém dados de clientes ou segredos.

## 1. Candidato técnico e fontes

- Branch atual: `release/rotevo-ui3-rc-20261110`, PR #5. A reconciliação Git foi concluída; não reiniciar conflitos já resolvidos. Congelar o SHA de implantação somente após todos os gates.
- CI integrada com Auth/PostgREST/Storage/Playwright: [42807510496](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42807510496), sete grupos aprovados em ambiente sintético.
- CI de comparação de catálogo: [42809470419](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809470419), exact parity para as 162 colunas (nomes, tipo e nullability), 36 registros de políticas (nome/comando e RLS ativo) e 15 assinaturas de funções (inclui SECURITY DEFINER). Os corpos de funções, grants, triggers, índices, defaults, owners, extensões e Auth/Storage gerenciados **não** foram comprovados idênticos.
- CI de concessões e aborto/recuperação: [42809566139](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809566139), aprovado em Postgres descartável.
- Scripts de segurança **PROPOSAL ONLY**, nunca executados no banco hospedado:
  - `docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql`
  - `docs/security/sql/ui3-editorial-rpc-hardening-PROPOSAL-ONLY.sql`

## 2. Parâmetros do banco hospedado consultados apenas no catálogo

- Schema `public`: 14 tabelas; `rotevo_finance`: 10 tabelas; 162 colunas nas duas áreas.
- Os schemas de aplicação possuem 15 funções catalogadas incluindo `rotevo_operations`. RLS ativo nas 24 tabelas; 36 linhas no inventário tabela/policy, inclusive tabelas sem policy.
- O histórico `supabase_migrations` registra oito versões. Não inferir que nomes/versões divergentes da pasta `supabase/migrations` devam ser reaplicados; isso pode causar DDL duplicado.
- `planning_projects.data`: privilégios efetivos de `SELECT` e `UPDATE` para `anon` e `authenticated` no último inventário. Não confundir RLS de linhas com privilégios por coluna.
- As RPCs de aprovação editorial hospedadas ainda usam o código anterior, sem fail-closed explícito quando o workspace não existe ou quando a troca de senha inicial está pendente. O laboratório aprovou o SQL proposto e os testes diretos de PostgREST.
- Nenhum backup real foi criado por esta homologação e nenhuma grant ou linha hospedada foi alterada.

## 3. Pré-condições obrigatórias de GO

1. **Backup externo privado, validado e restaurável**, produzido antes da primeira alteração hospedada. Consultar [Supabase Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Para instâncias sem backup automático, usar `supabase db dump` para roles, schema e dados, com armazenamento criptografado **fora** do repositório público/GitHub Actions. Nunca enviar credenciais, dumps, JWT ou dados dos clientes para issues, logs, mensagens ou artifacts públicos.
2. Validar a restauração em alvo temporário e independente. Backup lógico do Postgres não inclui os bytes do Supabase Storage: preservar também os objetos necessários, separadamente e de maneira privada. Confirmar as janelas de recuperação e impacto sobre sessões/autenticação.
3. Verificar, além do snapshot de catálogo, as definições e ACLs de funções, policies `USING/WITH CHECK`, triggers, extensões, roles e dependências aplicáveis em `public`, `rotevo_finance`, `rotevo_operations`, `auth` e `storage`. Usar diff somente de metadados, sem dados de clientes. Resolver qualquer diferença que afete autorização.
4. Preservar a reconciliação já concluída dos commits exclusivos da `main` e confirmar que o PR #5 permanece sem conflitos, sem reintroduzir componentes V2 obsoletos. Manter as evidências aprovadas de Equipe, convites, transferências, autorização e recuperação de senha; merge continua condicionado aos gates de dados e publicação.
5. Concluir avaliação manual de leitor de tela e navegação por teclado nas telas internas críticas. Para a identidade Equipe no ambiente hospedado, criar uma conta de teste adequadamente autorizada, sem alterar perfis de clientes.
6. Congelar commit do release; exigir GitHub Actions e Vercel READY para o **mesmo SHA**. Registrar o código de produção antes da promoção.

## 4. Execução hospedada condicionada a GO — troca coordenada

**Prevenção de indisponibilidade:** a UI2 publicada em `app.rotevo.com.br` ainda acessa `planning_projects.data` diretamente. Portanto, **não aplicar REVOKE enquanto qualquer instância UI2 puder receber tráfego legítimo**. O fluxo antigo «restringir grants e só depois publicar UI3» não está autorizado. Inversamente, publicar UI3 primeiro, sem controle da janela, mantém temporariamente exposta a permissão do JSON. Não existe prova de transição atômica ou sem indisponibilidade; explicitar e resolver essa janela antes do GO.

1. Registrar o inventário de grants, versão/alias efetivamente servidos por `app.rotevo.com.br`, plano de acesso e backup privado mínimo restaurável. Preservar os dois acessos de estrategista até a identidade principal estar homologada.
2. Preparar e **testar antes** uma versão de contingência UI3 com os grants restritos. Confirmar que login, edição autorizada, publicação e serviços básicos não dependem da leitura direta do JSON por `authenticated`. Não aceitar UI2 como contingência após o REVOKE.
3. Estabelecer uma janela controlada que impeça a permanência de requisições UI2 durante o corte, com proteção de tráfego, checagem de instâncias e reversão operacional ensaiadas. Se não houver mecanismo demonstrável para essa contenção, **NO-GO**, sem tentar o corte em duas etapas com tráfego livre.
4. Na janela protegida, substituir/encaminhar todo o tráfego à build UI3 homologada; **confirmar a versão efetivamente ativa e a ausência de instâncias UI2 atendendo usuários antes de executar qualquer REVOKE**. Se a promoção falhar ou o estado for incerto, abortar a mudança do banco.
5. Aplicar somente os SQLs reconciliados e aprovados para grants/RPCs/tabelas, em transações controladas, sem rodar propostas `PROPOSAL ONLY` automaticamente. Confirmar no pós-teste a negação de `data` para `anon` e `authenticated`, acesso do servidor preservado, isolamento entre clientes e operações de edição/publicação legítimas. Se a transação abortar, não declarar que a exposição antiga foi corrigida.
6. Liberar tráfego somente depois de confirmar versão UI3, testes de acesso de Estrategista/Cliente/Equipe, APIs, documentos, contratos, Storage e observabilidade. Ativar mensagens somente quando a tabela e as políticas correspondentes forem validadas.
7. Monitorar 401/403/409/503, operações de escrita e logs; manter responsáveis e forma testada de contenção. Em incidente, suspender o avanço e usar apenas um artefato compatível com grants restritos; **nunca reabrir automaticamente o JSON privado**.

Esta sequência é **proposta operacional**. A viabilidade técnica da janela protegida, a recuperação mínima e a versão de contingência ainda precisam ser comprovadas; não executar a publicação por inferência a partir deste documento.

## 5. Procedimento de falha ou rollback

- **Não restaurar grants inseguros de `planning_projects.data`** para recuperar uma tela antiga; isso reabre a exposição de JSON.
- Se o problema for exclusivamente da conversa, desligar imediatamente as duas flags de colaboração. **Não** reverter à antiga produção UI2, pois seu código acessa diretamente `planning_projects.data` e falhará após a revogação G2. Para bugs gerais da UI3, somente executar rollback a um artefato **previamente validado como compatível com os grants restritos**; na falta dele, bloquear promoção e aplicar correção para frente (fix-forward) sem reabrir permissões. Registrar e testar uma versão de contingência compatível antes da janela.
- Se o problema for de dados ou schema, suspender a promoção, preservar logs e restaurar somente com backup privado previamente ensaiado, realizando re-homologação dos grants e RPCs antes de reabrir acesso.
- O ensaio automatizado `scripts/security/pg-planning-postrelease-safe-rollback.sql` confirmou apenas a propriedade de **rollback da aplicação sem reabrir grants**, não a restauração de um backup real.

## 6. Estado do aceite

**APROVADO em laboratório:** Auth, API, Storage, Financeiro, planejamento publicado e Contratos; 7 grupos integrados; 24 tabelas/162 colunas/36 linhas de políticas/15 funções com paridade de metadados; restrição JSON e hardening de RPCs em ambiente descartável; rollback seguro de versão de aplicação.

**NÃO COMPROVADO / bloqueio:** backup privado/restauração real, equivalência integral dos corpos de funções e ACLs, avaliação manual assistiva e identidade hospedada da Equipe, reconciliação/merge da `main`, execução de grants e RPCs hospedadas e homologação no domínio final.

**Decisão:** NO-GO até os bloqueios essenciais terem evidências verificáveis. READY na prévia não autoriza uma promoção irreversível de produção.


## 7. Atualização do backup privado, 10/11/2026

O painel Supabase foi acessado por autenticação segura. Organização Free, projeto saudável, tela Scheduled backups: **Free Plan does not include project backups**. Nenhum upgrade, PITR, branch paga, reset de senha ou nova credencial foi criado. O painel confirmou que o session pooler IPv4 é gratuito. A confirmação visual do plano não é prova de backup existente.

**Storage preservado:** cópia dos três buckets por download autorizado, sem alterar nomes, conteúdo ou políticas. Inventários agregados antes/depois da cópia coincidem: 50 objetos, 27.151.977 bytes. Pacote privado fora do GitHub, criptografado com AES-256-GCM; chave em arquivo privado separado. O pacote foi decifrado e restaurado em diretório local independente, com validação de CRC e SHA-256 individual para os 50 arquivos. O utilitário de recuperação entregue também foi executado sobre o pacote real, com resultado positivo. O manifesto com chaves originais de objetos e hashes individuais fica apenas dentro do pacote criptografado.

**Limite:** esse pacote contém bytes e caminhos dos objetos, não o banco, Auth, RLS, ACLs, configurações dos buckets ou metadados do serviço. O ensaio foi de recuperação em filesystem privado, não de importação em um serviço Supabase. Ainda é obrigatório produzir e ensaiar o backup do banco antes de qualquer SQL hospedado.

**Banco bloqueado nesta sessão:** o navegador remoto alcança o Dashboard, mas o ambiente de execução não resolve os hosts de conexão direta e do session pooler verificado no painel. Não há conexão PostgreSQL privada provisionada nem ferramentas PostgreSQL/Docker disponíveis nesse ambiente. O conector SQL não exporta `pg_dump` para um arquivo privado. Nenhuma linha de cliente foi transportada por resultados SQL, logs públicos ou artifacts do GitHub como substituto de um dump completo.

O aplicativo Windows do usuário não implica acesso deste ambiente ao terminal ou disco desse Windows: os recursos nativos expostos nesta sessão são de um desktop remoto Linux. A próxima intervenção indispensável é executar a exportação privada em máquina administrativa confiável com conectividade ao projeto, usando ferramentas compatíveis com PostgreSQL 17 e credenciais locais protegidas. Não enviar senhas, connection strings ou dados do banco pelo chat; não colocar dumps em GitHub Actions público. Salvar schema/dados, owners/ACLs e definições de roles; registrar separadamente limitações de roles gerenciados/segredos e configurações externas. O script Windows existente registra `clusterRolesIncluded=false` e, sozinho, não fecha o requisito de recuperação completa. Sua listagem de archive e SHA-256 também não substituem o ensaio de restauração.

Após receber o pacote por um meio privado aprovado, restaurar em alvo isolado e verificar tabelas, integridade, identidades, funções, grants e metadados de Storage, reconciliando-os com os bytes preservados. Não restaurar sobre produção. A avaliação assistiva humana e os demais gates deste procedimento continuam obrigatórios. **NO-GO mantido.**
