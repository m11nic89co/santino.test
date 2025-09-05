#!/usr/bin/env bash
# Auto-import prompts on folder open (macOS/Linux)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEL=""
for f in prompts.json copilot-web-app-master.ru.json; do
  [ -f "$ROOT/$f" ] && SEL="$ROOT/$f" && break
done
if [ -n "$SEL" ]; then
  bash "$ROOT/scripts/import-prompts.sh" "$SEL" || true
fi
