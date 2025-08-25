<#
Simple serve script for Windows PowerShell.
Tries: python -m http.server, py -3 -m http.server, then npx http-server.
#>
param(
    [int]$Port = 8000
)

Write-Host "Serving site from: $(Get-Location) on http://localhost:$Port" -ForegroundColor Cyan

# Try python
$pythonCmds = @('python', 'py')
$served = $false
foreach ($cmd in $pythonCmds) {
    try {
        $ver = & $cmd --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Starting Python HTTP server using: $cmd" -ForegroundColor Green
            & $cmd -m http.server $Port
            $served = $true
            break
        }
    } catch {
        # ignore
    }
}

if (-not $served) {
    # Try npx http-server
    try {
        Write-Host "Trying npx http-server..." -ForegroundColor Yellow
        & npx http-server -p $Port
        $served = $true
    } catch {
        Write-Host "No suitable server found. Install Python or Node/npm, or run: python -m http.server 8000" -ForegroundColor Red
    }
}
