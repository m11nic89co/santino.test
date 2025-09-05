# Import prompts from a root JSON into local storage and VS Code snippets (Windows)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-prompts.ps1 [-Source <path>]
param(
  [string]$Source = "$PSScriptRoot\..\prompts.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host "[prompts] $m" -ForegroundColor Cyan }
function Write-Warn($m){ Write-Host "[prompts] $m" -ForegroundColor Yellow }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

if (!(Test-Path $Source)) {
  Write-Warn "Файл не найден: $Source (пропуск)"
  exit 0
}

# Validate JSON
$jsonText = Get-Content -Raw -Path $Source -Encoding UTF8
try {
  $data = $jsonText | ConvertFrom-Json -ErrorAction Stop
} catch {
  Write-Warn "Некорректный JSON в $Source. ${_}"
  exit 1
}

# Local storage
$localDir = Join-Path $repoRoot '.local/copilot'
if (!(Test-Path $localDir)) { New-Item -ItemType Directory -Force -Path $localDir | Out-Null }
$localCopy = Join-Path $localDir 'prompts.json'
$jsonText | Out-File -FilePath $localCopy -Encoding UTF8 -Force
Write-Info "Сохранено локально: $localCopy"

# Generate VS Code snippets from known shapes
$snippets = @{}

function ToLines($s){ return ($s -split "`r?`n") }

# Safe property reader
function Get-Prop($obj, $name) {
  if ($null -eq $obj) { return $null }
  $prop = $obj.PSObject.Properties[$name]
  if ($null -ne $prop) { return $prop.Value }
  return $null
}

$promptsProp = Get-Prop $data 'prompts'
if ($promptsProp -is [System.Collections.IEnumerable]) {
  foreach ($p in $promptsProp) {
    $name = (Get-Prop $p 'name'); if (-not $name) { $name = (Get-Prop $p 'title') }
    $body = (Get-Prop $p 'body'); if (-not $body) { $body = (Get-Prop $p 'text') }; if (-not $body) { $body = (Get-Prop $p 'content') }
    if ($name -and $body) {
      $snippets["Prompt: $name"] = @{ prefix = @("prompt:$name"); body = ToLines([string]$body) }
    }
  }
} elseif ($data -is [System.Collections.IDictionary] -or $data -is [pscustomobject]) {
  $keys = @()
  if ($data -is [System.Collections.IDictionary]) { $keys = $data.Keys } else { $keys = $data.PSObject.Properties.Name }
  foreach ($k in $keys) {
    $v = if ($data -is [System.Collections.IDictionary]) { $data[$k] } else { (Get-Prop $data $k) }
    if ($v -is [string]) {
      $snippets["Prompt: $k"] = @{ prefix = @("prompt:$k"); body = ToLines($v) }
    } elseif ($v -is [pscustomobject] -or $v -is [System.Collections.IDictionary]) {
      $vb = (Get-Prop $v 'body'); if (-not $vb) { $vb = (Get-Prop $v 'text') }; if (-not $vb) { $vb = (Get-Prop $v 'content') }; if (-not $vb) { $vb = (Get-Prop $v 'prompt') }
      if ($vb) {
        $snippets["Prompt: $k"] = @{ prefix = @("prompt:$k"); body = ToLines([string]$vb) }
      }
    }
  }
}

# Fallback: a single snippet with the file content
if ($snippets.Count -eq 0) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($Source)
  $snippets["Prompt: $base"] = @{ prefix = @("prompt:$base"); body = ToLines($jsonText) }
}

$snippetsPath = Join-Path $repoRoot '.vscode/copilot-prompts.code-snippets'
if ($snippets.Count -gt 0) {
  if (!(Test-Path (Split-Path $snippetsPath -Parent))) { New-Item -ItemType Directory -Force -Path (Split-Path $snippetsPath -Parent) | Out-Null }
  ($snippets | ConvertTo-Json -Depth 6) | Out-File -FilePath $snippetsPath -Encoding UTF8
  Write-Info "Созданы сниппеты: $snippetsPath"
} else {
  Write-Warn 'Структура JSON не распознана для сниппетов. Файл просто сохранен локально.'
}

Write-Info 'Готово.'
