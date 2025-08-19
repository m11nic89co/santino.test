param(
  [string]$WorkspacePath = "$PSScriptRoot\..\..\santino.code-workspace",
  [string]$ShortcutName = "Santino (Insiders)",
  [string]$VSCodePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code Insiders\Code - Insiders.exe"
)

$WorkspaceFullPath = (Resolve-Path $WorkspacePath).Path
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop ("$ShortcutName.lnk")

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $VSCodePath
$Shortcut.Arguments = "`"$WorkspaceFullPath`""
$Shortcut.IconLocation = $VSCodePath
$Shortcut.WorkingDirectory = (Split-Path $WorkspaceFullPath)
$Shortcut.Save()

Write-Host "Created shortcut: $ShortcutPath"
