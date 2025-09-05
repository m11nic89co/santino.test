# Bootstrap: синхронизация репозитория и локальной среды (Windows)
# Запускается автоматом из VS Code (tasks.json) при открытии папки
# или вручную: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[autosync] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[autosync] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[autosync] $msg" -ForegroundColor Red }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Test-InGitRepo {
  try {
    git rev-parse --is-inside-work-tree 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

# 1) Проверка Git
try {
  git --version | Out-Null
} catch {
  Write-Err "Git не найден. Установите Git for Windows: https://git-scm.com/download/win"
  exit 1
}

# 2) Локальные папки/файлы
$machine = $env:COMPUTERNAME
$localRoot = Join-Path $repoRoot '.local'
$machineDir = Join-Path $localRoot $machine
if (!(Test-Path $localRoot)) { New-Item -ItemType Directory -Path $localRoot | Out-Null }
if (!(Test-Path $machineDir)) { New-Item -ItemType Directory -Path $machineDir | Out-Null; Write-Info "Создана локальная папка для машины: .local/$machine" }
$envLocal = Join-Path $repoRoot '.env.local'
if (!(Test-Path $envLocal)) { New-Item -ItemType File -Path $envLocal | Out-Null; Write-Info "Создан файл .env.local (заполните при необходимости)" }

# 3) Инициализация Git при необходимости
$insideGit = Test-InGitRepo
if (-not $insideGit) {
  Write-Info 'Инициализация Git-репозитория'
  git init | Out-Null
  # Начальный коммит, если его нет
  git add -A
  if ($LASTEXITCODE -eq 0) {
    git commit -m "chore: bootstrap autosync" 2>$null | Out-Null
  }
}
$insideGit = Test-InGitRepo

# 4) Установка путя для хуков
if ($insideGit) {
  Write-Info 'Конфигурация git core.hooksPath -> .githooks'
  & git config core.hooksPath .githooks | Out-Null
}

# 5) Приоритет GitHub: безопасная синхронизация
# Если есть origin — подтянуть изменения с fast-forward
function Get-DefaultBranch() {
  # Проверка наличия origin (подавление ошибок)
  $oldPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & git remote get-url origin 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $oldPref; return $null }
  $ref = git symbolic-ref --quiet refs/remotes/origin/HEAD 2>$null
  if ($LASTEXITCODE -eq 0 -and $ref) { return ($ref -replace '^refs/remotes/origin/','') }
  $line = git remote show origin 2>$null | Select-String 'HEAD branch:' | ForEach-Object { $_.ToString().Trim() }
  if ($line) { return ($line -replace 'HEAD branch:\s*','').Trim() }
  $ErrorActionPreference = $oldPref
  return $null
}

if ($insideGit) {
  $hasOrigin = $false
  $oldPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & git remote get-url origin 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }
  $ErrorActionPreference = $oldPref

  if ($hasOrigin) {
    Write-Info 'Получение обновлений с origin'
    git fetch --prune | Out-Null

    # Пропустить pull если есть незафиксированные изменения
    $isDirty = $false
    git diff --quiet --ignore-submodules --exit-code; if ($LASTEXITCODE -ne 0) { $isDirty = $true }
    git diff --cached --quiet --ignore-submodules --exit-code; if ($LASTEXITCODE -ne 0) { $isDirty = $true }

    $currentBranchRaw = git rev-parse --abbrev-ref HEAD 2>$null
    $currentBranch = if ($LASTEXITCODE -eq 0 -and $currentBranchRaw) { $currentBranchRaw.Trim() } else { 'HEAD' }
    $defaultBranch = Get-DefaultBranch

    if (-not $isDirty) {
      if ($currentBranch -ne 'HEAD') {
        # Настроить upstream при необходимости
        $hasUpstream = $true
        try { git rev-parse --abbrev-ref --symbolic-full-name '@{u}' | Out-Null } catch { $hasUpstream = $false }
        if (-not $hasUpstream -and $defaultBranch -and $currentBranch -eq $defaultBranch) {
          git branch --set-upstream-to "origin/$defaultBranch" | Out-Null
        }
        # Безопасный pull
        Write-Info 'Синхронизация: git pull --ff-only'
        git pull --ff-only 2>$null
        if ($LASTEXITCODE -ne 0) {
          Write-Warn 'Fast-forward невозможен (ветка разошлась). Выполните merge/rebase вручную.'
        }
      }
    } else {
      Write-Warn 'Есть незакоммиченные изменения — пропущен auto-pull. Сохраните (commit/stash), затем синхронизируйте.'
    }
  } else {
    Write-Warn 'remote "origin" не настроен.'
    try {
      $answer = Read-Host 'Добавить URL GitHub origin сейчас? (y/N)'
      if ($answer -match '^[Yy]') {
        $url = Read-Host 'Вставьте URL репозитория (ssh или https)'
        if ($url) {
          git remote add origin $url
          Write-Info "Добавлен origin: $url"
          Write-Info 'Подсказка: установите ветку по умолчанию и выполните первый push: git push -u origin <branch>'
        }
      }
    } catch {
      Write-Warn 'Не удалось добавить origin автоматически.'
    }
  }
}

Write-Info 'Готово.'
