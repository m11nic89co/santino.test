# Small helper to push current repo to GitHub using a Personal Access Token (PAT)
# Usage: run this locally in PowerShell. It will prompt for repo URL and PAT securely.
# Security note: The script temporarily adds the PAT to the remote URL to perform the push and then resets
# the remote to the clean HTTPS URL. The PAT is not logged. Run in a secure environment.

param()

function Read-Secret([string]$prompt) {
    $secure = Read-Host -AsSecureString -Prompt $prompt
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Output "Running push-with-pat.ps1 from: $(Get-Location)"
$repoUrl = Read-Host -Prompt 'Enter the HTTPS repository URL (example: https://github.com/your-username/your-repo.git)'
if (-not $repoUrl) { Write-Error 'Repository URL is required'; exit 1 }
$pat = Read-Secret 'Enter your GitHub Personal Access Token (input hidden)'
if (-not $pat) { Write-Error 'PAT is required'; exit 1 }

# normalize URL
if ($repoUrl -match '^https://') {
    $cleanUrl = $repoUrl
} else {
    Write-Error 'Please provide a full HTTPS URL starting with https://'
    exit 1
}

# create temporary remote URL with PAT (do not persist)
# encode PAT for URL usage (minimal safe encoding)
$encodedPat = [System.Uri]::EscapeDataString($pat)
$tokenUrl = $cleanUrl -replace '^https://', "https://$encodedPat@"

# backup current origin URL
$currentOrigin = ''
try { $currentOrigin = (git remote get-url origin) } catch { $currentOrigin = '' }

Write-Output "Using temporary authenticated URL to push (will not be saved to disk)."

# set a temporary remote name
$tempRemote = 'temp-push-auth'
try {
    git remote remove $tempRemote 2>$null | Out-Null
} catch {}

# add temp remote with token in URL
git remote add $tempRemote $tokenUrl
if ($LASTEXITCODE -ne 0) { Write-Error 'Failed to add temporary remote'; exit 1 }

# push
Write-Output 'Pushing branch main to origin...'
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq 'HEAD') { Write-Error 'No current branch (detached HEAD). Checkout main or a branch.'; git remote remove $tempRemote 2>$null; exit 1 }

# push to the target origin remote name (use user's origin remote name)
try {
    git push $tempRemote $branch:main -u --force
    $pushExit = $LASTEXITCODE
} catch {
    $pushExit = $LASTEXITCODE
}

# cleanup
git remote remove $tempRemote 2>$null

if ($pushExit -eq 0) {
    Write-Output 'Push successful.'
    if ($currentOrigin) { Write-Output "Current origin URL was: $currentOrigin" }
    exit 0
} else {
    Write-Error 'Push failed. Check repository URL, PAT permissions (repo scope), and network.'
    exit $pushExit
}
