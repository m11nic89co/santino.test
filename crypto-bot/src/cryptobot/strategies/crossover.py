from __future__ import annotations

from dataclasses import dataclass
import pandas as pd
from ..utils.series import sma

@dataclass
class Signal:
    side: str  # 'buy' | 'sell' | 'hold'

class CrossoverStrategy:
    def __init__(self, fast: int = 9, slow: int = 21):
        self.fast = fast
        self.slow = slow

    def generate(self, df: pd.DataFrame) -> Signal:
        f = sma(df["close"], self.fast)
        s = sma(df["close"], self.slow)
        if f.iloc[-1] > s.iloc[-1] and f.iloc[-2] <= s.iloc[-2]:
            return Signal("buy")
        if f.iloc[-1] < s.iloc[-1] and f.iloc[-2] >= s.iloc[-2]:
            return Signal("sell")
        return Signal("hold")
