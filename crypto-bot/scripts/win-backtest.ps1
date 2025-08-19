param(
  [string]$Pair = "BTC/USDT",
  [string]$Tf = "1h",
  [string]$Strategy = "crossover",
  [int]$Limit = 500
)
. .\.venv\Scripts\Activate.ps1
python -m cryptobot.engine.run_backtest --pair $Pair --tf $Tf --strategy $Strategy --limit $Limit
