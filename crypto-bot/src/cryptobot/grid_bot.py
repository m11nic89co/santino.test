"""Простой тестовый бот «сеткой»:
- Если цена поднялась на >= +1% от предыдущей точки — покупаем (TRADE_USD)
- Если цена опустилась на <= -1% от предыдущей точки — продаём (последний купленный объём или доступный)

По умолчанию режим сухой (dry-run). Для реальных ордеров указывать --live.
"""
import os
import time
import argparse
import logging
from decimal import Decimal, ROUND_DOWN, ROUND_UP

from dotenv import load_dotenv

from .simple_bot import make_exchange, fetch_price, place_order, verify_order_amount, fetch_balance

load_dotenv()

import json
import threading

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('grid_bot')


def quantize_amount(amount, quant):
    try:
        return amount.quantize(Decimal(str(quant)), rounding=ROUND_DOWN)
    except Exception:
        return amount

def quantize_price(price, quant):
    try:
        return Decimal(str(price)).quantize(Decimal(str(quant)), rounding=ROUND_DOWN)
    except Exception:
        return Decimal(str(price))


def run_bot(symbol, trade_usd, iterations, interval, dry_run, order_type='limit', limit_offset=Decimal('0.001'), limit_price=None, post_only=False, auto_cancel_seconds=300):
    exchange = make_exchange()
    # use passed parameters: order_type, limit_offset, limit_price, post_only, auto_cancel_seconds

    base = symbol.split('/')[0]
    quote = symbol.split('/')[1]
    state_file = f'grid_state_{base}.json'
    state_lock = threading.Lock()

    # simple simulated balance state used only in dry-run
    sim_state = {'balances': {quote: Decimal('0'), base: Decimal('0')}}

    def load_state():
        try:
            if os.path.exists(state_file):
                with open(state_file) as f:
                    data = json.load(f)
                    b = data.get('balances', {})
                    for k, v in b.items():
                        try:
                            sim_state['balances'][k] = Decimal(str(v))
                        except Exception:
                            pass
                    logger.info('Loaded sim_state balances: %s', sim_state['balances'])
        except Exception as e:
            logger.error('Failed to load state: %s', e)

    def save_state():
        try:
            with state_lock:
                with open(state_file, 'w') as f:
                    json.dump({'balances': {k: str(v) for k, v in sim_state['balances'].items()}}, f)
        except Exception as e:
            logger.error('Failed to save state: %s', e)

    # initialize sim balances from actual balance if available
    if dry_run:
        try:
            bal = fetch_balance(exchange)
            if bal and 'free' in bal:
                try:
                    sim_state['balances'][quote] = Decimal(str(bal['free'].get(quote, 0)))
                except Exception:
                    pass
            load_state()
        except Exception:
            pass

    # Load market info
    try:
        exchange.load_markets()
        market = exchange.markets.get(symbol)
        precision = market.get('precision', {}).get('amount') if market else None
        price_precision = market.get('precision', {}).get('price') if market else None
        limits = market.get('limits', {}) if market else {}
        min_amount = None
        if limits:
            min_amount = limits.get('amount', {}).get('min') if isinstance(limits.get('amount', {}), dict) else limits.get('amount')
            try:
                min_amount = Decimal(str(min_amount)) if min_amount is not None else None
            except Exception:
                min_amount = None
    except Exception:
        logger.warning('Не удалось загрузить market info; продолжим без точной квантизации')
        precision = None
        price_precision = None
        min_amount = None

    price_prev = fetch_price(exchange, symbol)
    if price_prev is None:
        logger.error('Не удалось получить начальную цену, выхожу')
        return
    logger.info('Стартовая цена %s = %s', symbol, price_prev)

    last_bought_amount = None

    for i in range(iterations):
        price = fetch_price(exchange, symbol)
        if price is None:
            time.sleep(interval)
            continue

        change = (price - price_prev) / price_prev
        logger.info('Итерация %d: цена=%s (change=%.4f%%)', i + 1, price, float(change) * 100)

        # BUY if -0.01% or more (classic: buy on drop)
        if change <= Decimal('-0.0001'):
            logger.info('Сигнал BUY (-0.01%%) — покупаем при падении')
            raw_amount = (Decimal(str(trade_usd)) / price)
            quant = Decimal(str(precision)) if precision is not None else Decimal('0.00000001')
            amount = quantize_amount(raw_amount, quant)

            # Respect minimum amount and minimum cost (notional) adaptively
            min_amt = None
            min_cost = None
            try:
                if limits:
                    min_amt_raw = limits.get('amount', {}).get('min') if isinstance(limits.get('amount', {}), dict) else limits.get('amount')
                    min_cost_raw = limits.get('cost', {}).get('min') if isinstance(limits.get('cost', {}), dict) else limits.get('cost')
                else:
                    min_amt_raw = None
                    min_cost_raw = None
            except Exception:
                min_amt_raw = None
                min_cost_raw = None
            try:
                if min_amt_raw is not None:
                    min_amt = Decimal(str(min_amt_raw))
                if min_cost_raw is not None:
                    min_cost = Decimal(str(min_cost_raw))
            except Exception:
                min_amt = None
                min_cost = None

            # If there's a min_cost (notional), compute implied minimal base-amount
            if min_cost is not None:
                try:
                    implied_min_amount = (min_cost / price).quantize(quant, rounding=ROUND_UP)
                    logger.info('Implied minimal amount to reach min_cost %s: %s', min_cost, implied_min_amount)
                    if min_amt is None or implied_min_amount > min_amt:
                        logger.info('Using increased min_amount=%s instead of %s', implied_min_amount, min_amt)
                        min_amt = implied_min_amount
                except Exception:
                    pass

            # Enforce min_amount
            if min_amt is not None and amount < min_amt:
                try:
                    amount = min_amt.quantize(quant, rounding=ROUND_DOWN)
                except Exception:
                    amount = min_amt

            # Respect available USDT (small fee buffer)
            try:
                bal = fetch_balance(exchange)
                available_usdt = None
                if bal and 'free' in bal:
                    try:
                        available_usdt = Decimal(str(bal['free'].get('USDT', 0)))
                    except Exception:
                        available_usdt = None
                if available_usdt is not None:
                    fee_buffer = Decimal('0.5')
                    max_spend = max(Decimal('0'), available_usdt - fee_buffer)
                    max_amount_allowed = (max_spend / price).quantize(quant, rounding=ROUND_DOWN)
                    if amount > max_amount_allowed:
                        amount = max_amount_allowed
            except Exception:
                # ignore balance errors
                pass

            try:
                amount = Decimal(str(amount)).quantize(quant, rounding=ROUND_DOWN)
            except Exception:
                amount = Decimal(str(amount))

            if amount <= 0:
                logger.info('Вычисленный объём <= 0 — пропускаем BUY')
            else:
                ok, reason = verify_order_amount(exchange, symbol, amount, price=price)
                if not ok:
                    if dry_run:
                        logger.info('BUY verification would fail: %s — пропускаем (dry_run)', reason)
                    else:
                        logger.error('BUY verification failed: %s', reason)
                else:
                    if not dry_run:
                        res = place_order(exchange, symbol, 'BUY', amount, dry_run=False)
                        logger.info('BUY result: %s', res)
                    # branch: live vs dry-run
                    if not dry_run:
                        # live and order_type handling
                        if order_type == 'limit':
                            # compute limit price below current price by offset
                            limit_price = (price * (Decimal('1') - Decimal(str(limit_offset))))
                            if price_precision:
                                limit_price = quantize_price(limit_price, price_precision)
                            ok2, reason2 = verify_order_amount(exchange, symbol, amount, price=limit_price)
                            if not ok2:
                                logger.error('BUY verification failed for LIMIT: %s', reason2)
                            else:
                                try:
                                    if not exchange.has.get('createLimitOrder', True):
                                        logger.error('Exchange does not support limit orders')
                                    else:
                                        order = exchange.create_limit_buy_order(symbol, float(amount), float(limit_price))
                                        logger.info('BUY LIMIT result: %s', order)
                                except Exception as e:
                                    logger.error('Error placing limit BUY: %s', e)
                        else:
                            res = place_order(exchange, symbol, 'BUY', amount, dry_run=False)
                            logger.info('BUY result: %s', res)
                    else:
                        # dry-run: update simulated balances if available
                        try:
                            with state_lock:
                                # simulate immediate fill of limit/market for dry-run
                                cost = (amount * price).quantize(Decimal('0.00000001'), rounding=ROUND_DOWN)
                                sim_state['balances'][quote] = max(Decimal('0'), sim_state['balances'].get(quote, Decimal('0')) - cost)
                                sim_state['balances'][base] = sim_state['balances'].get(base, Decimal('0')) + amount
                                save_state()
                                logger.info('DRY_RUN BUY amount=%s cost=%s updated sim balances %s', amount, cost, sim_state['balances'])
                        except Exception as e:
                            logger.error('Failed to update sim_state on BUY: %s', e)
                    last_bought_amount = amount

        # SELL if +0.01% or more (classic: sell on rise)
        elif change >= Decimal('0.0001'):
            logger.info('Сигнал SELL (+0.01%%) — продаём при росте')
            # prefer to sell last_bought_amount if present
            to_sell = last_bought_amount
            if to_sell is None:
                # read balance
                bal = fetch_balance(exchange)
                try:
                    free_base = Decimal(str(bal['free'].get(symbol.split('/')[0], 0))) if bal and 'free' in bal else Decimal('0')
                except Exception:
                    free_base = Decimal('0')
                to_sell = free_base

            if not to_sell or to_sell <= 0:
                logger.info('Нет доступного объёма для продажи — пропускаем SELL')
            else:
                quant = Decimal(str(precision)) if precision is not None else Decimal('0.00000001')
                sell_amount = quantize_amount(Decimal(str(to_sell)), quant)

                # Use verify_order_amount to ensure sell_amount meets market notional/precision
                ok, reason = verify_order_amount(exchange, symbol, sell_amount, price=price)
                if not ok:
                    logger.info('SELL verification failed/insufficient: %s — пропускаем SELL', reason)
                # branch: live vs dry-run for SELL
                if not dry_run:
                    if order_type == 'limit':
                        # place limit sell slightly above current price
                        limit_price = (price * (Decimal('1') + Decimal(str(limit_offset))))
                        if price_precision:
                            limit_price = quantize_price(limit_price, price_precision)
                        ok2, reason2 = verify_order_amount(exchange, symbol, sell_amount, price=limit_price)
                        if not ok2:
                            logger.error('SELL verification failed for LIMIT: %s', reason2)
                        else:
                            try:
                                if not exchange.has.get('createLimitOrder', True):
                                    logger.error('Exchange does not support limit orders')
                                else:
                                    order = exchange.create_limit_sell_order(symbol, float(sell_amount), float(limit_price))
                                    logger.info('SELL LIMIT result: %s', order)
                            except Exception as e:
                                logger.error('Error placing limit SELL: %s', e)
                    else:
                        res = place_order(exchange, symbol, 'SELL', sell_amount, dry_run=False)
                        logger.info('SELL result: %s', res)
                    last_bought_amount = None
                else:
                    # dry-run: update simulated balances (sell base -> gain quote)
                    try:
                        with state_lock:
                            proceeds = (sell_amount * price).quantize(Decimal('0.00000001'), rounding=ROUND_DOWN)
                            sim_state['balances'][base] = max(Decimal('0'), sim_state['balances'].get(base, Decimal('0')) - sell_amount)
                            sim_state['balances'][quote] = sim_state['balances'].get(quote, Decimal('0')) + proceeds
                            save_state()
                            logger.info('DRY_RUN SELL amount=%s proceeds=%s updated sim balances %s', sell_amount, proceeds, sim_state['balances'])
                    except Exception as e:
                        logger.error('Failed to update sim_state on SELL: %s', e)
                    last_bought_amount = None

        else:
            logger.info('Сигнал: HOLD')

        price_prev = price
        time.sleep(interval)


def parse_args():
    parser = argparse.ArgumentParser(description='Простой тестовый grid-bot (buy on +1%, sell on -1%)')
    parser.add_argument('--pair', default=os.getenv('PAIR', 'BTC/USDT'))
    parser.add_argument('--trade-usd', type=float, default=float(os.getenv('BASE_ORDER_USD', '1')))
    parser.add_argument('--iterations', type=int, default=10)
    parser.add_argument('--interval', type=int, default=10)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--order-type', choices=['limit', 'market'], default='limit', help='Тип ордера по умолчанию')
    parser.add_argument('--limit-offset', type=float, default=0.001, help='Offset (fraction) для лимитных ордеров, например 0.001 = 0.1%')
    parser.add_argument('--limit-price', type=float, default=None, help='Явная цена для лимитного ордера (приоритет над offset)')
    parser.add_argument('--post-only', action='store_true', help='Поставить лимитный ордер как post-only (если поддерживается)')
    parser.add_argument('--auto-cancel-seconds', type=int, default=300, help='Авто-отмена лимитного ордера через N секунд если не исполнен')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    run_bot(
        args.pair,
        args.trade_usd,
        args.iterations,
        args.interval,
        dry_run=not args.live,
        order_type=args.order_type,
        limit_offset=Decimal(str(args.limit_offset)),
        limit_price=Decimal(str(args.limit_price)) if args.limit_price is not None else None,
        post_only=bool(args.post_only),
        auto_cancel_seconds=int(args.auto_cancel_seconds),
    )
