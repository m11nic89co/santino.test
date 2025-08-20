#!/usr/bin/env bash
set -euo pipefail

# Python env setup for macOS
PY_VER="3.11"
if command -v pyenv >/dev/null 2>&1; then
  pyenv install -s "$PY_VER"
  pyenv local "$PY_VER"
fi

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .[dev]

echo "Done. Activate with: source .venv/bin/activate"
