#!/usr/bin/env bash
# Import prompts from a root JSON into local storage and VS Code snippets (macOS/Linux)
set -euo pipefail

SRC="${1:-"$(cd "$(dirname "$0")/.." && pwd)/prompts.json"}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

info(){ printf '[prompts] %s\n' "$1"; }
warn(){ printf '[prompts] %s\n' "$1" >&2; }

if [ ! -f "$SRC" ]; then
  warn "Файл не найден: $SRC (пропуск)"; exit 0
fi

# Validate JSON and keep original
if ! command -v jq >/dev/null 2>&1; then
  warn 'jq не установлен. Рекомендуется для валидации JSON.'
fi

LOCAL_DIR="$REPO_ROOT/.local/copilot"
mkdir -p "$LOCAL_DIR"
cp -f "$SRC" "$LOCAL_DIR/prompts.json"
info "Сохранено локально: $LOCAL_DIR/prompts.json"

SNIPPETS_PATH="$REPO_ROOT/.vscode/copilot-prompts.code-snippets"
mkdir -p "$(dirname "$SNIPPETS_PATH")"

# Attempt to generate snippets from common shapes
if command -v jq >/dev/null 2>&1; then
  if jq -e '.prompts' "$SRC" >/dev/null 2>&1; then
    jq -r '{
      "Prompts": (
        .prompts | map( select((.name or .title) and (.body or .text or .content)) |
          { ("Prompt: " + (.name // .title)): { prefix: ["prompt:" + (.name // .title)], body: ((.body // .text // .content) | split("\n")) } }
        ) | add // {} )
    }' "$SRC" > "$SNIPPETS_PATH" || true
    info "Созданы сниппеты: $SNIPPETS_PATH"
  else
    # Fallback: object map
    jq -r 'to_entries | map( { ("Prompt: " + .key): { prefix: ["prompt:" + .key], body: ((.value.body // .value // "") | tostring | split("\n")) } } ) | add' "$SRC" > "$SNIPPETS_PATH" || true
    info "Созданы сниппеты: $SNIPPETS_PATH"
  fi
else
  warn 'jq отсутствует — сниппеты не сгенерированы, но prompts сохранены локально.'
fi

info 'Готово.'
