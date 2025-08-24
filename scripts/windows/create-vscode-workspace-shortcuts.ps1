<#
Creates VS Code shortcuts on the Desktop for Santino and Crypto Bot workspaces.
Usage (PowerShell):
  powershell -ExecutionPolicy Bypass -File scripts/windows/create-vscode-workspace-shortcuts.ps1
#>

param(
  [string]$SantinoWorkspace,
  [string]$CryptoBotWorkspace,
  [string]$DesktopPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CodeExecutable {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft VS Code\Code.exe')
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  $cmd = Get-Command code -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw 'Не найден VS Code. Установите VS Code или добавьте `code` в PATH.'
}

function New-VSCodeShortcut([string]$workspacePath, [string]$shortcutName) {
  if (-not (Test-Path $workspacePath)) {
    throw "Workspace не найден: $workspacePath"
  }
  $codeExe = Get-CodeExecutable
  $wsDir = Split-Path -Parent $workspacePath
  $desktop = if ($DesktopPath) { $DesktopPath } else { [Environment]::GetFolderPath('Desktop') }
  if (-not (Test-Path $desktop)) { New-Item -ItemType Directory -Path $desktop -Force | Out-Null }
  $shortcutPath = Join-Path $desktop ("$shortcutName.lnk")
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($shortcutPath)
  $sc.TargetPath = $codeExe
  $sc.Arguments  = "--new-window `"$workspacePath`""
  $sc.WorkingDirectory = $wsDir
  $sc.IconLocation = "$codeExe,0"
  $sc.Description = "Открыть VS Code workspace: $shortcutName"
  $sc.Save()
  Write-Host "Создан ярлык: $shortcutPath"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
if (-not $SantinoWorkspace) { $SantinoWorkspace = Join-Path $repoRoot 'santino\santino.code-workspace' }
if (-not $CryptoBotWorkspace) { $CryptoBotWorkspace = Join-Path $repoRoot 'crypto-bot\crypto-bot.code-workspace' }

New-VSCodeShortcut -workspacePath $SantinoWorkspace -shortcutName 'Santino (VS Code)'
New-VSCodeShortcut -workspacePath $CryptoBotWorkspace -shortcutName 'Crypto Bot (VS Code)'
