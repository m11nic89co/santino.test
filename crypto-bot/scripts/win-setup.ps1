param(
	[switch]$UseAltVenv
)
# Create venv and install deps, without relying on activation (bypasses ExecutionPolicy)
$venvDir = if ($UseAltVenv) { ".venv.win" } else { ".venv" }
py -3 -m venv $venvDir
$py = (Resolve-Path (Join-Path $venvDir "Scripts/python.exe")).Path

& $py -m pip install --upgrade pip
& $py -m pip install -e .[dev]
Write-Host "Environment ready. Use python at: $py"
