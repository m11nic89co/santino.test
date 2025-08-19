#!/bin/bash
# Opens the crypto-bot workspace in VS Code
WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_FILE="$WORKSPACE_DIR/crypto-bot.code-workspace"

if [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "$WORKSPACE_FILE"
elif [ -x "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" "$WORKSPACE_FILE"
else
  echo "VS Code not found in /Applications. Install VS Code or add 'code' to PATH."
  exit 1
fi
