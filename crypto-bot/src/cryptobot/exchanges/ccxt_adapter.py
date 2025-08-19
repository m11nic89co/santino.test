from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import ccxt.async_support as ccxt  # type: ignore

class CCXTAdapter:
    def __init__(self, exchange_id: str, api_key: Optional[str] = None, api_secret: Optional[str] = None, api_password: Optional[str] = None):
        self.exchange_id = exchange_id
        ex_class = getattr(ccxt, exchange_id)
        self.client = ex_class({
            "apiKey": api_key or "",
            "secret": api_secret or "",
            "password": api_password or "",
            "enableRateLimit": True,
        })

    async def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 500) -> List[List[Any]]:
        return await self.client.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

    async def fetch_balance(self) -> Dict[str, Any]:
        return await self.client.fetch_balance()

    async def create_order(self, symbol: str, side: str, amount: float, price: Optional[float] = None, order_type: str = "market") -> Dict[str, Any]:
        return await self.client.create_order(symbol, order_type, side, amount, price)

    async def close(self):
        await self.client.close()
