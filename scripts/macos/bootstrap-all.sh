#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# 1) Santino: Node deps
if command -v brew >/dev/null 2>&1; then
  brew install node@20 || true
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Please install Node 20 (brew install node@20)" >&2
else
  (cd santino && npm ci || npm install)
fi

# 2) Crypto-bot: Python venv and deps
PY="python3"
$PY -m venv crypto-bot/.venv
source crypto-bot/.venv/bin/activate
python -m pip install --upgrade pip
pip install -e crypto-bot/[dev]

# 3) Desktop shortcuts
bash santino/scripts/macos/create-vscode-workspace-shortcut.sh "$ROOT/santino/DEV.code-workspace" "Santino" || true
bash santino/scripts/macos/create-vscode-workspace-shortcut.sh "$ROOT/crypto-bot/crypto-bot.code-workspace" "Crypto Bot" || true

echo "All set. Shortcuts placed on Desktop."
