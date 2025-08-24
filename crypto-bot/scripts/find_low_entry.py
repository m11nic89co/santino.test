#!/usr/bin/env python3
import ccxt
from decimal import Decimal, ROUND_UP

def main():
    ex = ccxt.binance({'enableRateLimit': True})
    ex.load_markets()
    tickers = ex.fetch_tickers()
    rows = []
    for sym, t in tickers.items():
        if not sym.endswith('/USDT'):
            continue
        last = t.get('last')
        if last is None:
            continue
        baseVol = t.get('baseVolume') or 0
        qv = t.get('quoteVolume')
        if qv is None:
            try:
                qv = float(baseVol) * float(last)
            except Exception:
                qv = 0
        rows.append((sym, float(qv), last))
    rows_sorted = sorted(rows, key=lambda r: r[1], reverse=True)
    seen = set()
    final = []
    for sym, qv, last in rows_sorted:
        base = sym.split('/')[0]
        if base in seen:
            continue
        seen.add(base)
        market = ex.markets.get(sym)
        limits = market.get('limits', {})
        precision = market.get('precision', {}).get('amount')
        try:
            min_amount = limits.get('amount', {}).get('min') if isinstance(limits.get('amount', {}), dict) else limits.get('amount')
        except Exception:
            min_amount = None
        try:
            min_cost = limits.get('cost', {}).get('min') if isinstance(limits.get('cost', {}), dict) else limits.get('cost')
        except Exception:
            min_cost = None
        price = Decimal(str(last))
        min_amount_d = Decimal(str(min_amount)) if min_amount is not None else None
        min_cost_d = Decimal(str(min_cost)) if min_cost is not None else None
        quant = Decimal(str(precision)) if precision is not None else Decimal('0.00000001')
        implied_min_amount = None
        if min_cost_d is not None:
            implied_min_amount = (min_cost_d / price).quantize(quant, rounding=ROUND_UP)
        implied_cost_for_min_amount = None
        if min_amount_d is not None:
            implied_cost_for_min_amount = (min_amount_d * price)
        final.append((base, sym, qv, float(price), str(min_amount_d) if min_amount_d is not None else None, str(min_cost_d) if min_cost_d is not None else None, str(precision), str(implied_min_amount) if implied_min_amount is not None else None, str(implied_cost_for_min_amount) if implied_cost_for_min_amount is not None else None))
        if len(final) >= 40:
            break
    final20 = final[:20]
    print('base,symbol,quoteVol,last,min_amount,min_cost,precision,implied_min_amount,implied_cost_for_min_amount')
    for r in final20:
        print(','.join([str(x) if x is not None else '' for x in r]))
    candidates = []
    for r in final20:
        base, sym, qv, price, min_amount, min_cost, precision, implied_min_amount, implied_cost_for_min_amount = r
        ok = False
        reasons = []
        if min_cost:
            try:
                if Decimal(min_cost) < Decimal('5'):
                    ok = True
                    reasons.append(f'min_cost {min_cost} < 5')
            except Exception:
                pass
        if implied_cost_for_min_amount:
            try:
                if Decimal(implied_cost_for_min_amount) < Decimal('5'):
                    ok = True
                    reasons.append(f'implied_cost_for_min_amount {implied_cost_for_min_amount} < 5')
            except Exception:
                pass
        if ok:
            candidates.append((r, reasons))
    print('\nCandidates with entry < 5 USDT among top20 by volume:')
    for r, reasons in candidates:
        base, sym, qv, price, min_amount, min_cost, precision, implied_min_amount, implied_cost_for_min_amount = r
        print(f"{base} ({sym}): price={price}, min_amount={min_amount}, min_cost={min_cost}, precision={precision}, implied_min_amount={implied_min_amount}, implied_cost={implied_cost_for_min_amount} -> {reasons}")

if __name__ == '__main__':
    main()
