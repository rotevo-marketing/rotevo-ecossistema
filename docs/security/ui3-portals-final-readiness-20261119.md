# Parecer final pré-publicação dos Portais dos Clientes

Data: 19/11/2026. Base analisada: `f209f3fb426e97435883ccb9c28df24197a32946`, branch `fix/client-portals-mirroring-20261118`.

**Parecer: prontidão parcial. Não liberar a publicação enquanto o build com dependências exatas e a homologação visual/autenticada permanecerem pendentes.** A validação de SQL e RLS avançou para execução real em Postgres isolado. Nenhuma alteração foi aplicada à produção.

## Correção indispensável encontrada na homologação

O primeiro ensaio detectou erro de sintaxe: faltava `;` depois de sete fechamentos `$function$`, tanto na proposta de estruturas como no arquivo de rollback. A transação do ensaio foi revertida. Foram corrigidos apenas os 14 terminadores, sem alterar corpos, decisões, permissões ou assinaturas das funções. Nenhum componente da aplicação foi reconstruído.

Os SQLs do commit-base f209f3f não devem ser usados para implantação. O novo candidato contém essa correção e as evidências abaixo. Os hashes deste parecer substituem, para esses dois arquivos, os hashes históricos do relatório anterior.

## Validações aprovadas

### Postgres real em ambiente isolado

Foi utilizado o projeto já existente `rotevo-ui3-homologacao` (`tqedxahsqbskninjenfg`), Postgres 17, sem criar projeto ou serviço pago. Os ensaios criaram três schemas exclusivos com nomes `rtp_final_*_20261119`, copiaram apenas definições de tabelas e inseriram dados sintéticos. Nenhum registro de Auth, cliente, projeto ou conversa existente foi copiado ou alterado.

Os scripts foram adaptados exclusivamente por troca dos namespaces `public`, `auth` e `rotevo_workflow` pelos namespaces do laboratório. Foram mantidos os corpos das propostas. As funções de identidade receberam claims controladas para os testes; não foram criados usuários reais do Supabase Auth.

O laboratório aplicou e reaplicou as propostas, compilando as 11 rotinas. Executou 121 grupos de instruções e verificações, incluindo:

- Cinco clientes sintéticos com SELECT restrito ao próprio projeto por RLS.
- UPDATE de tarefas pelo cliente recusado pela política, inclusive quando o laboratório concedia grant temporário para exercitar a RLS. Após isso, o grant de acesso bruto foi revogado e o SELECT direto também foi recusado.
- Acesso cruzado a atribuições recusado; clientes não puderam atribuir tarefas ou chamar a consulta administrativa. Equipe sem atribuição G2 também foi recusada.
- Função de provisionamento inacessível a `authenticated`/`anon`, permitida somente ao serviço e impedindo reatribuição de identidade já vinculada a outro cliente.
- Responsabilidade formal, entrega por Drive e validação utilizando o mesmo ID; repetição da liberação e da entrega sem registros duplicados.
- Notificação de mensagem bilateral chegando somente ao cliente correspondente; contador, revogação do piloto e entrada de novo cliente com vínculo e inscrição consistentes.
- Reaplicação de regularização sem duplicações e manutenção do JSON original das tarefas/projetos.
- Execução do rollback corrigido, mantendo atribuição e dados existentes no laboratório.

Um segundo ensaio, dirigido apenas à regularização, comprovou:

- Associação contraditória interrompe o processo sem gravações parciais.
- Chaves estrangeiras recusam usuário ou cliente inexistente.
- Repetição gera apenas um vínculo por par cliente/usuário.
- Cliente com situação `paused` não é inscrito. A primeira fixture usou `inactive`, rejeitada corretamente pelo CHECK existente; foi ajustada para o estado válido sem alterar o script de regularização.
- Perfis e identidades sintéticos originais permanecem presentes, sem recriação.

Ambos os ensaios concluíram com sucesso. Todos os schemas de teste foram removidos ao final, e sua ausência foi confirmada por consulta. Foram registrados somente os históricos das duas migrações de ensaio no projeto de homologação: `portal_final_disposable_validation_20261119_r1` e `portal_association_negative_disposable_validation_20261119_r1`.

**Limite da evidência:** RLS, grants e funções foram exercitados no Postgres real, em cópias isoladas dos objetos e com claims simuladas. Isso não equivale a login real pelo Supabase Auth, navegação autenticada ou homologação ponta a ponta das APIs HTTP de produção.

### Preservação e revisão

- Os 66 testes aprovados foram preservados, sem repetição. Os ensaios novos tratam exclusivamente das pendências SQL.
- Na produção, consulta somente de leitura confirmou **18 tarefas ativas e 18 IDs distintos** no projeto da Elania. Não houve escrita, exclusão ou conversão dessas tarefas em atribuições.
- A projeção mantém a mesma fonte de dados, sem gravar cópias. O cliente recebe apenas campos permitidos; notas, checklist interno, logs e descrições antes privadas continuam fora da projeção. A exceção confidencial permanece auditada.
- Não há triggers personalizados em `client_users` ou `notification_pilot_users` que acrescentem efeitos ao script de regularização. A inscrição/reativação no piloto é o efeito deliberado do segundo INSERT e exige aprovação de público.
- Foram confirmados, somente por catálogo, os triggers existentes de mensagens, atribuições, entrega e revisão. Não foram reinstalados nem disparados com dados reais.
- `package.json`, lockfile, componentes, credenciais, Secrets, `vercel.json` e configurações de produção permaneceram inalterados nesta etapa.

## Build e homologação visual

| Pendência | Tentativa/evidência | Situação |
|---|---|---|
| Dependências exatas | Consulta do Next 16.4.6 falhou com `ENOTFOUND registry.npmjs.org` | Bloqueada por DNS do terminal |
| Instalação offline do lockfile | `npm ci --offline` em diretório novo, separado do checkout; faltou `zod-validation-error@4.0.2` no cache (`ENOTCACHED`) | Bloqueada por cache incompleto |
| Build de produção exato | Não foi usado o Next 16.4.2 disponível como substituto do 16.4.6 exigido | Não confirmado |
| Docker local | Pipe `dockerDesktopLinuxEngine` recusou acesso por permissão | Não utilizado; SQL testado no projeto isolado existente |
| Navegador autenticado | Não há ferramenta de navegador interativo/automação disponível nesta execução | Homologação visual não realizada |

A instalação offline não alterou as dependências do checkout. O diretório de tentativa permanece isolado e fora do versionamento; não foram feitos reparos de permissões, mudanças de DNS do sistema ou acesso a backups privados.

| Portal | SQL/RLS com cliente sintético equivalente | Evidências anteriores de API/JSDOM | Visual autenticado claro/escuro/mobile |
|---|---|---|---|
| R. Rubim Consultoria Ltda. | Aprovado | Preservadas | Pendente |
| Piffer Desenvolvimento Pessoal ME | Aprovado | Preservadas | Pendente |
| Flávia Benetele | Aprovado | Preservadas | Pendente |
| Jackson Bruno Psicologia | Aprovado | Preservadas | Pendente |
| Ana Paula Santiago | Aprovado | Preservadas | Pendente |

Não houve simulação de login real nem captura de tela apresentada como homologação autenticada. As alternativas disponíveis foram a revisão dos componentes, os resultados de API/JSDOM já aprovados e os ensaios novos de Postgres. O acesso no computador da Elania continua dependendo da reprodução descrita no relatório anterior; não foi declarado resolvido.

## Notificações: condições para expansão

São necessárias simultaneamente:

1. Perfil cliente, `profiles.client_id` e `client_users` coerentes, cliente ativo e módulos correspondentes habilitados.
2. Inscrição individual habilitada em `notification_pilot_users` e RPCs instaladas com as permissões revisadas.
3. `ROTEVO_NOTIFICATIONS_ENABLED=true` e `NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED=true`; para o fluxo formal, manter também as flags de atribuições e comunicação.
4. `ROTEVO_NOTIFICATIONS_AUDIENCE=enabled_clients` na configuração de Production usada pelo único build final. Equipe/piloto preservam a allowlist adicional existente.
5. Eventos produzidos pelos fluxos autorizados; visibilidade operacional não cria responsabilidade formal nem evento fictício.

A consulta de metadados da Vercel, sem descriptografar Secrets, confirmou a presença das flags de Production de notificações, atribuições e comunicação, além do Secret da allowlist. A variável `ROTEVO_NOTIFICATIONS_AUDIENCE` não está cadastrada; o candidato, sem ela, mantém o padrão `pilot`. A presença das demais variáveis não é certificação de seus valores; conferir os valores não sigilosos na preparação autorizada do release.

O script de regularização inscreve todos os perfis clientes de empresas ativas e pode reativar um piloto anteriormente desabilitado. Isso é uma expansão explícita de público, não um efeito a executar sem aprovação. A idempotência é de resultado: o `ON CONFLICT DO UPDATE` pode reescrever `enabled=true`, sem criar duplicatas. Novos acessos passam pelo provisionamento transacional e são inscritos somente quando o modo aprovado estiver ativo.

## Alterações que exigem autorização específica em produção

- Instalar o SQL corrigido de estruturas: quatro funções novas e adequação de sete existentes. Sem criar tabelas operacionais ou migrar conteúdos.
- Regularizar os vínculos ausentes e aprovar a lista exata de clientes para expansão do piloto, preservando os vínculos válidos.
- Cadastrar o modo `enabled_clients` e confirmar as flags de Production. Não revelar ou substituir a allowlist sensível.
- Realizar o único deployment manual, somente depois da conclusão das verificações pendentes e da aprovação expressa.

## Sequência segura de implantação e rollback

1. **Prontidão:** concluir instalação/build exatos em ambiente com acesso ao npm/fontes e realizar a navegação autenticada dos cinco portais. Revalidar o HEAD candidato. Não contornar esses bloqueios com preview/deployment da Vercel.
2. **Recuperação e preflight:** na janela autorizada, confirmar ponto de recuperação atual, guardar snapshot privado das definições/ACL e dos vínculos/estados do piloto. Conferir os registros afetados e interromper se houver conflito ou drift. Não repetir ensaio de restauração já aprovado sem necessidade.
3. **Banco:** aplicar exclusivamente os arquivos corrigidos e aprovados. Validar funções, grants e vínculos. A expansão de público do banco deve estar expressamente incluída na autorização; ela não publica tarefas como responsabilidades nem conteúdos estratégicos.
4. **Configuração:** preparar `ROTEVO_NOTIFICATIONS_AUDIENCE=enabled_clients` e flags aprovadas **antes** do único deployment, pois variáveis de ambiente da Vercel são vinculadas ao deployment. Não planejar uma alteração de ambiente posterior que exija um segundo deployment para ativação.
5. **Aplicação:** após autorização, disponibilizar o commit na branch de produção existente por avanço seguro, mantendo `git.deploymentEnabled=false`. Pelo painel Vercel, projeto `rotevo-ecossistema` → Deployments → Create Deployment, informar o SHA aprovado e conferir destino Production. Não criar preview intermediário.
6. **Notificações e verificação:** com READY, conferir SHA e domínio, tarefas somente de leitura, ausência de duplicações, isolamento, contador e leitura das notificações. O código anterior continua com a allowlist até sua substituição; o novo público torna-se acessível pela nova API apenas no deployment aprovado. Usar somente cenário sintético autorizado, sem disparar responsabilidades ou mensagens artificiais a clientes reais.
7. **Rollback:** promover o deployment anterior `dpl_EvYz522ucWob8dDQLD3gPkEbv1jG`, restaurar as sete funções pelo rollback corrigido e repor configurações futuras/estados de piloto a partir do snapshot conferido. Preservar vínculos válidos e registros operacionais; para novas inscrições revertidas, desabilitar a elegibilidade sem apagar notificações, mensagens ou usuários. As tarefas novas mantêm o flag legado fechado para proteger descrições internas no código antigo; seu acompanhamento pode ficar temporariamente indisponível, sem perda de dados. Não tocar nos domínios do Método EPC.

## Riscos residuais e conclusão

O maior risco pendente é publicar sem um build das dependências aprovadas e sem navegação autenticada dos portais. Também falta a conferência do esquema/ACL de produção na janela final, pois o laboratório usa namespaces e claims de teste. A expansão do piloto precisa aprovar explicitamente eventuais reativações. Esses pontos impedem declarar homologação integral.

**Deployments e builds remotos na Vercel nesta etapa: zero. Produção permanece no commit 27c1681 e no deployment anterior READY.** O candidato novo muda apenas terminadores SQL e acrescenta evidências/harness de homologação. A publicação não foi executada e continua pendente de autorização.

## SHA-256 dos SQLs desta homologação

- `ui3-portal-standardization-structures-PROPOSAL-ONLY.sql`: `482af141c2175e6feebcccacb246820f085f05b4d9559e3764358779c625977a`
- `ui3-portal-standardization-functions-ROLLBACK-ONLY.sql`: `a2cc5d2e7fa00e7f752089f71accde73e84e920790d1d90d2f4b9ea585fcd048`
- `ui3-portal-standardization-associations-PROPOSAL-ONLY.sql`: `dc933ac6d5809af83f196f4be7097e50e4b56598baa476e87d2aa6011145e569`
