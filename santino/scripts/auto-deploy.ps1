<#
auto-deploy.ps1
Interactive script to: install gh (optional), authenticate, create or set repo remote, push code, and optionally set GitHub Actions secrets.
Run this locally in PowerShell as your user. It will prompt for confirmation at each step and will NEVER print your PAT or private keys.

Usage: Open PowerShell, cd to project root (C:\dev\santino) and run:
  .\scripts\auto-deploy.ps1

You will be prompted several times and asked to paste PAT or confirm browser auth. Press Y/Enter to accept prompts.
#>

function Read-Secret([string]$prompt) {
    $secure = Read-Host -AsSecureString -Prompt $prompt
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Output "auto-deploy helper starting in: $(Get-Location)"

# Confirm running directory
if (-not (Test-Path .git)) {
    Write-Error 'This folder does not look like a git repository (no .git). Run the script from the project root.'
    exit 1
}

# Step 1: check gh
$ghInstalled = $false
try { if (Get-Command gh -ErrorAction SilentlyContinue) { $ghInstalled = $true } } catch {}

if ($ghInstalled) { Write-Output 'GitHub CLI (gh) is installed.' } else { Write-Output 'GitHub CLI (gh) is NOT installed.' }

# Ask user preferred auth method
Write-Output "Choose auth method:"
Write-Output "  1) Interactive GitHub CLI (recommended) — opens browser for auth (requires gh installed or will try to install)."
Write-Output "  2) HTTPS + Personal Access Token (PAT) — you will paste PAT when prompted (more manual)."
$choice = Read-Host 'Enter 1 or 2 (default 1)'
if ($choice -eq '') { $choice = '1' }

if ($choice -eq '1') {
    # Ensure gh installed
    if (-not $ghInstalled) {
        Write-Output 'Attempting to install gh via winget. You may be prompted for elevation.'
        try {
            winget install --id GitHub.cli -e --source winget -h
        } catch {
            Write-Output 'winget installation failed or winget not available. Please install gh manually from https://github.com/cli/cli/releases/latest and re-run the script.'
        }
        Start-Sleep -Seconds 2
        $ghInstalled = -not [string]::IsNullOrEmpty((Get-Command gh -ErrorAction SilentlyContinue) -as [string])
        if (-not $ghInstalled) {
            Write-Output 'gh still not available. Switch to option 2 (PAT) or install gh and run again.'
            $alt = Read-Host 'Switch to PAT flow? (y/N)'
            if ($alt -ne 'y' -and $alt -ne 'Y') { Write-Output 'Aborting.'; exit 1 } else { $choice = '2' }
        }
    }
}

if ($choice -eq '1') {
    # Use gh flow
    Write-Output 'Starting gh auth login. A browser window will open. Complete auth and return here.'
    gh auth login --hostname github.com
    Write-Output 'Check auth status:'
    gh auth status --hostname github.com

    $authCheck = $?
    if (-not $authCheck) { Write-Output 'gh auth did not complete successfully. You can try PAT flow instead.'; $usePat = Read-Host 'Switch to PAT flow? (y/N)'; if ($usePat -eq 'y') { $choice = '2' } else { Write-Output 'Aborting.'; exit 1 } }
}

# Repo creation or use existing
if ($choice -eq '1') {
    Write-Output 'Do you want me to create repository melalnik/santino in your account?'
    $create = Read-Host 'Enter Y to create repo, N to use existing remote (default N)'
    if ($create -eq 'Y' -or $create -eq 'y') {
        # create repo via gh
        gh repo create melalnik/santino --public --source . --remote origin --push
        if ($LASTEXITCODE -ne 0) { Write-Error 'Failed to create repo via gh. Check permissions.'; exit 1 }
        Write-Output 'Repository created and pushed.'
    } else {
        Write-Output 'Using existing remote origin. Showing current remote:'
        git remote -v
    Read-Host 'If remote is incorrect, update it now and press Enter to continue'
    git push -u origin main
    }
} elseif ($choice -eq '2') {
    # PAT flow
    Write-Output 'PAT flow selected.'
    $repoUrl = Read-Host 'Enter HTTPS repo URL (e.g. https://github.com/your-username/your-repo.git)'
    if (-not $repoUrl) { Write-Error 'Repo URL required for PAT flow.'; exit 1 }
    $pat = Read-Secret 'Enter your Personal Access Token (input hidden)'
    if (-not $pat) { Write-Error 'PAT required.'; exit 1 }

    # add temp remote and push
    $encoded = [System.Uri]::EscapeDataString($pat)
    $tokenUrl = $repoUrl -replace '^https://', "https://$encoded@"
    $tempRemote = 'temp-push-auth'
    try { git remote remove $tempRemote 2>$null } catch {}
    git remote add $tempRemote $tokenUrl
    if ($LASTEXITCODE -ne 0) { Write-Error 'Failed to add temporary remote. Check URL.'; exit 1 }
    $currentBranch = git rev-parse --abbrev-ref HEAD
    git push $tempRemote "$currentBranch:main" -u
    $pushOk = $LASTEXITCODE
    git remote remove $tempRemote 2>$null
    if ($pushOk -ne 0) { Write-Error 'Push failed. Check PAT permissions (repo scope), repo URL, and network.'; exit $pushOk }
    Write-Output 'Push successful via PAT.'
}

# Optional: set secrets
$doSecrets = Read-Host 'Do you want me to set SFTP secrets in the repo (requires gh and repo present)? (y/N)'
if ($doSecrets -eq 'y' -or $doSecrets -eq 'Y') {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Write-Error 'gh not available; cannot set secrets automatically.'; exit 1 }
    $repo = Read-Host 'Enter repository full name (owner/repo), e.g. melalnik/santino'
    if (-not $repo) { Write-Error 'Repository name required'; exit 1 }
    $sftpHost = Read-Host 'SFTP_HOST'
    $sftpUser = Read-Host 'SFTP_USER'
    $sftpPort = Read-Host 'SFTP_PORT (default 22)'
    if (-not $sftpPort) { $sftpPort = '22' }
    $remoteDir = Read-Host 'DEPLOY_REMOTE_DIR (e.g. /www/santino.com.ru/beta)'
    $useKey = Read-Host 'Use private key (y) or password (n)? (default y)'
    if ($useKey -eq 'y' -or $useKey -eq 'Y') {
        $keyPath = Read-Host 'Enter full path to private key file on disk (e.g. C:\temp\deploy_key)'
        if (-not (Test-Path $keyPath)) { Write-Error 'Key file not found'; exit 1 }
        $key = Get-Content -Raw $keyPath
        gh secret set SFTP_PRIVATE_KEY --body "$key" --repo $repo
    } else {
        $sftpPassword = Read-Secret 'Enter SFTP password (hidden)'
        gh secret set SFTP_PASSWORD --body "$sftpPassword" --repo $repo
    }
    gh secret set SFTP_HOST --body "$sftpHost" --repo $repo
    gh secret set SFTP_USER --body "$sftpUser" --repo $repo
    gh secret set SFTP_PORT --body "$sftpPort" --repo $repo
    gh secret set DEPLOY_REMOTE_DIR --body "$remoteDir" --repo $repo
    Write-Output 'Secrets set.'
}

Write-Output 'auto-deploy finished.'
