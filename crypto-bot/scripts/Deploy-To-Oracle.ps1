param(
  [Parameter(Mandatory=$true)][string]$RemoteHost,
  [string]$RemoteUser = "ubuntu",
  [string]$RemoteDir = "/opt/crypto-bot",
  [string]$EnvFile = ".env",
  [string]$KeyPath,
  [string]$SshPath,
  [string]$ScpPath
)

$ErrorActionPreference = 'Stop'

function Test-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw ("Required command not found: {0}" -f $Name)
  }
}

Test-Command -Name ssh
Test-Command -Name scp

# Build base ssh/scp commands with optional identity
$sshExe = if ($SshPath -and (Test-Path $SshPath)) { $SshPath } else { 'ssh' }
$scpExe = if ($ScpPath -and (Test-Path $ScpPath)) { $ScpPath } else { 'scp' }

$sshArgs = @()
$scpArgs = @()
if ($KeyPath -and (Test-Path $KeyPath)) {
  $sshArgs += @('-i', $KeyPath)
  $scpArgs += @('-i', $KeyPath)
}

# Try to pre-accept host key via ssh-keyscan to avoid interactive prompt
$sshKeyscanExe = $null
if ($PSBoundParameters.ContainsKey('SshPath')) {
  # Try alongside provided ssh path (Git for Windows layout)
  $candidate = (Join-Path (Split-Path $SshPath) 'ssh-keyscan.exe')
  if (Test-Path $candidate) { $sshKeyscanExe = $candidate }
}
if (-not $sshKeyscanExe) {
  if (Get-Command 'ssh-keyscan' -ErrorAction SilentlyContinue) { $sshKeyscanExe = 'ssh-keyscan' }
}

if ($sshKeyscanExe) {
  try {
    $knownHosts = Join-Path $env:TEMP ("known_hosts_{0}.tmp" -f $RemoteHost)
    & $sshKeyscanExe -H $RemoteHost | Out-File -FilePath $knownHosts -Encoding ascii -Force
    $optKH = "UserKnownHostsFile=$knownHosts"
    $sshArgs += @('-o','StrictHostKeyChecking=yes','-o', $optKH)
    $scpArgs += @('-o','StrictHostKeyChecking=yes','-o', $optKH)
  } catch {
    $sshArgs += @('-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=/dev/null')
    $scpArgs += @('-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=/dev/null')
  }
} else {
  $sshArgs += @('-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=/dev/null')
  $scpArgs += @('-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=/dev/null')
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

if (-not (Test-Path $EnvFile)) { throw "Env file not found: $EnvFile" }

# Upload bootstrap and prepare server
Write-Host '[1/5] Upload bootstrap to server and run it...' -ForegroundColor Cyan
$bootstrapTarget = "{0}@{1}:/tmp/server-bootstrap.sh" -f $RemoteUser,$RemoteHost
$sshTarget = "{0}@{1}" -f $RemoteUser,$RemoteHost
& $scpExe @scpArgs "infra/deploy/server-bootstrap.sh" $bootstrapTarget
& $sshExe @sshArgs $sshTarget "bash /tmp/server-bootstrap.sh"

# Ensure target dir exists and unzip is present
Write-Host '[2/5] Ensure remote directory and tools...' -ForegroundColor Cyan
& $sshExe @sshArgs $sshTarget "sudo mkdir -p '$RemoteDir' && sudo chown -R `whoami` '$RemoteDir' && sudo apt-get update && sudo apt-get install -y unzip rsync"

# Upload .env
Write-Host '[3/5] Upload .env...' -ForegroundColor Cyan
$envTarget = "{0}@{1}:{2}/.env" -f $RemoteUser,$RemoteHost,$RemoteDir
& $scpExe @scpArgs "$EnvFile" $envTarget

# Create a zip with selected paths (avoid venv, tests, caches)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipPath = Join-Path $env:TEMP ("crypto-bot-{0}.zip" -f $timestamp)
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host '[4/5] Create and upload project archive...' -ForegroundColor Cyan
Compress-Archive -Path @(
  'Dockerfile',
  'docker-compose.yml',
  'pyproject.toml',
  'README.md',
  'ROADMAP.md',
  'src',
  'infra'
) -DestinationPath $zipPath -Force

& $scpExe @scpArgs "$zipPath" ("{0}@{1}:/tmp/crypto-bot.zip" -f $RemoteUser,$RemoteHost)

# Unpack and run docker compose
Write-Host '[5/5] Deploy and start containers...' -ForegroundColor Cyan
& $sshExe @sshArgs $sshTarget @"
  set -e
  mkdir -p "$RemoteDir"
  rm -rf "$RemoteDir/tmp" && mkdir -p "$RemoteDir/tmp"
  unzip -o /tmp/crypto-bot.zip -d "$RemoteDir/tmp"
  # Move extracted files to project root (preserve existing .env)
  rsync -a --delete --exclude '.env' "$RemoteDir/tmp/" "$RemoteDir/" || true
  rm -rf "$RemoteDir/tmp"
  cd "$RemoteDir"
  # Try with docker group in current session; fallback to sudo
  (newgrp docker <<'NG'
    set -e
    docker compose build
    docker compose up -d
    docker compose ps
NG
  ) || (
    set -e
    sudo docker compose build
    sudo docker compose up -d
    sudo docker compose ps
  )
"@

Write-Host ("Deploy complete: ssh {0}@{1} and check 'docker compose logs -f' in {2}" -f $RemoteUser,$RemoteHost,$RemoteDir) -ForegroundColor Green
