param(
  [string]$Exchange = "binance",
  [string]$Pair = "BTC/USDT",
  [string]$Tf = "1m",
  [int]$Limit = 5
)

function Get-PythonPath {
  if (Test-Path ".venv.win/Scripts/python.exe") { return ".venv.win/Scripts/python.exe" }
  elseif (Test-Path ".venv/Scripts/python.exe") { return ".venv/Scripts/python.exe" }
  elseif (Get-Command python -ErrorAction SilentlyContinue) { return "python" }
  else { throw "Python not found. Create venv with: py -3 -m venv .venv" }
}

$py = Get-PythonPath

$oneLiner = "import sys,ccxt; ex_id, pair, tf, limit = sys.argv[1:5]; limit=int(limit); ex=getattr(ccxt, ex_id)({'enableRateLimit': True, 'timeout': 7000});\n" +
            "import traceback;\n" +
            "\ntry:\n o=ex.fetch_ohlcv(pair, timeframe=tf, limit=limit); print('OK:', ex_id, pair, tf, len(o), o[-1])\nexcept Exception as e:\n print('ERR:', type(e).__name__, e)"

$pyArgs = @('-c', $oneLiner, $Exchange, $Pair, $Tf, $Limit)
& $py @pyArgs
