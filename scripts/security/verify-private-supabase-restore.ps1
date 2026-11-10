# Rotevo | Teste privado de restauração para PostgreSQL 17
# Executar SOMENTE em computador administrativo confiável, após o backup privado.
# Este script NÃO abre conexão de rede e NÃO executa comandos no Supabase hospedado.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$BackupRunDirectory
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$path = (Resolve-Path -LiteralPath $BackupRunDirectory).Path
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($path.StartsWith($repoRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Recuperação privada deve ocorrer fora do repositório.' }
if ($path.Contains(',') -or $path.Contains('"')) { throw 'Caminho de backup incompatível com montagem Docker.' }
$archive = Join-Path $path 'database.dump'
$manifest = Join-Path $path 'manifest.json'
if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw 'database.dump não encontrado na pasta privada.' }
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'manifest.json não encontrado. Execute a exportação privada primeiro.' }
$metadata = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
if ($metadata.project -ne 'kadvzjelkyfwouqmlxaa') { throw 'Backup não pertence ao projeto Rotevo esperado.' }
$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($metadata.sha256.ToUpperInvariant() -ne $actualHash.ToUpperInvariant()) { throw 'Hash SHA-256 divergente; backup inválido.' }
# Mesma imagem local aprovada para o backup. Não baixar tags mutáveis automaticamente.
$image = 'sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc'
& docker image inspect $image --format '{{.Id}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Imagem PostgreSQL 17 local aprovada não encontrada. Não substituir sem nova revisão.' }
$name = 'rotevo-restore-' + ([guid]::NewGuid().ToString('N').Substring(0,12))
$startArgs = @('run','--detach','--rm','--network','none',
 '--name',$name,
 '--env','POSTGRES_HOST_AUTH_METHOD=trust',
 '--mount',"type=bind,source=$path,target=/backup,readonly",
 $image)
$containerId = $null
try {
 $containerId = (& docker @startArgs)
 if ($LASTEXITCODE -ne 0 -or -not $containerId) { throw 'Banco de teste descartável não iniciou.' }
 $ready = $false
 for ($i=0; $i -lt 35; $i++) {
  & docker exec $name pg_isready -U postgres -d postgres | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 1
 }
 if (-not $ready) { throw 'Banco de teste não ficou disponível.' }
 # Sem rede, sem portas publicadas e sem conexão com a Rotevo hospedada.
 & docker exec $name pg_restore --list /backup/database.dump | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'Arquivo customizado PostgreSQL inválido.' }
 & docker exec $name pg_restore --dbname=postgres --username=postgres --no-owner --no-acl --exit-on-error /backup/database.dump
 if ($LASTEXITCODE -ne 0) { throw 'Restauração completa não passou. Não liberar migrações de produção.' }
 $verification = & docker exec $name psql -U postgres -d postgres -A -t -v ON_ERROR_STOP=1 -c "select
   (select count(*) from auth.users)::text || ',' ||
   (select count(*) from public.planning_projects)::text || ',' ||
   (select count(*) from public.clients)::text;"
 if ($LASTEXITCODE -ne 0) { throw 'Validação das tabelas Auth, projetos e clientes falhou.' }
 $values = ($verification | Select-Object -Last 1).Trim()
 if ($values -notmatch '^\d+,\d+,\d+$') { throw 'Contagens de restauração ausentes ou inválidas.' }
 Write-Output 'PASS: arquivo íntegro, restauração completa executada em PostgreSQL 17 isolado e contagens de Auth, projetos e clientes verificadas.'
 Write-Output 'ATENÇÃO: essa validação não substitui auditoria de RLS, restore dos objetos Storage e plano de rollback final.'
 Write-Output "Contagens (auth,projetos,clientes): $values"
} finally {
 if ($containerId) { & docker rm --force $name 2>$null | Out-Null }
}
