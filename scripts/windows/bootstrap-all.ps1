param(
  [switch]$UseSystemPython
)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

# 1) Santino: Node deps
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js not found. Install Node 20 LTS from https://nodejs.org/ or winget.'
} else {
  Push-Location "$root\santino"
  if (Test-Path package-lock.json) { npm ci } else { npm install }
  Pop-Location
}

# 2) Crypto-bot: Python venv and deps
$py = 'python'
if (-not $UseSystemPython) {
  $py = 'py -3'
}
Push-Location "$root\crypto-bot"
if (-not (Test-Path '.venv')) { & $py -m venv .venv }
& ".venv\Scripts\python.exe" -m pip install --upgrade pip
& ".venv\Scripts\pip.exe" install -e .[dev]
Pop-Location

Write-Host 'All set on Windows.'
