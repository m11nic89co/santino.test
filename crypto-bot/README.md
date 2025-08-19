# Crypto Bot

Модульный бот для алгоритмической торговли криптовалютой.

Возможности:
- Бэктестинг на исторических данных
- Paper-trading (без реальных сделок)
- Live-трейдинг через CCXT
- Модульные стратегии и риск-менеджмент
- Конфигурация через .env и/или config.json

## Структура
- src/cryptobot/engine — ядро бота (циклы, оркестрация)
- src/cryptobot/exchanges — обёртки над биржами (CCXT)
- src/cryptobot/strategies — стратегии (пример: Crossover)
- src/cryptobot/utils — утилиты (IO, таймсерии, риск)
- tests — тесты

## Быстрый старт
1. Установите зависимости:
```bash
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .[dev]
```
2. Создайте .env по образцу:
```bash
cp .env.example .env
```
3. Запустите бэктест примера:
```bash
python -m cryptobot.engine.run_backtest --pair BTC/USDT --tf 1h --strategy crossover
```
4. Paper-trading (требует API только для чтения/демо-среду):
```bash
python -m cryptobot.engine.run_paper --pair BTC/USDT --tf 1m --strategy crossover
```

## Важно
- Торговля связана с риском. Используйте paper/демо перед live.
- Храните ключи API только локально и в .env (не коммить).
