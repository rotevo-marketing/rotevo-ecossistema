# Rotevo — auditoria local, somente leitura, do arquivo privado pg_dump.
# Nao restaura, nao conecta ao Supabase, nao altera roles ou tabelas.
# Exemplo: .\audit-private-backup-archive.ps1 -RunPath 'C:\CAMINHO_PRIVADO\rotevo-...'
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunPath)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$expectedProject='kadvzjelkyfwouqmlxaa'
$image='sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc'
$report=$null
try {
  $folder=(Resolve-Path -LiteralPath $RunPath -ErrorAction Stop).Path
  if ($folder -match '[,"]') { throw 'Caminho inadequado para montagem Docker.' }
  if ((Get-Item -LiteralPath $folder).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Pasta vinculada por link nao aceita.' }
  $dump=Join-Path $folder 'database.dump'
  $manifest=Join-Path $folder 'manifest.json'
  if (-not (Test-Path -LiteralPath $dump -PathType Leaf) -or -not (Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'Dump e manifesto devem existir na pasta especificada.' }
  if ((Get-Item -LiteralPath $dump).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Dump simbolico nao aceito.' }
  $meta=Get-Content -LiteralPath $manifest -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
  if ([string]$meta.project -ne $expectedProject) { throw 'ID do projeto nao confere.' }
  $size=(Get-Item -LiteralPath $dump).Length
  $sha=(Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($size -lt 1000 -or $size -ne [long]$meta.bytes -or $sha -ne ([string]$meta.sha256).ToLowerInvariant()) { throw 'Hash ou tamanho diverge. Nao usar este arquivo.' }
  & docker image inspect $image '--format={{.Id}}' 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Imagem PostgreSQL local validada nao esta disponivel.' }
  $mount='type=bind,source='+$folder+',target=/audit,readonly'
  # pg_restore --list NAO executa SQL nem conecta a banco.
  $toc=@(& docker run --rm --network none --mount $mount --entrypoint pg_restore $image --list /audit/database.dump 2>$null)
  if ($LASTEXITCODE -ne 0 -or $toc.Count -lt 4) { throw 'Arquivo nao passou na listagem estrutural do pg_restore.' }
  $tocItems=@($toc | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+' })
  $tables=@($tocItems | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+TABLE\s+' }).Count
  $tableData=@($tocItems | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+TABLE DATA\s+' }).Count
  $acl=@($tocItems | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+(ACL|DEFAULT ACL)\s+' }).Count
  $policies=@($tocItems | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+POLICY\s+' }).Count
  $extensions=@($tocItems | Where-Object { $_ -match '^\s*\d+;\s+\d+\s+\d+\s+EXTENSION\s+' }).Count
  $hasAuthData=[bool](@($tocItems | Where-Object { $_ -match 'TABLE DATA\s+auth\s+users\s' }).Count)
  $hasProjectsData=[bool](@($tocItems | Where-Object { $_ -match 'TABLE DATA\s+public\s+planning_projects\s' }).Count)
  $hasStorageMeta=[bool](@($tocItems | Where-Object { $_ -match 'TABLE DATA\s+storage\s+objects\s' }).Count)
  $state='ARCHIVE_LIST_PASS_RECOVERY_NOT_PROVEN'
  $report=[ordered]@{
    status=$state; project=$expectedProject; verifiedUtc=[DateTime]::UtcNow.ToString('o')
    sha256MatchesManifest=$true; sizeMatchesManifest=$true
    archiveListPassed=$true; tocItemCount=$tocItems.Count
    tableObjectCount=$tables; tableDataEntryCount=$tableData
    aclEntryCount=$acl; policyEntryCount=$policies; extensionEntryCount=$extensions
    authUsersDataListed=$hasAuthData; projectsDataListed=$hasProjectsData
    storageObjectsMetadataListed=$hasStorageMeta
    databaseRestoreVerified=$false; clusterRolesVerified=$false
    storageBytesVerifiedByThisScript=$false; hostedProjectModified=$false
    warnings=@(
     'TOC nao comprova que linhas foram restauradas nem a integridade referencial.',
     'pg_dump --format custom nao inclui automaticamente todas as roles globais, passwords e configuracoes externas.',
     'Se o restore usa --no-owner ou --no-acl, nao comprova recuperacao de owners/grants originais.',
     'Storage bytes exigem pacote privado e ensaio separado.',
     'Nao usar este PASS como autorizacao de deploy ou alteracao do banco hospedado.'
    )
  }
  $dest=Join-Path $folder 'rotevo-auditoria-arquivo-local.json'
  $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $dest -Encoding UTF8
  Write-Host ('[ROTEVO] '+$state)
  Write-Host ('[ROTEVO] Itens de catalogo: '+$tocItems.Count+' | Tabelas: '+$tables+' | Entradas de dados: '+$tableData+' | ACL: '+$acl+' | Policies: '+$policies)
  Write-Host '[ROTEVO] Relatorio privado salvo junto ao dump. Nenhum dado real foi impresso.'
  Write-Host '[ROTEVO] Restauracao continua PENDENTE.'
  exit 0
} catch {
  Write-Warning '[ROTEVO] NO-GO: auditoria interrompida. Confira os arquivos e a configuracao local. Nenhum arquivo de banco foi modificado.'
  exit 1
}
