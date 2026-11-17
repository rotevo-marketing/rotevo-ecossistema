# Google Calendar na Rotevo

## Configuração isolada

1. Crie ou selecione um projeto exclusivo de homologação no Google Cloud e habilite a Google Calendar API.
2. Em Google Auth Platform, preencha Branding. Para contas do mesmo Google Workspace, use público interno. Se o projeto precisar de público externo, deixe o aplicativo em teste e adicione a conta de homologação a Test users.
3. Em Clients, crie um OAuth Client ID do tipo Web application. Use `http://127.0.0.1:3000/api/admin/google-calendar/callback` para o laboratório local. Em um laboratório HTTPS com hostname dedicado, cadastre a mesma rota sob a origem exata. A URI de retorno precisa coincidir inclusive quanto ao esquema e à porta.
4. Em Data Access, selecione `openid`, `email`, `https://www.googleapis.com/auth/calendar.calendarlist.readonly`, `https://www.googleapis.com/auth/calendar.events` e `https://www.googleapis.com/auth/calendar.events.freebusy`. A tela de conexão solicita consentimento offline para renovar acessos no servidor.
5. Configure `ROTEVO_GOOGLE_CLIENT_ID`, `ROTEVO_GOOGLE_CLIENT_SECRET`, `ROTEVO_GOOGLE_OAUTH_ORIGIN` e `ROTEVO_GOOGLE_TOKEN_KEY` no servidor isolado. Use a origem sem barra final, por exemplo `http://127.0.0.1:3000`. A chave de cifragem deve conter 32 bytes aleatórios codificados em Base64. Use os canais seguros do ambiente para inserir o segredo e a chave.
6. Aplique `ui3-google-calendar-connection-PROPOSAL-ONLY.sql` ao banco descartável pelo instalador local. Defina `ROTEVO_GOOGLE_CALENDAR_ENABLED=true` no servidor e `NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED=true` antes de compilar o laboratório.
7. Entre como estrategista sintético. Em Reuniões, conecte uma conta Google de teste, confirme a conta retornada, selecione um calendário de teste, crie um intervalo no formulário existente e confira a consulta de disponibilidade. Revogue o consentimento pelo Google para validar a indicação de expiração e teste a desconexão.

A conexão mantém o token de renovação cifrado no servidor e a busca de disponibilidade devolve somente ocupado ou livre. Não vincule contas ou calendários reais ao ambiente descartável. Os fluxos de sincronização de eventos e convites exigem implementação e testes adicionais.

Referência oficial: https://developers.google.com/workspace/guides/create-credentials
