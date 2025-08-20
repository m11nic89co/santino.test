param(
  [Parameter(Mandatory=$true)][string]$Remote,
  [string]$RepoPath = (Join-Path $PSScriptRoot '..' | Resolve-Path)
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $RepoPath)) { throw "RepoPath not found: $RepoPath" }

# Ensure we operate in the target repo
Set-Location -Path $RepoPath

# Initialize git repo if missing
if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
  git init -b main | Out-Null
}

# Set or add origin
if ((git remote) -contains 'origin') {
  git remote set-url origin $Remote
} else {
  git remote add origin $Remote
}

# Add everything and push current branch
$branch = (git rev-parse --abbrev-ref HEAD) 2>$null
if ([string]::IsNullOrWhiteSpace($branch)) { $branch = 'main' }

git add -A
# Allow empty in case nothing changed
try { git commit -m "chore: connect remote" } catch { }

git push -u origin $branch
Write-Host "Connected and pushed to $Remote ($branch)"
