from __future__ import annotations

import argparse
from typing import Type

from ..exchanges.ccxt_adapter import CCXTAdapter
from ..strategies.crossover import CrossoverStrategy
from ..utils.series import to_df

STRATEGIES = {
    "crossover": CrossoverStrategy,
}

async def main_async(args):
    ex = CCXTAdapter(args.exchange)
    try:
        ohlcv = await ex.fetch_ohlcv(args.pair, args.tf, limit=args.limit)
    finally:
        await ex.close()

    df = to_df(ohlcv)
    strat_cls: Type[CrossoverStrategy] = STRATEGIES[args.strategy]
    strat = strat_cls()

    wins = 0
    losses = 0
    position = None

    for i in range(2, len(df)):
        sub = df.iloc[: i + 1]
        sig = strat.generate(sub)
        price = float(sub["close"].iloc[-1])
        if sig.side == "buy" and position is None:
            entry = price
            position = ("long", entry)
        elif sig.side == "sell" and position and position[0] == "long":
            pnl = price - position[1]
            if pnl > 0:
                wins += 1
            else:
                losses += 1
            position = None

    print({"wins": wins, "losses": losses})


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--exchange", default="binance")
    p.add_argument("--pair", dest="pair", default="BTC/USDT")
    p.add_argument("--tf", dest="tf", default="1h")
    p.add_argument("--limit", type=int, default=500)
    p.add_argument("--strategy", default="crossover", choices=list(STRATEGIES.keys()))
    return p.parse_args()


def main():
    import asyncio

    args = parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
