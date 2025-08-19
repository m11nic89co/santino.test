from __future__ import annotations

import argparse
import asyncio
import os
from typing import Type

from dotenv import load_dotenv
from loguru import logger

from ..exchanges.ccxt_adapter import CCXTAdapter
from ..strategies.crossover import CrossoverStrategy
from ..utils.series import to_df

STRATEGIES = {
    "crossover": CrossoverStrategy,
}

async def loop_paper(args):
    load_dotenv()
    exchange = args.exchange or os.getenv("EXCHANGE", "binance")
    ex = CCXTAdapter(exchange, os.getenv("API_KEY"), os.getenv("API_SECRET"), os.getenv("API_PASSWORD"))
    try:
        while True:
            ohlcv = await ex.fetch_ohlcv(args.pair, args.tf, limit=args.limit)
            df = to_df(ohlcv)
            strat_cls: Type[CrossoverStrategy] = STRATEGIES[args.strategy]
            sig = strat_cls().generate(df)
            price = float(df["close"].iloc[-1])
            logger.info(f"Signal: {sig.side} @ {price}")
            await asyncio.sleep(args.sleep)
    finally:
        await ex.close()


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--exchange", default=None)
    p.add_argument("--pair", dest="pair", default="BTC/USDT")
    p.add_argument("--tf", dest="tf", default="1m")
    p.add_argument("--limit", type=int, default=200)
    p.add_argument("--sleep", type=int, default=10)
    p.add_argument("--strategy", default="crossover", choices=list(STRATEGIES.keys()))
    return p.parse_args()


def main():
    args = parse_args()
    asyncio.run(loop_paper(args))


if __name__ == "__main__":
    main()
