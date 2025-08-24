"""Grid paper-run bot using WebSocket price feed (Binance) + REST order manager (ccxt).

Dry-run by default: no real orders placed. Runs for a specified duration (default 24h).

Simple behavior:
- Build symmetric grid around current price (levels below are buys, above are sells).
- Simulate fills when trade prices from WebSocket cross order prices.
- On simulated fill, log and create counterpart order (sell for buy fill and vice versa) at symmetric level.

Notes: designed for testing; does not attempt to be production-grade. Uses websocket-client.
"""
import os
import json
import time
import threading
import logging
from logging.handlers import RotatingFileHandler
from decimal import Decimal, ROUND_DOWN

import ccxt
from websocket import WebSocketApp
import urllib.request
import urllib.parse

PAIR = os.getenv('PAIR', 'DOGE/USDT')
SYMBOL_WS = 'dogeusdt@trade'
LOG_FILE = 'grid_ws_paper.log'

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('grid_ws_paper')
try:
    fh = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5)
    fh.setLevel(logging.INFO)
    fh.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    logger.addHandler(fh)
except Exception:
    pass

# Telegram settings (optional)
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
TELEGRAM_ENABLED = bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)


def send_telegram(text: str):
    if not TELEGRAM_ENABLED:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = urllib.parse.urlencode({'chat_id': TELEGRAM_CHAT_ID, 'text': text}).encode()
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True
    except Exception as e:
        logger.error('Failed to send telegram message: %s', e)
        return False


class SimOrder:
    def __init__(self, side, price, amount, level_idx):
        self.side = side
        self.price = Decimal(str(price))
        self.amount = Decimal(str(amount))
        self.level_idx = level_idx
        self.id = f"sim-{side}-{level_idx}-{int(time.time()*1000)}"

    def to_dict(self):
        return {'id': self.id, 'side': self.side, 'price': str(self.price), 'amount': str(self.amount), 'level': self.level_idx}


class GridPaper:
    def __init__(self, pair='DOGE/USDT', trade_usd=1.0, spacing_pct=1.0, levels=5, duration_hours=24, dry_run=True):
        self.pair = pair
        self.base = pair.split('/')[0]
        self.quote = pair.split('/')[1]
        self.trade_usd = Decimal(str(trade_usd))
        self.spacing_pct = Decimal(str(spacing_pct)) / Decimal('100')
        self.levels = levels
        self.dry_run = dry_run
        self.duration = duration_hours * 3600
        self.start_time = time.time()

        self.exchange = ccxt.binance({'enableRateLimit': True})
        self.exchange.load_markets()
        self.market = self.exchange.markets.get(self.pair)
        self.precision = None
        self.min_amount = None
        if self.market:
            self.precision = self.market.get('precision', {}).get('amount')
            try:
                min_amount_raw = self.market.get('limits', {}).get('amount', {}).get('min')
                if min_amount_raw is not None:
                    self.min_amount = Decimal(str(min_amount_raw))
            except Exception:
                self.min_amount = None

        self.lock = threading.Lock()
        self.orders = {}  # id -> SimOrder
        self.fills = []
        self.price = None

        self.state_file = f'grid_state_{self.base}.json'

    def quant(self, amt):
        if self.precision is None:
            return amt
        try:
            q = Decimal(str(self.precision))
            return Decimal(str(amt)).quantize(q, rounding=ROUND_DOWN)
        except Exception:
            return Decimal(str(amt))

    def build_grid(self, center_price):
        # create symmetric levels around center_price
        center = Decimal(str(center_price))
        buy_levels = []
        sell_levels = []
        for i in range(1, self.levels + 1):
            factor = (Decimal('1') - self.spacing_pct * i)
            buy_price = (center * factor)
            buy_levels.append(buy_price)
            factor2 = (Decimal('1') + self.spacing_pct * i)
            sell_price = (center * factor2)
            sell_levels.append(sell_price)
        return buy_levels[::-1], sell_levels

    def place_sim_order(self, side, price, amount, level_idx):
        amount_q = self.quant(amount)
        if self.min_amount and amount_q < self.min_amount:
            amount_q = self.min_amount
        so = SimOrder(side, price, amount_q, level_idx)
        with self.lock:
            self.orders[so.id] = so
        logger.info('Placed sim order %s', so.to_dict())
        self.save_state()
        return so

    def cancel_sim_order(self, order_id):
        with self.lock:
            if order_id in self.orders:
                o = self.orders.pop(order_id)
                logger.info('Cancelled sim order %s', o.to_dict())
                self.save_state()
                return True
        return False

    def on_trade(self, trade_price, trade_qty):
        tp = Decimal(str(trade_price))
        with self.lock:
            to_fill = []
            for oid, o in list(self.orders.items()):
                if o.side == 'BUY' and tp <= o.price:
                    to_fill.append(o)
                if o.side == 'SELL' and tp >= o.price:
                    to_fill.append(o)
            for o in to_fill:
                self.orders.pop(o.id, None)
                fill = {'order': o.to_dict(), 'price': str(tp), 'qty': str(o.amount), 'ts': int(time.time())}
                self.fills.append(fill)
                logger.info('Simulated fill: %s', fill)
                # create counterpart at symmetric level (simple: mirror by level index)
                if o.side == 'BUY':
                    # place sell on same level index above center
                    # compute mirrored price: price * (1 + 2*spacing_pct*level_idx)
                    mirror_price = o.price * (Decimal('1') + self.spacing_pct * (o.level_idx * 2))
                    self.place_sim_order('SELL', mirror_price, o.amount, o.level_idx)
                else:
                    mirror_price = o.price * (Decimal('1') - self.spacing_pct * (o.level_idx * 2))
                    self.place_sim_order('BUY', mirror_price, o.amount, o.level_idx)
                self.save_state()

    def save_state(self):
        try:
            with open(self.state_file, 'w') as f:
                json.dump({'orders': {k: v.to_dict() for k, v in self.orders.items()}, 'fills': self.fills, 'price': str(self.price)}, f)
        except Exception as e:
            logger.error('Failed to save state: %s', e)

    def load_state(self):
        try:
            if os.path.exists(self.state_file):
                with open(self.state_file) as f:
                    data = json.load(f)
                    # not reconstructing SimOrder objects for simplicity
                    logger.info('Loaded existing state with %d orders and %d fills', len(data.get('orders', {})), len(data.get('fills', [])))
        except Exception as e:
            logger.error('Failed to load state: %s', e)

    def start_ws(self):
        ws_url = f"wss://stream.binance.com:9443/ws/{SYMBOL_WS}"

        def on_message(ws, message):
            try:
                obj = json.loads(message)
                p = obj.get('p') or obj.get('price')
                q = obj.get('q') or obj.get('q')
                if p is not None:
                    self.price = Decimal(str(p))
                    self.on_trade(p, q)
            except Exception:
                pass

        def on_open(ws):
            logger.info('WS opened for %s', SYMBOL_WS)

        def on_close(ws):
            logger.warning('WS closed')

        def on_error(ws, err):
            logger.error('WS error: %s', err)

        self.ws = WebSocketApp(ws_url, on_message=on_message, on_open=on_open, on_close=on_close, on_error=on_error)
        self.ws.run_forever()

    def run(self):
        # initial price
        ticker = self.exchange.fetch_ticker(self.pair)
        center_price = ticker.get('last')
        if center_price is None:
            logger.error('Cannot fetch initial price')
            return
        self.price = Decimal(str(center_price))
        logger.info('Starting paper-grid around price %s', self.price)

        # build initial grid
        buy_levels, sell_levels = self.build_grid(self.price)
        # place levels: level_idx 1..levels
        for idx, p in enumerate(buy_levels, start=1):
            amt = self.quant(self.trade_usd / Decimal(str(p)))
            self.place_sim_order('BUY', p, amt, idx)
        for idx, p in enumerate(sell_levels, start=1):
            amt = self.quant(self.trade_usd / Decimal(str(p)))
            self.place_sim_order('SELL', p, amt, idx)

        self.load_state()

        # start ws in thread
        t = threading.Thread(target=self.start_ws, daemon=True)
        t.start()

        # run main loop for duration
        while time.time() - self.start_time < self.duration:
            time.sleep(1)
        logger.info('Duration finished, exiting')
        self.save_state()


def main():
    # default params: DOGE, 1 USDT, 1% spacing, 5 levels, 24h
    g = GridPaper(pair='DOGE/USDT', trade_usd=1.0, spacing_pct=1.0, levels=5, duration_hours=24, dry_run=True)
    g.run()


if __name__ == '__main__':
    main()
