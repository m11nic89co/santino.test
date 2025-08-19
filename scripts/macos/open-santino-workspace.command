#!/bin/bash
# Opens the workspace in VS Code and ensures Settings Sync can kick in (VS Code handles auth/UI)
# Make executable: chmod +x open-santino-workspace.command

WORKSPACE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORKSPACE_FILE="$WORKSPACE_DIR/santino.code-workspace"

# Prefer stable Code, fallback to Insiders
if [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "$WORKSPACE_FILE"
elif [ -x "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" ]; then
  "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" "$WORKSPACE_FILE"
else
  echo "VS Code not found in /Applications. Install it or add 'code' to PATH."
  exit 1
fi
