# prepare-acme-webroot.ps1
# Usage:
#   powershell -File .\scripts\prepare-acme-webroot.ps1 -SshHost "1.2.3.4" -SshPort 22 -SshUser "ubuntu" -Domain "example.com" -SshKeyPath "C:\Users\you\.ssh\id_rsa"

param(
  [Parameter(Mandatory=$false)][string]$SshHost,
  [Parameter(Mandatory=$false)][int]$SshPort = 22,
  [Parameter(Mandatory=$false)][string]$SshUser,
  [Parameter(Mandatory=$false)][string]$Domain,
  [Parameter(Mandatory=$false)][string]$SshKeyPath = ''
)

function ReadIfEmpty([string]$v, [string]$prompt){
  if([string]::IsNullOrWhiteSpace($v)){
    return Read-Host $prompt
  }
  return $v
}

$SshHost = ReadIfEmpty $SshHost "SSH host (ip or host)"
$SshPort = [int](ReadIfEmpty $SshPort "SSH port (enter for 22)")
$SshUser = ReadIfEmpty $SshUser "SSH username"
$Domain = ReadIfEmpty $Domain "Domain to validate (must resolve to this host)"

$sshOpt = if($SshKeyPath -and (Test-Path $SshKeyPath)) { "-i `"$SshKeyPath`" -p $SshPort" } else { "-p $SshPort" }

Write-Host "`n--> Discovering likely document_root locations on remote host..." -ForegroundColor Cyan

$remoteCmd = @"
echo '--- apache sites ---'
sudo grep -R \"DocumentRoot\" /etc/apache2 2>/dev/null || true
echo '--- nginx sites ---'
sudo grep -R \"root \\\\+\" /etc/nginx 2>/dev/null || true
echo '--- default /var/www listing ---'
ls -la /var/www 2>/dev/null || true
echo '--- home dirs public_html (per-user) ---'
ls -la /home/*/public_html 2>/dev/null || true
"@

try {
  & ssh $sshOpt "$SshUser@$SshHost" "bash -lc `$'${remoteCmd}`$'"
} catch {
  Write-Host "SSH command failed. Ensure ssh client is installed and credentials work and host resolves." -ForegroundColor Red
  Write-Host "Example quick test: ssh -p $SshPort $SshUser@$SshHost" -ForegroundColor Yellow
  exit 1
}

Write-Host "`nProvide the chosen document_root path from the above output (or full path if you know it):" -ForegroundColor Cyan
$docroot = Read-Host "document_root (e.g. /var/www/example.com/public_html)"
if(-not $docroot){
  Write-Host "No document_root provided; aborting." -ForegroundColor Red
  exit 1
}

# Prepare token
$tokenName = [guid]::NewGuid().ToString()
$tokenContent = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
$localTmp = Join-Path $env:TEMP ("acme-token-$tokenName.txt")
Set-Content -Path $localTmp -Value $tokenContent -NoNewline -Encoding ascii

Write-Host "`nToken generated:" -ForegroundColor Green
Write-Host "  name: $tokenName"
Write-Host "  local file: $localTmp"
Write-Host "  remote path: $docroot/.well-known/acme-challenge/$tokenName"

# Make remote dir and upload
$mkdirCmd = "mkdir -p '$docroot/.well-known/acme-challenge' && chmod 755 '$docroot/.well-known' || true"
Write-Host "`nCreating remote directory..." -ForegroundColor Cyan
& ssh $sshOpt "$SshUser@$SshHost" $mkdirCmd

Write-Host "Uploading token file via scp..." -ForegroundColor Cyan
$remoteTarget = "${SshUser}@${SshHost}:`\"$docroot/.well-known/acme-challenge/$tokenName`\""
if($SshKeyPath -and (Test-Path $SshKeyPath)){
  & scp -i $SshKeyPath -P $SshPort $localTmp $remoteTarget
} else {
  & scp -P $SshPort $localTmp $remoteTarget
}

# Verify via HTTP
$challengeUrl = "http://$Domain/.well-known/acme-challenge/$tokenName"
Write-Host "`nWaiting 2s for the server to serve the file, then checking HTTP..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

try {
  $res = Invoke-WebRequest -Uri $challengeUrl -UseBasicParsing -Method GET -TimeoutSec 10
  if($res.StatusCode -eq 200 -and $res.Content.Trim() -eq $tokenContent){
    Write-Host "`nOK: Challenge reachable and content matches." -ForegroundColor Green
    Write-Host "URL: $challengeUrl"
  } else {
    Write-Host "`nWARN: HTTP returned $($res.StatusCode) or content mismatch. Output first 200 chars:" -ForegroundColor Yellow
    Write-Host ($res.Content.Substring(0,[math]::Min(200,$res.Content.Length)))
  }
} catch {
  Write-Host "`nERROR: HTTP check failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Make sure the domain resolves to the host and port 80 is accessible."
}

Write-Host "`nCleanup option: remove token from remote? (y/N)" -NoNewline
$ans = Read-Host
if($ans -match '^[yY]'){
  & ssh $sshOpt "$SshUser@$SshHost" "rm -f '$docroot/.well-known/acme-challenge/$tokenName'"
  Write-Host "Removed remote token."
}

Write-Host "`nNext recommended step:" -ForegroundColor Cyan
Write-Host " - If check OK: run certbot on server with webroot: sudo certbot certonly --webroot -w $docroot -d $Domain"
Write-Host " - If panel requires manual cert upload: use certbot/acme.sh to obtain certs and upload via panel."
