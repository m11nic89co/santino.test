#!/bin/bash
# Create .app wrappers on Desktop for Santino and Crypto Bot workspaces.
# Usage: ./scripts/macos/create-vscode-workspace-shortcuts.command

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SANTINO_WS="$ROOT_DIR/santino/santino.code-workspace"
CRYPTO_WS="$ROOT_DIR/crypto-bot/crypto-bot.code-workspace"

make_app() {
  local WS_PATH="$1"; shift
  local NAME="$1"; shift
  local DESKTOP="$HOME/Desktop"
  local APP_PATH="$DESKTOP/${NAME}.app"

  mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources"
  cat >"$APP_PATH/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>${NAME}</string>
  <key>CFBundleDisplayName</key><string>${NAME}</string>
  <key>CFBundleIdentifier</key><string>local.${NAME// /-}</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>run</string>
</dict></plist>
PLIST
  cat >"$APP_PATH/Contents/MacOS/run" <<EOF
#!/usr/bin/env bash
open -a "Visual Studio Code" -- "$WS_PATH"
EOF
  chmod +x "$APP_PATH/Contents/MacOS/run"
  echo "Created: $APP_PATH"
}

make_app "$SANTINO_WS" "Santino (VS Code)"
make_app "$CRYPTO_WS" "Crypto Bot (VS Code)"
