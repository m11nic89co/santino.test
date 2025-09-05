# Auto-import prompts on folder open (Windows)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'SilentlyContinue'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot
$candidates = @('prompts.json','copilot-web-app-master.ru.json') | ForEach-Object { Join-Path $repoRoot $_ }
$sel = $null
foreach ($p in $candidates) { if (Test-Path $p) { $sel = $p; break } }
if ($sel) {
  try {
    & (Join-Path $repoRoot 'scripts\import-prompts.ps1') -Source $sel -InstallUserSnippets
  } catch { }
}
