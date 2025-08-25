# Create a timestamped backup of the project into ./backups
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .\create_backup.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $root "backups"
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

$zipPath = Join-Path $backupDir "backup-$timestamp.zip"

# Exclude common folders that shouldn't be archived
$excludeDirs = @('backups', '.git', '.vs', 'node_modules')

# Collect files recursively, excluding directories above
$files = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    # exclude if first path segment is in exclude list
    $first = $rel -split "[/\\]" | Select-Object -First 1
    -not ($excludeDirs -contains $first)
}

if ($files.Count -eq 0) {
    Write-Output "No files found to backup."
    exit 0
}

# Use Compress-Archive on the list of files
Compress-Archive -Path ($files | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -Force

if (Test-Path $zipPath) {
    Write-Output "Backup created: $zipPath"
} else {
    Write-Error "Backup failed"
}
