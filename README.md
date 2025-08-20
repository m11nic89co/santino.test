# Рабочее окружение: проекты разделены

В репозитории два самостоятельных проекта:

- santino/ — сайт (static) + инструменты для santino.ru.com
- crypto-bot/ — Python‑бот (Docker + tests)

Открывайте каждый проект отдельно:
- Только сайт: `santino/santino.code-workspace`
- Только бот: `crypto-bot/crypto-bot.code-workspace`

Папка `archive/` — бэкап старого `crypto-bot-wt`.

Заметки:
- Santino: зависимости и окружение в `santino/` (`node_modules`, `package-lock.json`, `.env.example`, `.devcontainer`, `.github`).
- Crypto Bot: виртуальное окружение Python — `crypto-bot/.venv`.

## macOS
- Крипто-бот окружение:
	- `cd crypto-bot && bash scripts/macos/bootstrap.sh`
	- Активировать: `source .venv/bin/activate`

## Windows
- Общий bootstrap: `powershell -ExecutionPolicy Bypass -File scripts/windows/bootstrap-all.ps1`
- Ярлыки для задач Santino находятся в `santino/scripts/windows/*`.

## Версии инструментов
- Зафиксированы в `.tool-versions`: Node 20.15.0, Python 3.11.9.
- Синхронизация через Git. Не коммитим: `node_modules`, `.venv`, `dist`, `.env*` (см. `.gitignore`).

Примечание: объединённый workspace удалён, чтобы не смешивать проекты.
