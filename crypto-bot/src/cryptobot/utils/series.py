from __future__ import annotations

import numpy as np
import pandas as pd
from typing import List


def to_df(ohlcv: List[List[float]]) -> pd.DataFrame:
    cols = ["timestamp", "open", "high", "low", "close", "volume"]
    df = pd.DataFrame(ohlcv, columns=cols)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    return df.set_index("timestamp")


def sma(series: pd.Series, n: int) -> pd.Series:
    return series.rolling(n).mean()
