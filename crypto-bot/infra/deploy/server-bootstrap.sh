#!/usr/bin/env bash
# Bootstrap Ubuntu Server for crypto-bot deployment
set -euo pipefail

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git ufw

# Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
sudo usermod -aG docker "$USER" || true

# Docker Compose plugin (install system-wide)
if ! docker compose version >/dev/null 2>&1; then
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# Firewall (allow SSH)
sudo ufw allow OpenSSH || true
sudo ufw --force enable || true

echo "Bootstrap complete. If current session lacks docker permissions, run: newgrp docker"
