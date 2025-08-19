from pydantic import BaseModel
from typing import Optional

class BotConfig(BaseModel):
    exchange: str = "binance"
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    api_password: Optional[str] = None

    pair: str = "BTC/USDT"
    timeframe: str = "1m"
    strategy: str = "crossover"

    base_order_usd: float = 50.0
    max_open_positions: int = 2
    risk_pct: float = 0.01
