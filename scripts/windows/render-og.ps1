# Render an HTML file to a PNG using Microsoft Edge in headless mode
param(
    [Parameter(Mandatory = $true)] [string] $HtmlPath,
    [Parameter(Mandatory = $true)] [string] $OutPath,
    [int] $Width = 1200,
    [int] $Height = 630
)

$ErrorActionPreference = 'Stop'

function Find-EdgePath {
    $candidates = @()
    if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe') }
    if (${env:ProgramFiles(x86)}) { $candidates += (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe') }
    if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe') }
    foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
    # Fallback to PATH lookup
    $cmd = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
    throw "Microsoft Edge (msedge.exe) not found. Please install Edge or update the script with its path."
}

$edge = Find-EdgePath

# Ensure output directory exists
$outDir = Split-Path -Path $OutPath -Parent
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Normalize to file:/// URL for Edge
$htmlUri = "file:///" + ($HtmlPath -replace '\\','/')

Write-Host "Using Edge at: $edge"
Write-Host "Rendering $htmlUri -> $OutPath [$Width x $Height]"

& $edge --headless=new --disable-gpu "--screenshot=$OutPath" "--window-size=$Width,$Height" "$htmlUri"

# Consider success if the file exists; otherwise, if an exit code is available and non-zero, throw
if (Test-Path $OutPath) {
    Write-Host "Done: $OutPath"
    exit 0
}
elseif ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw "Edge exited with code $LASTEXITCODE and no screenshot was created at $OutPath"
}
else {
    throw "Screenshot was not created at $OutPath"
}

