# Recuperação obrigatória antes da ativação — ROTEVO

O projeto Supabase Free não possui backups automáticos. **Não rodar migrações de produção sem um arquivo privado criado e uma restauração comprovada.**

## Exportação

Em máquina administrativa confiável, instalar `pg_dump`, `pg_restore`, `psql` compatíveis com PostgreSQL 17. Obter o URI de conexão no painel Supabase, usando acesso privado (não colocar senha no repositório, histórico do shell nem mensagens). Configurar `DATABASE_URL` como segredo no ambiente e executar:

```bash
bash scripts/security/export-private-supabase-backup.sh
```

O script exporta um arquivo PostgreSQL customizado, lista seu conteúdo e calcula SHA-256 em diretório de acesso restrito. O arquivo contém dados sensíveis e não pode ser enviado ao GitHub.

## Restauração de ensaio obrigatória

1. Criar banco PostgreSQL 17 **isolado e descartável**, com extensão e papel necessários ao dump, sem acesso à produção.
2. Restaurar o dump nesse banco usando `pg_restore --dbname="$STAGING_DATABASE_URL" --no-owner --no-acl --exit-on-error /caminho/arquivo.dump`. Não apontar `STAGING_DATABASE_URL` para produção.
3. Conferir integridade (quantidades e amostras de dados sem exposição), identidades e RLS. A restauração total de `auth` e `storage` depende das permissões e de objetos externos; fazer inventário explícito.
4. Fazer cópia privada dos objetos do Storage por um método suportado. O dump PostgreSQL não inclui os binários desses arquivos.
5. Registrar data, nome privado do arquivo, hash, operador, resultado do teste de restauração e plano de rollback. **Nunca registrar senha ou conteúdo de clientes.**
6. Só então executar, em transação e sob manutenção controlada, migrações de papel staff, grants, equipe, auditoria e bootstrap administrativo. Conferir permissões reais por contas de teste e manter os flags desligados até autorização completa.

## Critério de liberação

- Cópia restaurável do banco e procedimento testado.
- Segurança das políticas legadas revisada para não conceder acesso global a staff.
- Conta de proprietário confirmada em `auth.users` e `profiles`.
- Cadastro com senha temporária, primeiro acesso, liberação de projeto e revogação testados.
- Flags ativas somente após resultados positivos.

**Observação:** a API conectada neste ambiente permite SQL e migrações, mas não oferece acesso a arquivos de backup, exportação `pg_dump` ou confirmação de restauração. Não confundir `archive_mode=on` com backup recuperável.


## Procedimento Windows, sem enviar credenciais ao ChatGPT (10/11/2026)

**Referência hospedada verificada:** projeto `kadvzjelkyfwouqmlxaa`, PostgreSQL `17.11`. Plano Free sem backup automático restaurável. Antes de aplicar `ui3-project-collaboration`, restrição de JSON privado ou novas RPCs, exige-se cópia externa e ensaio de restauração.

1. No computador administrativo com Docker Desktop, prepare um **arquivo privado do libpq** `[rotevo]` contendo conexão de **sessão** ou direta obtida em **Supabase > Connect**, com TLS, sem colar senha no console/chat. Não coloque o arquivo no repositório nem em uma pasta sincronizada pública. Restrinja ACL de leitura à conta do operador.
2. Se já tiver uma imagem PostgreSQL 17 **verificada** em cache, confira seu digest no script `scripts/security/export-private-supabase-backup.ps1`. **Não substitua por uma tag mutável às cegas.**
3. Execute em PowerShell local, passando caminhos privados (substitua os exemplos pelos caminhos do seu computador, sem publicá-los):

   ```powershell
   .\scripts\security\export-private-supabase-backup.ps1 -ServiceFile "C:\CAMINHO_PRIVADO\rotevo-service.conf" -BackupRoot "D:\BACKUPS_PRIVADOS\Rotevo"
   ```

4. O script fornece a pasta `rotevo-<UTC>` contendo `database.dump`, `archive.list` e `manifest.json` com hash SHA-256. O simples `pg_restore --list` **não** prova restaurabilidade.
5. Confira a restauração num **PostgreSQL descartável sem conexão de rede**, com:

   ```powershell
   .\scripts\security\verify-private-supabase-restore.ps1 -BackupRunDirectory "D:\BACKUPS_PRIVADOS\Rotevo\rotevo-DATA_UTC"
   ```

   O script bloqueia se o hash mudou e valida `auth.users`, `planning_projects`, `clients`; o teste é **fail-closed**. Como o dump Supabase pode depender de roles, extensões e esquemas gerenciados ausentes no PostgreSQL puro, uma falha do ensaio indica necessidade de montar um ambiente isolado compatível; **nunca ignore o erro, nunca teste restauração na produção**.

6. Preservar os **arquivos binários** do Storage separadamente. O dump só inclui os metadados. Conferir correspondência de objetos e hash com o inventário privado existente, sem expor caminhos privados.
7. Guardar o arquivo criptografado e fora do GitHub, documentando somente: UTC, hash, número de bytes, resultado de `pg_restore`, contagens agregadas e operador. Os registros técnicos não devem conter dados de clientes, credenciais ou textos de mensagens.

**Limitação dos conectores disponíveis:** a conexão Supabase deste chat permite SQL e consulta de metadata, mas não devolve um `pg_dump` privado nem transfere o arquivo a um destino externo seguro. Assim, o backup e ensaio **não podem ser declarados feitos por este chat**. O operador executa os scripts na sua máquina autorizada ou disponibiliza um ambiente remoto de execução seguro fora da conversa. Apenas depois de resultado verificável e avaliação dos demais gates se autoriza a migração.

**Conferência pré-release hospedada:**

```sql
select has_column_privilege('authenticated','public.planning_projects','data','SELECT') as unsafe_json_select,
       has_column_privilege('authenticated','public.planning_projects','data','UPDATE') as unsafe_json_update,
       to_regclass('public.project_collaboration_messages') is not null as collaboration_ready;
```

Resultado desejado para GO: `false, false, true`; o estado constatado em 10/11/2026 foi `true, true, false`. Esse diagnóstico SQL **não modifica dados**.

**Referências oficiais:** [Backups Supabase](https://supabase.com/docs/guides/platform/backups) e [Backup e restauração usando CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). O changelog da CLI v3 alterou comandos e alvos padrão, portanto confirmar versão e opções antes de substituir o procedimento revisado.
