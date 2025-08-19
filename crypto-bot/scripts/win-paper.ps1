param(
  [string]$Pair = "BTC/USDT",
  [string]$Tf = "1m",
  [string]$Strategy = "crossover",
  [int]$Limit = 200,
  [int]$Sleep = 10
)
. .\.venv\Scripts\Activate.ps1
python -m cryptobot.engine.run_paper --pair $Pair --tf $Tf --strategy $Strategy --limit $Limit --sleep $Sleep
