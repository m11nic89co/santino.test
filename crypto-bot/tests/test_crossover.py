from cryptobot.strategies.crossover import CrossoverStrategy
import pandas as pd

def test_crossover_signals():
    data = {
        "close": [1, 1, 1, 2, 3, 2, 1, 2, 3]
    }
    idx = pd.date_range("2024-01-01", periods=len(data["close"]), freq="H", tz="UTC")
    df = pd.DataFrame(data, index=idx)

    strat = CrossoverStrategy(fast=2, slow=3)
    sig = strat.generate(df)
    assert sig.side in {"buy", "sell", "hold"}
