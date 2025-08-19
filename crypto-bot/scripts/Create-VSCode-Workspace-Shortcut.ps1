param(
  [string]$WorkspacePath = "$PSScriptRoot\..\crypto-bot.code-workspace",
  [string]$ShortcutName = "Crypto-Bot.code-workspace",
  [string]$VSCodePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
)

$WorkspaceFullPath = (Resolve-Path $WorkspacePath).Path
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop ("$ShortcutName.lnk")

if (-not (Test-Path $VSCodePath)) {
  $alt1 = "$env:LOCALAPPDATA\Programs\Microsoft VS Code Insiders\Code - Insiders.exe"
  $alt2 = "C:\\Program Files\\Microsoft VS Code\\Code.exe"
  if (Test-Path $alt1) { $VSCodePath = $alt1 }
  elseif (Test-Path $alt2) { $VSCodePath = $alt2 }
}

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $VSCodePath
$Shortcut.Arguments = "`"$WorkspaceFullPath`""
$Shortcut.IconLocation = $VSCodePath
$Shortcut.WorkingDirectory = (Split-Path $WorkspaceFullPath)
$Shortcut.Save()

Write-Host "Created shortcut: $ShortcutPath"
