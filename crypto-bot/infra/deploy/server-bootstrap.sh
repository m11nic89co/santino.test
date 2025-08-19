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

# Docker Compose plugin
if ! command -v docker compose >/dev/null 2>&1; then
  DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
  mkdir -p $DOCKER_CONFIG/cli-plugins
  curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
  chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
fi

# Firewall (allow SSH)
sudo ufw allow OpenSSH || true
sudo ufw --force enable || true

echo "Bootstrap complete. Re-login to apply docker group permissions."
