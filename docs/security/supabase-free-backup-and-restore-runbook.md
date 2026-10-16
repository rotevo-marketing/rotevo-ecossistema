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
