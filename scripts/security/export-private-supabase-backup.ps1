# Requires a PRIVATE libpq service file with a [rotevo] section. Never put it in Git.
# The password is read by libpq inside a short-lived container, never a CLI argument.
[CmdletBinding()]
param(
 [Parameter(Mandatory)][string]$ServiceFile,
 [Parameter(Mandatory)][string]$BackupRoot,
 # Copy the session-pooler host from the project's Connect panel; never guess it.
 [ValidatePattern('^[a-z0-9-]+\.pooler\.supabase\.com$')][string]$ExpectedPoolerHost
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$connectionPath = (Resolve-Path -LiteralPath $ServiceFile).Path
$destination = [IO.Path]::GetFullPath($BackupRoot)
foreach ($candidate in @($connectionPath,$destination)) {
 if ($candidate.StartsWith($repoRoot,[StringComparison]::OrdinalIgnoreCase)) {
  throw 'Secrets and backups must be outside the repository.'
 }
 if ($candidate.Contains(',') -or $candidate.Contains('"')) { throw 'Unsupported mount path.' }
}
$config = Get-Content -LiteralPath $connectionPath -Raw
$expectedHost = if ($ExpectedPoolerHost) { $ExpectedPoolerHost } else { 'db.kadvzjelkyfwouqmlxaa.supabase.co' }
$expectedUser = if ($ExpectedPoolerHost) { 'postgres.kadvzjelkyfwouqmlxaa' } else { 'postgres' }
$hostPattern = '(?m)^host\s*=\s*' + [regex]::Escape($expectedHost) + '\s*$'
$userPattern = '(?m)^user\s*=\s*' + [regex]::Escape($expectedUser) + '\s*$'
if ($config -notmatch '(?m)^\[rotevo\]\s*$' -or
 $config -notmatch $hostPattern -or $config -notmatch $userPattern -or
 $config -notmatch '(?m)^port\s*=\s*5432\s*$' -or
 $config -notmatch '(?m)^dbname\s*=\s*postgres\s*$' -or
 $config -notmatch '(?m)^sslmode\s*=\s*(require|verify-ca|verify-full)\s*$') {
 throw 'Use the verified direct/session-pooler host, project user, port 5432, postgres database, SSL, and [rotevo] service.'
}
if ([regex]::Matches($config,'(?m)^\[').Count -ne 1) { throw 'Use exactly one [rotevo] service section.' }
foreach ($setting in @('host','hostaddr','port','user','dbname','sslmode','service','servicefile')) {
 $occurrences = [regex]::Matches($config,'(?m)^' + $setting + '\s*=')
 if ($occurrences.Count -gt 1 -or ($setting -in @('hostaddr','service','servicefile') -and $occurrences.Count -gt 0)) {
  throw 'Duplicate or overriding connection settings are not allowed.'
 }
}
# Fail closed if another ordinary Windows user can read the credential file.
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$allowed = @($sid.Value,'S-1-5-18','S-1-5-32-544')
foreach ($entry in (Get-Acl -LiteralPath $connectionPath).Access) {
 if ($entry.AccessControlType -eq 'Allow' -and
  $entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed) {
  throw 'Credential file has broad permissions. Restrict its Windows ACL first.'
 }
}
$runPath = Join-Path $destination ('rotevo-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ'))
New-Item -ItemType Directory -Path $runPath | Out-Null
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true,$false)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
Set-Acl -LiteralPath $runPath -AclObject $acl
if ((Get-Item -LiteralPath $runPath).Attributes -band [IO.FileAttributes]::ReparsePoint) {
 throw 'Backup destination cannot be a reparse point.'
}
# Reuse the locally verified PostgreSQL 17 image by immutable digest.
$image = 'sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc'
& docker image inspect $image --format '{{.Id}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Verified local PostgreSQL image is missing. Review and pin an installed image first.' }
$mounts = @('--mount',"type=bind,source=$connectionPath,target=/run/pg_service.conf,readonly",
 '--mount',"type=bind,source=$runPath,target=/backup")
& docker run --rm @mounts --env PGSERVICEFILE=/run/pg_service.conf --env PGSERVICE=rotevo --env PGCONNECT_TIMEOUT=20 --entrypoint pg_dump $image --format=custom --file=/backup/database.dump
if ($LASTEXITCODE -ne 0) { throw 'Backup failed. Partial archive is not a recovery point.' }
& docker run --rm @mounts --entrypoint sh $image -c 'pg_restore --list /backup/database.dump > /backup/archive.list'
if ($LASTEXITCODE -ne 0) { throw 'Archive structure check failed.' }
$archive = Join-Path $runPath 'database.dump'
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
@{project='kadvzjelkyfwouqmlxaa';createdUtc=[DateTime]::UtcNow.ToString('o');sha256=$hash;
 bytes=(Get-Item -LiteralPath $archive).Length;restoreVerified=$false;
 storageBinariesIncluded=$false;clusterRolesIncluded=$false} |
 ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'manifest.json') -Encoding utf8
Write-Output "Private archive created: $runPath"
Write-Output 'NOT RELEASED: restore into a new isolated database, verify data/Auth/RLS and archive Storage objects before migrations.'
