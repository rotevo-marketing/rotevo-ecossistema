# ROTEVO — Protocolo de reconciliação de criação de acessos

**Escopo:** `POST /api/admin/create-client-access` na branch `feature/admin-v2-redesign`. Documento operacional para análise e testes. **Não autoriza alteração de dados reais.**

## Estados observáveis e resposta

| Estado | Resposta esperada | Conduta |
| --- | --- | --- |
| Usuário não autorizado | 401/403 | Encerrar operação. Não executar createUser. |
| Cliente de destino inexistente | 404 | Não executar createUser. Corrigir referência. |
| E-mail já cadastrado | 409 | Não sobrescrever conta existente; tratar acesso existente em fluxo próprio e auditado. |
| Criação Auth falha | Erro HTTP | Não prosseguir para perfil. Checar resultado de forma segura se houver incerteza de rede. |
| Auth informou sucesso, mas UID ausente | 500 + `reconciliationRequired: true` | Interromper tentativas; investigar possível conta órfã por e-mail no Auth. Não tentar excluir por e-mail sem prova de origem. |
| Auth criado e gravação do perfil falha | Executar compensação por UID retornado nesta requisição | Se a exclusão funcionar, sinalizar falha reversível; se falhar, marcar reconciliação obrigatória. |
| Perfil gravado | 200 + `success: true` | Registrar conclusão. Não repetir operação. |

## Roteiro restrito para operador autorizado

1. Registrar referência da requisição e horário, identificador da empresa, e-mail normalizado e status devolvido pela API; minimizar exposição de informações pessoais.
2. Confirmar a situação no Auth e em `public.profiles` **somente por interface ou consultas administrativas autorizadas e inicialmente somente leitura**.
3. Verificar evidências de que o usuário foi criado **por esta operação** antes de remover qualquer conta. Não excluir usuário pré-existente, não promover `role`, nem trocar `client_id` para disfarçar inconsistência.
4. Se houver conflito, preservar registros e encaminhar para decisão humana sobre recuperação de conta, cancelamento do acesso pendente ou recriação controlada.
5. Registrar resultado e comprovação da reversão. Exigir aprovação específica para qualquer correção manual em produção.

## Limitações conhecidas

- Criação de usuário no Auth e gravação em `profiles` não compõem transação atômica.
- O helper `compensateNewClientAccount` apenas tenta apagar o UID criado na requisição; não reconcilia contas por e-mail e não garante sucesso da exclusão.
- Uma resposta de rede inconclusiva de `createUser` merece investigação; o tratamento atual de `createError` não fornece uma rotina automática para resultados ambíguos.
- Não há fila de reconciliação persistente, trilha operacional completa ou fluxo de recuperação automática.
- Testes de contrato e mocks não substituem ensaios integrados de falha em Auth e PostgREST.
- Este documento não altera nem autoriza executar SQL em produção.

## Portão para disponibilização

Exigir: execução CI verde, testes isolados de falha/reversão, revisão de permissões e políticas do projeto real **somente leitura**, documentação de rollback e autorização explícita antes de qualquer migração ou deployment.
