#!/usr/bin/env python3
"""Generate an hourly cumulative report for the paper grid bot.

Reads grid_state_*.json files produced by `grid_ws_paper.py` (orders + fills)
and appends a human-friendly report into /opt/crypto-bot/reports/grid_report_YYYYMMDD.txt

Run periodically (cron/systemd timer) or manually. The report is cumulative (appends each hour).
"""
import os
import json
from datetime import datetime
from decimal import Decimal


STATE_DIR = '/opt/crypto-bot'
REPORTS_DIR = os.path.join(STATE_DIR, 'reports')


def find_state_file():
    # find grid_state_*.json in STATE_DIR
    for name in os.listdir(STATE_DIR):
        if name.startswith('grid_state_') and name.endswith('.json'):
            return os.path.join(STATE_DIR, name)
    return None


def load_state(path):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception:
        return None


def decimal(x):
    try:
        return Decimal(str(x))
    except Exception:
        return Decimal('0')


def summarize(state):
    orders = state.get('orders', {}) if state else {}
    fills = state.get('fills', []) if state else []

    total_orders = len(orders)
    total_fills = len(fills)
    buys = [f for f in fills if f.get('order', {}).get('side') == 'BUY']
    sells = [f for f in fills if f.get('order', {}).get('side') == 'SELL']

    buy_qty = sum(decimal(f['order']['amount']) for f in buys)
    sell_qty = sum(decimal(f['order']['amount']) for f in sells)
    buy_spend = sum(decimal(f['order']['amount']) * decimal(f['price']) for f in buys)
    sell_recd = sum(decimal(f['order']['amount']) * decimal(f['price']) for f in sells)

    realized_pnl = sell_recd - buy_spend
    net_base = buy_qty - sell_qty

    avg_buy_price = (buy_spend / buy_qty) if buy_qty != 0 else Decimal('0')
    avg_sell_price = (sell_recd / sell_qty) if sell_qty != 0 else Decimal('0')

    return {
        'total_orders': total_orders,
        'total_fills': total_fills,
        'buys': len(buys),
        'sells': len(sells),
        'buy_qty': str(buy_qty),
        'sell_qty': str(sell_qty),
        'buy_spend': str(buy_spend),
        'sell_recd': str(sell_recd),
        'realized_pnl': str(realized_pnl),
        'net_base': str(net_base),
        'avg_buy_price': str(avg_buy_price),
        'avg_sell_price': str(avg_sell_price),
    }


def make_human_explanation(summary):
    lines = []
    lines.append('Краткая сводка (объяснения простыми словами):')
    lines.append(f"- Всего открытых симордеров в сетке: {summary['total_orders']} — это количество активных лимитных уровней, которые мы имитируем.")
    lines.append(f"- Всего сработавших (fills): {summary['total_fills']} — сколько раз ордера были полностью исполнены в симуляции.")
    lines.append(f"- BUY (сколько куплено): {summary['buys']} сделок, всего базовой валюты куплено: {summary['buy_qty']} единиц; потрачено ≈ {summary['buy_spend']} USDT.")
    lines.append(f"- SELL (сколько продано): {summary['sells']} сделок, всего продано: {summary['sell_qty']} единиц; получено ≈ {summary['sell_recd']} USDT.")
    lines.append(f"- Реализованная PnL: {summary['realized_pnl']} USDT — это (получили от продаж) − (потратили на покупки). Положительное — прибыль, отрицательное — убыток.")
    lines.append(f"- Текущий нетто‑баланс в базовой валюте (куплено − продано): {summary['net_base']} единиц — это то, что осталось в позиции.")
    lines.append(f"- Средняя цена покупки: {summary['avg_buy_price']} USDT (если купили хотя бы одну сделку).")
    lines.append(f"- Средняя цена продажи: {summary['avg_sell_price']} USDT (если продали хотя бы одну сделку).")
    lines.append('')
    lines.append('Примечание: это симуляция (paper run). Отчёт аккумулируется — каждый час добавляется новый блок в тот же файл.')
    return '\n'.join(lines)


def write_report(summary, state_path):
    os.makedirs(REPORTS_DIR, exist_ok=True)
    fname = datetime.utcnow().strftime('grid_report_%Y%m%d.txt')
    path = os.path.join(REPORTS_DIR, fname)
    header = '=' * 60 + '\n'
    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    with open(path, 'a', encoding='utf-8') as f:
        f.write(header)
        f.write(f'Report generated: {now}\n')
        f.write(f'State file: {state_path}\n')
        f.write('\n')
        for k, v in summary.items():
            f.write(f'{k}: {v}\n')
        f.write('\n')
        f.write(make_human_explanation(summary))
        f.write('\n\n')
    return path


def main():
    state = None
    state_path = find_state_file()
    if not state_path:
        print('No state file found in', STATE_DIR)
        return
    state = load_state(state_path)
    summary = summarize(state)
    report_path = write_report(summary, state_path)
    print('Report appended to', report_path)


if __name__ == '__main__':
    main()
