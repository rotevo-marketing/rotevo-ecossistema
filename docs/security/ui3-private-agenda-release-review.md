# Rotevo UI 3.0 | Compromissos, versão local r2

Base publicada: 9f070eb387afd718556453de78182a03cbf6980c. Sem publicação, migração, alteração OAuth ou alteração de registros reais.

## Implementação

- Preserva o formulário aprovado: criação rápida, Mais opções e Registro da reunião após salvar.
- Projetos continuam em planning_projects.data.operationalAgenda; não há conversão, cópia ou mudança dos vínculos existentes.
- Sem projeto: nova tabela rotevo_user_agendas, uma linha por usuário, com a mesma estrutura operacionalAgenda e proteção por versão.
- Não cria projetos fictícios nem registros auxiliares em projetos.
- Toda consulta e alteração privada usa o user_id autenticado, inclusive para administradores. Identidade esperada do emissor bloqueia respostas e gravações de outra sessão.
- A API autentica com o mesmo calendarAdmin existente, que exige perfil estrategista ativo. Nunca usa um proprietário fornecido pelo navegador para escolher registros.
- A tabela não possui políticas ou privilégios de acesso direto para anon/authenticated. Apenas o servidor possui SELECT/INSERT/UPDATE; sua API sempre filtra pelo proprietário.
- Não há acesso pelo Portal do Cliente. Visibilidade ao cliente e referências a tarefas de projetos são rejeitadas para compromissos privados.
- Validação de agenda e histórico de atas foram extraídos do código existente e compartilhados, preservando as regras e a autoria atribuída no servidor.
- Usa a mesma rota e algoritmo de sincronização Google. Só variam armazenamento, chave de propriedade e namespace do identificador estável. Eventos de projetos mantêm seus IDs anteriores.

## Proposta SQL para produção, validada exclusivamente em homologação

Arquivo: sql/ui3-user-agendas-PROPOSAL-ONLY.sql
SHA-256: c9239aadb4c495cbdc1a420279c902e4117b007a593536714d82316880e9e5b3

Cria somente public.rotevo_user_agendas, com user_id (PK/FK), data JSONB e updated_at. Habilita RLS; revoga permissões iniciais de public/anon/authenticated/service_role e concede somente SELECT/INSERT/UPDATE a service_role. Não acrescenta funções, gatilhos, backfills ou migrações automáticas.

A FK ON DELETE RESTRICT impede apagar uma conta que ainda possua agenda privada. Isso preserva seus registros até uma destinação explícita. Nenhuma conta ou dado existente é alterado pelo SQL.

Reversão: restaurar o código anterior e manter tabela e dados recuperáveis. É possível revogar os três privilégios do servidor para desativar a nova persistência. Não usar DROP/TRUNCATE.

A aplicação em produção depende de aprovação específica deste SQL, verificação prévia de backup/reversão e conferência posterior das estruturas e permissões. Esta revisão não autoriza deployment.

## Verificações direcionadas

- Testes de interação React/DOM isolado: agendamento sem projeto, ausência de projeto automático e de compartilhamento, gravação, sincronização explícita, convidados, rascunho em erro e edição de dados históricos.
- API privada simulada: dois usuários, identidade divergente, tentativa de proprietário falso, versão antiga, corrida de atualização/primeira inserção, preservação de ata, autoria e rejeição de compartilhamento/vínculos de tarefas.
- Google simulado, nos dois armazenamentos: criação/atualização/pull, participantes, recorrência/lembretes/Meet, reserva interrompida, sincronizações repetidas, ETag/conflitos, acesso perdido e cancelamento. Sem convites reais ou conexão com Google.
- TypeScript direcionado: componentes, nova API privada, rota de sincronização e validação compartilhada, sem erros.
- Patch consolidado validado com git apply --check contra a base publicada.

## Limites concretos

- SQL validado no ambiente separado rotevo-ui3-homologacao (tqedxahsqbskninjenfg). Verificados RLS, privilégios reais, recusa de leitura por anon/authenticated, dois proprietários sintéticos, concorrência por versão, unicidade, formato JSON e FK restritiva. Após rollback: zero linhas de agenda e zero usuários sintéticos remanescentes.
- Chromium/Edge locais não forneceram captura utilizável e não há ferramenta de navegador nesta sessão. As prévias HTML clara/escura foram atualizadas; revisão visual real permanece pendente.
- Compilação integral e integração real com Google não foram repetidas nesta etapa. OAuth permanece como publicado.

Não declarar esta versão totalmente homologada nem publicar antes de resolver as dependências aplicáveis e obter as autorizações específicas.
