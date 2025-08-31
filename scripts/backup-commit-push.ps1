param(
    [string]$RepoPath = "g:\\My Drive\\dev\\santino\\santino.test"
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $RepoPath

    $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupDir = Join-Path $RepoPath 'backups'
    if (!(Test-Path -LiteralPath $backupDir)) {
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }

    $zip = Join-Path $backupDir ("backup-" + $ts + ".zip")
    $items = Get-ChildItem -LiteralPath $RepoPath -Force | Where-Object { $_.Name -ne 'backups' -and $_.Name -ne '.git' }
    if ($items -and $items.Count -gt 0) {
        Compress-Archive -Path $items.FullName -DestinationPath $zip -Force
        Write-Host "BACKUP_OK: $zip"
    } else {
        Write-Warning 'Nothing to backup (no items found)'
    }

    & git add -A | Out-Null
    $changes = & git status --porcelain
    if ($changes) {
        & git commit -m ("backup: " + $ts) | Out-Null
    } else {
        Write-Host 'No changes to commit'
    }
    & git push
}
catch {
    Write-Error $_
    exit 1
}
finally {
    # noop
}
