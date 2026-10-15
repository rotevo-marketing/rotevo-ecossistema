# ROTEVO | Plano de testes isolados das APIs administrativas

Status: preparação de testes, sem execução. Branch feature/admin-v2-redesign.

## Escopo verificado
- POST /api/admin/create-client-access
- POST /api/team/invite
- Ambiente: Next.js apontando EXCLUSIVAMENTE ao Supabase CLI local; identidade e dados sintéticos.
- O package.json da branch não possui test runner de integração configurado; scripts disponíveis: dev, build, start e lint.
- Os 31 testes pgTAP anteriores não exercitam endpoints HTTP e não validam as operações de service role das rotas.

## Pré-condições obrigatórias
1. Inspecionar as URLs de NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY de modo seguro, sem exibir os segredos. A URL deve ser exclusivamente local (127.0.0.1), e nunca o projeto remoto.
2. Criar servidor Next.js isolado para testes, sem reutilizar .env de produção e sem publicá-lo na Vercel.
3. Confirmar que o esquema local contém as tabelas e colunas necessárias, incluindo team_members e roles administrativas. Não reconstruir por suposição.
4. Usar emails .invalid e não enviar convites para endereços reais. Inspecionar capturador local Mailpit caso o fluxo envie e-mails.
5. O laboratório legado de quatro tabelas pode não incluir objetos requeridos para convite; validar dependências antes de executar.
6. Preparar limpeza de contas criadas no Auth local e restaurar dados de teste sem usar db reset automaticamente.

## Matriz de cenários (com resultado esperado)
### Criar acesso do cliente
- Sem Authorization: 401.
- JWT inválido: 401.
- Perfil client: 403.
- Perfil strategist: fluxo administrativo autorizado, condicionado à existência de clientId válido.
- clientId inválido/inexistente: rejeição sem criação de usuário — comportamento desejado, ainda não comprovado.
- E-mail duplicado: 409, sem novos dados inconsistentes.
- Falha no upsert de profiles após criar Auth: detectar conta órfã e definir estratégia de compensação/reconciliação.
- Não permitir que parâmetros enviados substituam role e client_id já autorizados.

### Convidar colaborador
- Ausência de configuração local: 503.
- Sem Authorization: 401.
- JWT inválido: 401.
- Usuário não admin ou inativo: 403.
- Role inválida: 400.
- Admin ativo: convite exclusivamente fictício e captura Mailpit; verificar inserção inativa em team_members.
- Falha no insert de team_members após convite: detectar e reconciliar.
- Não permitir grants de projetos/clientes via payload.

## Ordem de implementação recomendada
A. Criar suporte mínimo de execução de testes HTTP automatizados com mocks de Supabase para casos negativos, sem rede remota.
B. Executar apenas casos negativos não destrutivos.
C. Completar dependências do laboratório a partir do inventário verificado e testar integrações reais localhost.
D. Registrar resultados, corrigir vulnerabilidades e repetir testes.
E. Executar build, lint, pgTAP e regressões de UI sem deployment; agrupar prévia após lote visual aprovado.

## Restrições
Nenhuma alteração em main, app.rotevo.com.br, usuários reais, migrations remotas ou deployments. Não registrar service role key em logs, prints, arquivos versionados ou mensagens.
