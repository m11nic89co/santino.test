#!/bin/bash
# Opens the Crypto Bot workspace in VS Code.
# Make executable: chmod +x open-crypto-workspace.command

set -euo pipefail
WORKSPACE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORKSPACE_FILE="$WORKSPACE_DIR/crypto-bot/crypto-bot.code-workspace"

# Prefer stable Code, fallback to Insiders, else use open -a
if [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --new-window "$WORKSPACE_FILE"
elif [ -x "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" --new-window "$WORKSPACE_FILE"
else
  open -a "Visual Studio Code" -- "$WORKSPACE_FILE"
fi
