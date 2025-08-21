from __future__ import annotations

import argparse
import asyncio
import os
import time
import random
from typing import Type

from dotenv import load_dotenv
from loguru import logger
import sys

from ..exchanges.ccxt_adapter import CCXTAdapter
from ..strategies.crossover import CrossoverStrategy
from ..utils.series import to_df

STRATEGIES = {
    "crossover": CrossoverStrategy,
}

# Configure logging: keep stdout/stderr and also write to file if configured or /logs exists
log_file = os.getenv("LOG_FILE")
if not log_file and os.path.isdir("/logs"):
    log_file = "/logs/cryptobot.log"
if log_file:
    # Ensure we still log to console
    logger.add(sys.stdout, level="INFO", enqueue=True)
    try:
        logger.add(log_file, rotation="10 MB", retention="7 days", enqueue=True)
    except Exception as _:
        # If file sink fails, continue with console logging only
        pass

def _make_offline_candles(limit: int, start_ts_ms: int, start_price: float = 30000.0):
    data = []
    price = start_price
    ts = start_ts_ms - (limit * 60_000)
    for _ in range(limit):
        # simple random walk for OHLC
        change = random.uniform(-50, 50)
        o = price
        c = max(1.0, o + change)
        h = max(o, c) + random.uniform(0, 20)
        l = max(0.1, min(o, c) - random.uniform(0, 20))
        v = random.uniform(0.1, 5.0)
        data.append([ts, o, h, l, c, v])
        price = c
        ts += 60_000
    return data


async def loop_paper(args):
    load_dotenv()
    exchange = args.exchange or os.getenv("EXCHANGE", "binance")
    ex = None if args.offline else CCXTAdapter(exchange, os.getenv("API_KEY"), os.getenv("API_SECRET"), os.getenv("API_PASSWORD"))
    offline_data = None
    if args.offline:
        offline_data = _make_offline_candles(args.limit, int(time.time() * 1000))
    iter_count = 0
    try:
        while True:
            logger.info(f"Fetching {args.pair} {args.tf} (limit={args.limit}) from {exchange} offline={args.offline}")
            if args.offline:
                if not offline_data:
                    offline_data = _make_offline_candles(args.limit, int(time.time() * 1000))
                # roll forward one candle
                last_ts = offline_data[-1][0]
                last_close = offline_data[-1][4]
                change = random.uniform(-50, 50)
                o = last_close
                c = max(1.0, o + change)
                h = max(o, c) + random.uniform(0, 20)
                l = max(0.1, min(o, c) - random.uniform(0, 20))
                v = random.uniform(0.1, 5.0)
                offline_data = offline_data[1:] + [[last_ts + 60_000, o, h, l, c, v]]
                ohlcv = offline_data
            elif ex is not None and not args.sync:
                try:
                    ohlcv = await asyncio.wait_for(ex.fetch_ohlcv(args.pair, args.tf, limit=args.limit), timeout=args.timeout)
                except Exception as e:
                    logger.error(f"Failed to fetch OHLCV: {e}")
                    break
            elif args.sync:
                try:
                    import ccxt  # sync client
                    ex_sync = getattr(ccxt, exchange)({'enableRateLimit': True, 'timeout': int(args.timeout * 1000)})
                    base = os.getenv("BINANCE_API_BASE")
                    if base and exchange.lower() == "binance" and isinstance(ex_sync.urls.get("api"), dict):
                        for k in ["public", "private"]:
                            if k in ex_sync.urls["api"]:
                                ex_sync.urls["api"][k] = base.rstrip("/")
                    ohlcv = ex_sync.fetch_ohlcv(args.pair, timeframe=args.tf, limit=args.limit)
                except Exception as e:
                    logger.error(f"Failed to fetch OHLCV (sync): {e}")
                    break
            else:
                logger.error("Online mode requires an exchange client; pass --offline for synthetic data.")
                break
            df = to_df(ohlcv)
            logger.info(f"Fetched candles: {len(df)}")
            strat_cls: Type[CrossoverStrategy] = STRATEGIES[args.strategy]
            sig = strat_cls().generate(df)
            price = float(df["close"].iloc[-1])
            logger.info(f"Signal: {sig.side} @ {price}")
            await asyncio.sleep(args.sleep)
            iter_count += 1
            if args.iterations and iter_count >= args.iterations:
                break
    finally:
        if ex is not None:
            await ex.close()


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--exchange", default=None)
    p.add_argument("--pair", dest="pair", default="BTC/USDT")
    p.add_argument("--tf", dest="tf", default="1m")
    p.add_argument("--limit", type=int, default=200)
    p.add_argument("--sleep", type=int, default=10)
    p.add_argument("--strategy", default="crossover", choices=list(STRATEGIES.keys()))
    p.add_argument("--iterations", type=int, default=0, help="Stop after N iterations (0=loop forever)")
    p.add_argument("--timeout", type=float, default=15.0, help="Network timeout in seconds for data fetch")
    p.add_argument("--offline", action="store_true", help="Run without network using synthetic candles")
    p.add_argument("--sync", action="store_true", help="Use synchronous CCXT client (fallback)")
    return p.parse_args()


def main():
    args = parse_args()
    asyncio.run(loop_paper(args))


if __name__ == "__main__":
    main()
