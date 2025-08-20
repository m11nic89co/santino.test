# Workspace: Santino + Crypto Bot

This workspace now has two clean projects:

- santino/ — static website + tools for santino.ru.com
- crypto-bot/ — Python trading bot (Docker + tests)

Open the multi-root workspace file `Santino-Crypto.code-workspace` (recommended). It provides a task for generating the OG image under the Santino folder.

Extras:
- archive/ — old `crypto-bot-wt` backup

Notes:
- Santino Node deps and env live under `santino/` now (`node_modules`, `package-lock.json`, `.env.example`, `.devcontainer`, `.github`).
- Crypto Bot Python venv is at `crypto-bot/.venv`.

## macOS
- Ярлык для VS Code:
	- Santino: `bash santino/scripts/macos/create-vscode-workspace-shortcut.sh "$(pwd)/santino/DEV.code-workspace" "Santino"`
	- Crypto Bot: `bash santino/scripts/macos/create-vscode-workspace-shortcut.sh "$(pwd)/crypto-bot/crypto-bot.code-workspace" "Crypto Bot"`
- Крипто-бот окружение:
	- `cd crypto-bot && bash scripts/macos/bootstrap.sh`
	- Активировать: `source .venv/bin/activate`

## Windows
- Общий bootstrap для обоих проектов: `powershell -ExecutionPolicy Bypass -File scripts/windows/bootstrap-all.ps1`
- Ярлыки уже созданы скриптами для Windows (см. `santino/scripts/windows/*`).

## Единые версии и синхронизация (Mac/Windows)
- Версии инструментов зафиксированы в `.tool-versions`: Node 20.15.0, Python 3.11.9.
- Рекомендуется:
	- Node: Volta (跨 ОС) или nvm-windows/macOS для закрепления Node 20.
	- Python: pyenv (macOS) или py -3 / системный Python (Windows) + venv в `crypto-bot/.venv`.
- Код и артефакты синхронизируйте через Git. Не коммитим: `node_modules`, `.venv`, `dist`, `.env*` (см. `.gitignore`).
- VS Code: используйте `Santino-Crypto.code-workspace` на всех машинах — одинаковые задачи и структура.
