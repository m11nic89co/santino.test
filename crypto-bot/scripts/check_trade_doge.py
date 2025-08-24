from decimal import Decimal, ROUND_DOWN, ROUND_UP
import sys
sys.path.insert(0, '/opt/crypto-bot')
from src.cryptobot.simple_bot import make_exchange, verify_order_amount

symbol = 'DOGE/USDT'
trade_usd = Decimal('2')
ex = make_exchange()
try:
    ex.load_markets()
except Exception as e:
    print('load_markets failed', e)
    raise
market = ex.markets.get(symbol)
if not market:
    print('market not found for', symbol)
    raise SystemExit(1)
precision = market.get('precision', {}).get('amount')
limits = market.get('limits', {})
try:
    ticker = ex.fetch_ticker(symbol)
    price = Decimal(str(ticker.get('last')))
except Exception as e:
    print('fetch_ticker failed', e)
    raise

quant = Decimal(str(precision)) if precision is not None else Decimal('0.00000001')
raw_amount = (trade_usd / price)
amount = raw_amount.quantize(quant, rounding=ROUND_DOWN)

min_amount = None
min_cost = None
try:
    min_amount_raw = limits.get('amount', {}).get('min') if isinstance(limits.get('amount', {}), dict) else limits.get('amount')
    min_cost_raw = limits.get('cost', {}).get('min') if isinstance(limits.get('cost', {}), dict) else limits.get('cost')
    if min_amount_raw is not None:
        min_amount = Decimal(str(min_amount_raw))
    if min_cost_raw is not None:
        min_cost = Decimal(str(min_cost_raw))
except Exception:
    pass

implied_min_amount = None
if min_cost is not None:
    implied_min_amount = (min_cost / price).quantize(quant, rounding=ROUND_UP)

print('price=', price)
print('precision=', precision)
print('quant=', quant)
print('raw_amount=', raw_amount)
print('quantized amount=', amount)
print('min_amount=', min_amount)
print('min_cost=', min_cost)
print('implied_min_amount=', implied_min_amount)

ok, reason = verify_order_amount(ex, symbol, amount, price=price)
print('verify_order_amount ->', ok, reason)
