# Local masked input only. This script does not change any database credential.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$StatusFile)
$ErrorActionPreference = 'Stop'
@{state='starting-private-prompt'} | ConvertTo-Json | Set-Content -LiteralPath $StatusFile -Encoding UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object Windows.Forms.Form
$form.Text = 'ROTEVO - conexao privada para backup'
$form.Size = New-Object Drawing.Size(540,245)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$label = New-Object Windows.Forms.Label
$label.Text = "Informe a NOVA senha do banco PostgreSQL do Supabase.`r`nEla sera salva localmente com acesso restrito ao seu usuario.`r`nNao sera enviada pelo chat. Nenhuma senha sera redefinida."
$label.Location = New-Object Drawing.Point(18,16)
$label.Size = New-Object Drawing.Size(495,68)
$inputBox = New-Object Windows.Forms.TextBox
$inputBox.Location = New-Object Drawing.Point(18,94)
$inputBox.Size = New-Object Drawing.Size(485,28)
$inputBox.UseSystemPasswordChar = $true
$saveButton = New-Object Windows.Forms.Button
$saveButton.Text = 'Salvar conexao privada'
$saveButton.Location = New-Object Drawing.Point(270,145)
$saveButton.Size = New-Object Drawing.Size(165,32)
$cancelButton = New-Object Windows.Forms.Button
$cancelButton.Text = 'Cancelar'
$cancelButton.Location = New-Object Drawing.Point(145,145)
$cancelButton.Size = New-Object Drawing.Size(110,32)
$cancelButton.DialogResult = 'Cancel'
$form.Controls.AddRange(@($label,$inputBox,$saveButton,$cancelButton))
$form.AcceptButton = $saveButton
$form.CancelButton = $cancelButton
$saveButton.Add_Click({
 try {
  $password = $inputBox.Text
  if ([string]::IsNullOrWhiteSpace($password) -or $password -match '[\r\n]' -or $password.Trim() -cne $password) {
   [Windows.Forms.MessageBox]::Show('Informe a senha sem espacos no inicio ou fim.','ROTEVO') | Out-Null
   return
  }
  $privateRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'rotevo-private-backups'
  if (-not (Test-Path -LiteralPath $privateRoot)) { New-Item -ItemType Directory -Path $privateRoot | Out-Null }
  if ((Get-Item -LiteralPath $privateRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Invalid private directory' }
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetOwner($sid)
  $acl.SetAccessRuleProtection($true,$false)
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
  # Windows PowerShell Set-Acl unnecessarily requests SeSecurityPrivilege here.
  # Persist only the explicitly constructed owner/DACL, without audit ACL access.
  [IO.Directory]::SetAccessControl($privateRoot,$acl)
  if (-not [IO.Directory]::GetAccessControl($privateRoot).AreAccessRulesProtected) { throw 'Private ACL not protected' }
  $privateFile = Join-Path $privateRoot ('connection-' + [Guid]::NewGuid().ToString('N') + '.conf')
  $content = "[rotevo]`nhost=aws-1-us-west-2.pooler.supabase.com`nport=5432`ndbname=postgres`nuser=postgres.kadvzjelkyfwouqmlxaa`nsslmode=require`npassword=$password`n"
  [IO.File]::WriteAllText($privateFile,$content,[Text.UTF8Encoding]::new($false))
  $inputBox.Clear()
  $password = $null
  $content = $null
  @{state='ready';serviceFile=$privateFile;poolerHost='aws-1-us-west-2.pooler.supabase.com'} | ConvertTo-Json | Set-Content -LiteralPath $StatusFile -Encoding UTF8
  $form.DialogResult = 'OK'
  $form.Close()
 } catch {
  @{state='private-save-error';errorType=$_.Exception.GetType().FullName;errorId=$_.FullyQualifiedErrorId} | ConvertTo-Json | Set-Content -LiteralPath $StatusFile -Encoding UTF8
  [Windows.Forms.MessageBox]::Show('Nao foi possivel salvar a conexao privada. Nenhuma alteracao no banco foi feita.','ROTEVO') | Out-Null
 }
})
$form.Add_Shown({$form.Activate();$inputBox.Focus()})
@{state='waiting-for-private-input'} | ConvertTo-Json | Set-Content -LiteralPath $StatusFile -Encoding UTF8
$result = $form.ShowDialog()
if ($result -ne 'OK') { @{state='cancelled'} | ConvertTo-Json | Set-Content -LiteralPath $StatusFile -Encoding UTF8 }
$inputBox.Clear()
$form.Dispose()
