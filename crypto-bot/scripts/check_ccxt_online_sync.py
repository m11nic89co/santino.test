import sys
import ccxt

def main():
    ex_id = sys.argv[1] if len(sys.argv) > 1 else 'binance'
    pair = sys.argv[2] if len(sys.argv) > 2 else 'BTC/USDT'
    tf = sys.argv[3] if len(sys.argv) > 3 else '1m'
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else 5
    ex = getattr(ccxt, ex_id)({'enableRateLimit': True, 'timeout': 10000})
    try:
        ohlcv = ex.fetch_ohlcv(pair, timeframe=tf, limit=limit)
        print('OK', ex_id, pair, tf, len(ohlcv), ohlcv[-1])
    except Exception as e:
        print('ERR', type(e).__name__, str(e))

if __name__ == '__main__':
    main()
