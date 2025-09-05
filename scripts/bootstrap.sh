#!/usr/bin/env bash
# Bootstrap: синхронизация репозитория и локальной среды (macOS/Linux)
set -euo pipefail

info() { printf "[autosync] %s\n" "$1"; }
warn() { printf "[autosync] %s\n" "$1" >&2; }
err()  { printf "[autosync] %s\n" "$1" >&2; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 1) Git
if ! command -v git >/dev/null 2>&1; then
  err "Git не найден. Установите Git: https://git-scm.com/downloads"
  exit 1
fi

# 2) Локальные папки/файлы
MACHINE_NAME=$(hostname)
mkdir -p .local/"$MACHINE_NAME"
[ -f .env.local ] || { touch .env.local; info "Создан файл .env.local (заполните при необходимости)"; }

# 3) Инициализация Git при необходимости
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  info "Инициализация Git-репозитория"
  git init
fi

# 4) Хуки
info "Конфигурация git core.hooksPath -> .githooks"
git config core.hooksPath .githooks

# 5) Приоритет GitHub: безопасная синхронизация
if git remote get-url origin >/dev/null 2>&1; then
  info "Получение обновлений с origin"
  git fetch --prune

  if git diff --quiet --ignore-submodules --exit-code && git diff --cached --quiet --ignore-submodules --exit-code; then
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    default_branch=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's|^refs/remotes/origin/||')
    if [ -z "$default_branch" ]; then
      default_branch=$(git remote show origin 2>/dev/null | awk -F': ' '/HEAD branch/ {print $2}')
    fi

    if [ "$current_branch" != "HEAD" ]; then
      if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1 && [ -n "$default_branch" ] && [ "$current_branch" = "$default_branch" ]; then
        git branch --set-upstream-to "origin/$default_branch" || true
      fi
      info "Синхронизация: git pull --ff-only"
      if ! git pull --ff-only; then
        warn "Fast-forward невозможен (ветка разошлась). Выполните merge/rebase вручную."
      fi
    fi
  else
    warn "Есть незакоммиченные изменения — пропущен auto-pull. Сохраните (commit/stash), затем синхронизируйте."
  fi
else
  warn "remote 'origin' не настроен. Добавьте GitHub-репозиторий: git remote add origin <URL>"
fi

info "Готово."
