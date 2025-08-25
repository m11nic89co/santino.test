<#
Create a zip archive of the site into ./dist/santino-offline.zip.
Excludes .git and dist itself.
#>
$destDir = Join-Path -Path (Get-Location) -ChildPath 'dist'
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

# Collect files excluding .git and dist
$items = Get-ChildItem -Path (Get-Location) -Recurse -Force | Where-Object {
    $p = $_.FullName
    -not ($p -match '\.git') -and -not ($p -match "\\dist(\\|$)")
} | Where-Object { -not $_.PSIsContainer }

$paths = $items | ForEach-Object { $_.FullName }
$zipPath = Join-Path $destDir 'santino-offline.zip'

Write-Host "Creating $zipPath (this may take a moment)..." -ForegroundColor Cyan

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

try {
    Compress-Archive -LiteralPath $paths -DestinationPath $zipPath -Force
    Write-Host "Created: $zipPath" -ForegroundColor Green
} catch {
    Write-Host "Compress-Archive failed: $_" -ForegroundColor Red
    Write-Host "Alternative: use 7zip or another archiver to zip the folder." -ForegroundColor Yellow
}
