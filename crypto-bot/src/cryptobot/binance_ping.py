import os
import ccxt
from dotenv import load_dotenv

# Загрузка переменных из .env
load_dotenv()

API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')

if not API_KEY or not API_SECRET:
    print('Ошибка: API_KEY и/или API_SECRET не заданы в .env')
    exit(1)

exchange = ccxt.binance({
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'enableRateLimit': True,
})

try:
    balance = exchange.fetch_balance()
    print('=== BALANCE (Binance) ===')
    for asset, info in balance['total'].items():
        if info:
            print(f'{asset}: {info}')
except Exception as e:
    print('Ошибка при получении баланса:', e)
