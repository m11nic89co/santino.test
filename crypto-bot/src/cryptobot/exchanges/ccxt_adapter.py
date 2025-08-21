from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
import os

import ccxt.async_support as ccxt  # type: ignore

class CCXTAdapter:
    def __init__(self, exchange_id: str, api_key: Optional[str] = None, api_secret: Optional[str] = None, api_password: Optional[str] = None):
        self.exchange_id = exchange_id
        ex_class = getattr(ccxt, exchange_id)
        timeout_ms = int(os.getenv("TIMEOUT_MS", "10000"))
        cfg: Dict[str, Any] = {
            "apiKey": api_key or "",
            "secret": api_secret or "",
            "password": api_password or "",
            "enableRateLimit": True,
            "timeout": timeout_ms,
        }
        # Let aiohttp use system/.env proxies if present
        if os.getenv("AIOHTTP_TRUST_ENV", "1") == "1":
            cfg["aiohttp_trust_env"] = True
        proxy = os.getenv("AIOHTTP_PROXY") or os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")
        if proxy:
            cfg["aiohttp_proxy"] = proxy

        # Optional: default market type via env (spot/margin/linear)
        default_type = os.getenv("EXCHANGE_DEFAULT_TYPE")
        if default_type:
            cfg["options"] = {"defaultType": default_type}

        self.client = ex_class(cfg)
        # Optional: override Binance API base (helps in regions where api.binance.com is blocked)
        base = os.getenv("BINANCE_API_BASE")
        if base and exchange_id.lower() == "binance":
            try:
                if isinstance(self.client.urls.get("api"), dict):
                    for k in ["public", "private"]:
                        if k in self.client.urls["api"]:
                            self.client.urls["api"][k] = base.rstrip("/")
            except Exception:
                pass

    async def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 500) -> List[List[Any]]:
        return await self.client.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

    async def fetch_balance(self) -> Dict[str, Any]:
        return await self.client.fetch_balance()

    async def create_order(self, symbol: str, side: str, amount: float, price: Optional[float] = None, order_type: str = "market") -> Dict[str, Any]:
        return await self.client.create_order(symbol, order_type, side, amount, price)

    async def close(self):
        await self.client.close()
