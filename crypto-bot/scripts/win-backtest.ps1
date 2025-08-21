param(
  [string]$Pair = "BTC/USDT",
  [string]$Tf = "1h",
  [string]$Strategy = "crossover",
  [int]$Limit = 500
)

function Get-PythonPath {
  if (Test-Path ".venv.win/Scripts/python.exe") { return ".venv.win/Scripts/python.exe" }
  elseif (Test-Path ".venv/Scripts/python.exe") { return ".venv/Scripts/python.exe" }
  elseif (Get-Command python -ErrorAction SilentlyContinue) { return "python" }
  else { throw "Python not found. Create venv with: py -3.10 -m venv .venv" }
}

$py = Get-PythonPath
& $py -m cryptobot.engine.run_backtest --pair $Pair --tf $Tf --strategy $Strategy --limit $Limit
