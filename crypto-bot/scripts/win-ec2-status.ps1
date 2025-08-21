param(
  [Parameter(Mandatory=$true)][string]$RemoteHost,
  [string]$RemoteUser = 'ubuntu',
  [string]$RemoteDir = '/opt/crypto-bot',
  [Parameter(Mandatory=$true)][string]$KeyPath,
  [string]$SshPath,
  [string]$ScpPath
)

$ErrorActionPreference = 'Stop'

# Resolve ssh/scp executables (prefer Git for Windows if not provided)
function Resolve-Bin([string]$Provided, [string]$Default) {
  if ($Provided -and (Test-Path $Provided)) { return $Provided }
  if ($env:ProgramFiles -and (Test-Path (Join-Path $env:ProgramFiles 'Git\usr\bin\' + $Default + '.exe'))) {
    return (Join-Path $env:ProgramFiles ('Git\usr\bin\' + $Default + '.exe'))
  }
  return $Default
}

$ssh = Resolve-Bin $SshPath 'ssh'
$scp = Resolve-Bin $ScpPath 'scp'

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$localBase = Join-Path $PSScriptRoot ("..\infra\deploy\status-" + $ts)
$null = New-Item -ItemType Directory -Force -Path $localBase

$remote = "$RemoteUser@$RemoteHost"

# Generate artifacts on remote
& $ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $remote @"
  bash -lc 'set -e; cd "$RemoteDir" || { echo MISSING_DIR >&2; exit 0; };
    {
      echo "===== DOCKER VERSION ====="; docker --version; echo;
      echo "===== COMPOSE VERSION ====="; docker compose version; echo;
      echo "===== PWD & LS ====="; pwd; ls -la; echo;
      echo "===== HEAD docker-compose.yml ====="; head -n 80 docker-compose.yml || true; echo;
      echo "===== HEAD .env ====="; head -n 80 .env || true; echo;
    } > _status.txt 2>&1;
    set +e;
    sudo docker compose build > _build.txt 2>&1;
    sudo docker compose up -d > _up.txt 2>&1;
    sudo docker compose ps > _ps.txt 2>&1;
    sudo docker compose logs --no-color --tail=200 > _logs.txt 2>&1;
    sudo docker compose ps -q cryptobot > _cid.txt 2>&1;
    CID=$(head -n1 _cid.txt 2>/dev/null);
    if [ -n "$CID" ]; then sudo docker logs --tail=200 "$CID" > _container-logs.txt 2>&1; fi;
    mkdir -p logs; if [ -f logs/cryptobot.log ]; then tail -n 200 logs/cryptobot.log > _filelog.txt 2>&1; fi;
    chmod 0644 _*.txt; echo OK'
"@

# Fetch artifacts
$files = @('_status.txt','_build.txt','_up.txt','_ps.txt','_logs.txt','_cid.txt','_container-logs.txt','_filelog.txt')
foreach ($f in $files) {
  try {
    $remoteFile = ("{0}:{1}/{2}" -f $remote, $RemoteDir, $f)
    $localFile = (Join-Path $localBase ("remote-" + $f.TrimStart('_')))
    & $scp -i $KeyPath -o StrictHostKeyChecking=accept-new $remoteFile $localFile
  } catch { }
}

Write-Host "Artifacts saved to: $localBase" -ForegroundColor Green
