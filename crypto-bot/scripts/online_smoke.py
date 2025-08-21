import os, sys, json, time
from pathlib import Path

# Ensure package import
ROOT = Path(__file__).resolve().parents[1]
src = ROOT / 'src'
if str(src) not in sys.path:
    sys.path.insert(0, str(src))

from dotenv import load_dotenv  # type: ignore

load_dotenv()

exchange = os.getenv('EXCHANGE', 'binance')
pair = os.getenv('PAIR', 'BTC/USDT')
tf = os.getenv('TIMEFRAME', '1m')
limit = int(os.getenv('LIMIT', '50'))

def write_out(**data):
    out = ROOT / 'online_smoke.out.txt'
    with out.open('a', encoding='utf-8') as f:
        f.write(json.dumps({"ts": int(time.time()), **data}, ensure_ascii=False) + "\n")
    print(data)

# Try sync ccxt first (more firewall-friendly)
try:
    import ccxt  # type: ignore
    cfg = {
        'enableRateLimit': True,
        'timeout': int(os.getenv('TIMEOUT_MS', '15000')),
    }
    base = os.getenv('BINANCE_API_BASE')
    ex = getattr(ccxt, exchange)(cfg)
    if base and exchange.lower() == 'binance' and isinstance(ex.urls.get('api'), dict):
        for k in ['public', 'private']:
            if k in ex.urls['api']:
                ex.urls['api'][k] = base.rstrip('/')
    candles = ex.fetch_ohlcv(pair, timeframe=tf, limit=min(limit, 50))
    write_out(mode='sync', status='OK', exchange=exchange, pair=pair, tf=tf, n=len(candles), last=candles[-1])
except Exception as e:
    write_out(mode='sync', status='ERR', error=type(e).__name__, msg=str(e))
    # Try async as fallback
    try:
        import asyncio
        import ccxt.async_support as ccxta  # type: ignore
        async def run():
            exa = getattr(ccxta, exchange)({'enableRateLimit': True, 'timeout': int(os.getenv('TIMEOUT_MS', '15000'))})
            try:
                candles = await asyncio.wait_for(exa.fetch_ohlcv(pair, timeframe=tf, limit=min(limit, 50)), timeout=20)
                write_out(mode='async', status='OK', exchange=exchange, pair=pair, tf=tf, n=len(candles), last=candles[-1])
            finally:
                await exa.close()
        asyncio.run(run())
    except Exception as e2:
        write_out(mode='async', status='ERR', error=type(e2).__name__, msg=str(e2))
