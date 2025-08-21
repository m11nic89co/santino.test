param(
  [string]$Exchange = "binance",
  [string]$Pair = "BTC/USDT",
  [string]$Tf = "1m",
  [string]$Strategy = "crossover",
  [int]$Limit = 200,
  [int]$Sleep = 10,
  [int]$Iterations = 0,
  [switch]$Sync,
  [int]$TimeoutSec = 10
)

function Get-PythonPath {
  if (Test-Path ".venv.win/Scripts/python.exe") { return ".venv.win/Scripts/python.exe" }
  elseif (Test-Path ".venv/Scripts/python.exe") { return ".venv/Scripts/python.exe" }
  elseif (Get-Command python -ErrorAction SilentlyContinue) { return "python" }
  else { throw "Python not found. Create venv with: py -3.10 -m venv .venv" }
}

$py = Get-PythonPath
$argsList = @(
  '-m','cryptobot.engine.run_paper',
  '--exchange', $Exchange,
  '--pair', $Pair,
  '--tf', $Tf,
  '--strategy', $Strategy,
  '--limit', $Limit,
  '--sleep', $Sleep,
  '--iterations', $Iterations,
  '--timeout', $TimeoutSec
)
if ($Sync) { $argsList += '--sync' }
& $py @argsList
