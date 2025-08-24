"""
Простой, безопасный бот-скрипт для Binance.
- Берёт API_KEY/API_SECRET из .env
- Делает проверки: баланс, текущая цена
- Имитирует торговое решение (тут очень простая логика)
- По умолчанию только симуляция (dry run). Для реального ордера запустить с --live

ВАЖНО:
- Рекомендуется использовать субаккаунт с минимальными правами.
- По умолчанию скрипт НЕ размещает реальные ордера (без --live).
"""

import os
import argparse
import time
import logging
from logging.handlers import RotatingFileHandler
from decimal import Decimal, ROUND_DOWN, ROUND_UP

import ccxt
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('simple_bot')
# File logging (rotating)
try:
    fh = RotatingFileHandler('simple_bot.log', maxBytes=5 * 1024 * 1024, backupCount=5)
    fh.setLevel(logging.INFO)
    fh.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    logger.addHandler(fh)
except Exception:
    # If file logging can't be setup (permissions etc.) continue with console only
    pass

# Load .env
load_dotenv()

API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
EXCHANGE_NAME = os.getenv('EXCHANGE', 'binance')
PAIR = os.getenv('PAIR', 'BTC/USDT')
TRADE_USD = Decimal(os.getenv('BASE_ORDER_USD', '10'))  # сколько USD тратить в одной сделке (симуляция)

if not API_KEY or not API_SECRET:
    logger.warning('API_KEY/API_SECRET не найдены в .env — скрипт будет работать в режиме только-чтения (только баланс/цена).')


def make_exchange():
    kwargs = {
        'enableRateLimit': True,
        'options': {
            'defaultType': 'spot'
        }
    }
    # Поддержка переопределения базового URL (например, testnet) через BINANCE_API_BASE
    base = os.getenv('BINANCE_API_BASE')
    if base:
        kwargs['urls'] = {'api': base}
        logger.info('Используется нестандартный BASE API: %s', base)

    if API_KEY and API_SECRET:
        kwargs['apiKey'] = API_KEY
        kwargs['secret'] = API_SECRET

    exch = getattr(ccxt, EXCHANGE_NAME)(kwargs)
    return exch


def fetch_balance(exchange):
    try:
        bal = exchange.fetch_balance()
        return bal
    except Exception as e:
        logger.error('Не удалось получить баланс: %s', e)
        return None


def fetch_price(exchange, symbol):
    try:
        ticker = exchange.fetch_ticker(symbol)
        price = Decimal(str(ticker['last']))
        return price
    except Exception as e:
        logger.error('Не удалось получить цену %s: %s', symbol, e)
        return None


def simulate_decision(price_now, price_prev, market_limits=None, market_precision=None, available_usdt=None):
    """Очень простая стратегия: если цена выросла на >0.1% за период -> сигнал BUY (симуляция).
    При расчёте объёма учитываем лимиты биржи (min amount / min cost) и precision.
    market_limits: dict with market limits (expects keys 'amount' and 'cost')
    market_precision: dict or Decimal quant for amount precision
    available_usdt: Decimal available quote currency (for safety checks)
    """
    if price_prev is None:
        return 'HOLD', None
    change = (price_now - price_prev) / price_prev
    logger.info('Изменение цены: %.6f', float(change))
    threshold = Decimal('0.001')  # 0.1%
    # Classic behavior: buy on drop (mean reversion)
    if change <= -threshold:
        # Базовый объём в базовой валюте, до округления
        raw_amount = (TRADE_USD / price_now)

        # Determine precision quant
        if market_precision:
            try:
                quant = Decimal(str(market_precision))
            except Exception:
                quant = Decimal('0.00000001')
        else:
            quant = Decimal('0.00000001')

        # Apply rounding down to avoid going over available funds
        amount = (raw_amount.quantize(quant, rounding=ROUND_DOWN))

        # Respect minimum amount and minimum cost (notional)
        min_amount = None
        min_cost = None
        if market_limits:
            try:
                min_amount_raw = market_limits.get('amount', {}).get('min')
                min_cost_raw = market_limits.get('cost', {}).get('min')
            except Exception:
                min_amount_raw = None
                min_cost_raw = None
            try:
                if min_amount_raw is not None:
                    min_amount = Decimal(str(min_amount_raw))
                if min_cost_raw is not None:
                    min_cost = Decimal(str(min_cost_raw))
            except Exception:
                min_amount = None
                min_cost = None

        # If there's a min_cost (notional), compute the implied minimal base-amount
        # and make sure we round up to the precision step. This covers cases like
        # BNB where min_cost > price*min_amount (so you must buy more than the
        # nominal min_amount to reach the 5 USDT threshold).
        if min_cost is not None:
            implied_min_amount = (min_cost / price_now).quantize(quant, rounding=ROUND_UP)
            logger.info('Implied minimal amount to reach min_cost %s: %s', min_cost, implied_min_amount)
            # If market reports a smaller min_amount, replace it with the implied one
            if min_amount is None or implied_min_amount > min_amount:
                logger.info('Используем увеличенный min_amount=%s вместо %s', implied_min_amount, min_amount)
                min_amount = implied_min_amount

        # Enforce min_amount (after implied adjustment)
        if min_amount is not None and amount < min_amount:
            amount = min_amount.quantize(quant, rounding=ROUND_DOWN)

        # Final safety: do not exceed available_usdt (leave tiny fee buffer)
        if available_usdt is not None:
            fee_buffer = Decimal('0.5')  # keep 0.5 USDT buffer for fees/rounding
            max_spend = max(Decimal('0'), available_usdt - fee_buffer)
            max_amount_allowed = (max_spend / price_now).quantize(quant, rounding=ROUND_DOWN)
            if amount > max_amount_allowed:
                amount = max_amount_allowed

        # Ensure final amount adheres to precision
        try:
            amount = amount.quantize(quant, rounding=ROUND_DOWN)
        except Exception:
            # fallback: cast to Decimal with the given precision string
            amount = Decimal(str(amount))

        # If after adjustments amount <= 0 -> cannot place a meaningful order
        if amount <= 0:
            logger.info('Вычисленный объём невозможен (недостаточно средств/ограничения биржи).')
            return 'HOLD', None

    logger.info('Рассчитанный объём для BUY (покупаем при падении): %s (raw %s)', amount, raw_amount)
    return 'BUY', amount
    return 'HOLD', None


def place_order(exchange, symbol, side, amount, dry_run=True):
    logger.info('Размещение ордера: %s %s %s (dry_run=%s)', side, amount, symbol, dry_run)
    if dry_run:
        # Возврат структуры, имитирующей ответ
        return {'info': 'simulated', 'side': side, 'amount': str(amount), 'symbol': symbol}
    try:
        if side == 'BUY':
            order = exchange.create_market_buy_order(symbol, float(amount))
        else:
            order = exchange.create_market_sell_order(symbol, float(amount))
        return order
    except Exception as e:
        logger.error('Ошибка при размещении ордера: %s', e)
        return None


def verify_order_amount(exchange, symbol, amount, price=None):
    """Verify that amount respects market precision, min_amount and min_cost (notional).
    Returns (True, '') on success or (False, reason) on failure.
    """
    try:
        exchange.load_markets()
        market = exchange.markets.get(symbol)
        if not market:
            return False, 'market not found'
        precision = market.get('precision', {}).get('amount')
        limits = market.get('limits', {})
        min_amount = None
        min_cost = None
        try:
            min_amount_raw = limits.get('amount', {}).get('min')
            min_cost_raw = limits.get('cost', {}).get('min')
        except Exception:
            min_amount_raw = None
            min_cost_raw = None
        if min_amount_raw is not None:
            min_amount = Decimal(str(min_amount_raw))
        if min_cost_raw is not None:
            min_cost = Decimal(str(min_cost_raw))

        quant = Decimal(str(precision)) if precision is not None else Decimal('0.00000001')
        amount_d = Decimal(str(amount)).quantize(quant, rounding=ROUND_DOWN)

        if min_amount is not None and amount_d < min_amount:
            return False, f'amount {amount_d} < min_amount {min_amount}'

        if price is None:
            ticker = exchange.fetch_ticker(symbol)
            price = Decimal(str(ticker.get('last')))
        else:
            price = Decimal(str(price))

        if min_cost is not None and (amount_d * price) < min_cost:
            return False, f'notional {(amount_d * price)} < min_cost {min_cost}'

        return True, ''
    except Exception as e:
        return False, f'error checking market: {e}'


def main(args):
    exchange = make_exchange()
    symbol = PAIR

    # Получаем стартовый прайс
    price_prev = fetch_price(exchange, symbol)
    if price_prev is None:
        logger.error('Не могу получить начальную цену, выхожу.')
        return
    logger.info('Начальная цена %s = %s', symbol, price_prev)

    # Небольшой цикл для демонстрации: проверяем цену каждые N секунд, принимаем решение
    iterations = args.iterations
    interval = args.interval
    dry_run = not args.live

    # Load market info for safety checks
    market_limits = None
    market_precision = None
    try:
        exchange.load_markets()
        market = exchange.markets.get(symbol)
        if market:
            market_limits = market.get('limits', {})
            market_precision = market.get('precision', {}).get('amount')
    except Exception:
        logger.warning('Не удалось загрузить market info; продолжим без учёта ограничений биржи')

    # Get available USDT for safety checks
    available_usdt = None
    bal = fetch_balance(exchange)
    if bal and 'free' in bal:
        try:
            available_usdt = Decimal(str(bal['free'].get('USDT', 0)))
        except Exception:
            available_usdt = None

    for i in range(iterations):
        price_now = fetch_price(exchange, symbol)
        if price_now is None:
            time.sleep(interval)
            continue
        signal, amount = simulate_decision(price_now, price_prev, market_limits=market_limits, market_precision=market_precision, available_usdt=available_usdt)
        if signal == 'BUY' and amount and amount > 0:
            # Before placing a live order, double-check exchange 'has' and account funds
            if not dry_run:
                if not exchange.has.get('createMarketOrder'):
                    logger.error('Биржа не поддерживает создание рыночного ордера — прерываем')
                    return
                # Refresh balance
                bal2 = fetch_balance(exchange)
                if bal2 and isinstance(bal2, dict) and 'free' in bal2:
                    try:
                        free_usdt = Decimal(str(bal2.get('free', {}).get('USDT', 0)))
                    except Exception:
                        free_usdt = None
                else:
                    free_usdt = None
                if free_usdt is None or free_usdt < (TRADE_USD * Decimal('0.9')):
                    logger.error('Недостаточно свободных USDT для размещения ордера: %s', free_usdt)
                    return
                # Additional verification: ensure amount respects market min_amount and min_cost
                ok, reason = verify_order_amount(exchange, symbol, amount, price=price_now)
                if not ok:
                    logger.error('Проверка объёма ордера не пройдена: %s — ордер не будет размещён', reason)
                    return
            result = place_order(exchange, symbol, 'BUY', amount, dry_run=dry_run)
            logger.info('Результат ордера: %s', result)
        else:
            logger.info('Сигнал: %s — ничего не делаем', signal)
        price_prev = price_now
        time.sleep(interval)

    logger.info('Готово')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Простой безопасный бот для Binance (симуляция по умолчанию)')
    parser.add_argument('--live', action='store_true', help='Если указан — размещает реальные ордера (опасно).')
    parser.add_argument('--iterations', type=int, default=3, help='Сколько итераций выполнить')
    parser.add_argument('--interval', type=int, default=20, help='Интервал в секундах между проверками')
    args = parser.parse_args()
    main(args)
