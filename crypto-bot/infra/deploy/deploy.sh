#!/usr/bin/env bash
# Deploy crypto-bot to a remote VPS via SSH/rsync
set -euo pipefail

REMOTE_HOST=${REMOTE_HOST:?set REMOTE_HOST}
REMOTE_USER=${REMOTE_USER:-root}
REMOTE_DIR=${REMOTE_DIR:-/opt/crypto-bot}

# Sync repo subset (exclude venv, tests, caches)
rsync -az --delete \
  --exclude '.git' --exclude '.venv' --exclude '__pycache__' --exclude 'tests' \
  --exclude '.pytest_cache' --exclude '.mypy_cache' --exclude '.ruff_cache' --exclude '.env' \
  ./ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
  set -e
  cd "$REMOTE_DIR"
  mkdir -p data
  # Build and run
  docker compose build
  docker compose up -d
  docker compose ps
EOF

echo "Deploy complete."
