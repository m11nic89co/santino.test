#!/usr/bin/env bash
set -euo pipefail

# Usage: ./create-vscode-workspace-shortcut.sh /path/to/workspace.code-workspace "Shortcut Name"
WS_PATH="${1:-}"
NAME="${2:-}"

if [[ -z "${WS_PATH}" || -z "${NAME}" ]]; then
  echo "Usage: $0 /path/to/workspace.code-workspace 'Shortcut Name'" >&2
  exit 1
fi

if [[ ! -f "${WS_PATH}" ]]; then
  echo "Workspace not found: ${WS_PATH}" >&2
  exit 1
fi

DESKTOP="$HOME/Desktop"
APP_PATH="$DESKTOP/${NAME}.app"

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
  <key>LSMinimumSystemVersion</key><string>10.13</string>
</dict></plist>
PLIST

cat >"$APP_PATH/Contents/MacOS/run" <<'RUN'
#!/usr/bin/env bash
set -euo pipefail
open -a "Visual Studio Code" -- "$WORKSPACE_FILE"
RUN
chmod +x "$APP_PATH/Contents/MacOS/run"

# Create a small launcher that sets WORKSPACE_FILE and execs run
cat >"$APP_PATH/Contents/MacOS/run" <<EOF
#!/usr/bin/env bash
export WORKSPACE_FILE="${WS_PATH}"
open -a "Visual Studio Code" -- "$WORKSPACE_FILE"
EOF
chmod +x "$APP_PATH/Contents/MacOS/run"

echo "Created: $APP_PATH"
