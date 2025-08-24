#!/usr/bin/env bash
set -euo pipefail

# Ensure workspace ownership for mounted volume paths
if [ -n "${LOCAL_USER_ID:-}" ]; then
  echo "Setting local UID/GID to: ${LOCAL_USER_ID}"
  addgroup --gid ${LOCAL_USER_ID} dockeruser 2>/dev/null || true
  adduser --disabled-password --gecos "" --uid ${LOCAL_USER_ID} --gid ${LOCAL_USER_ID} dockeruser 2>/dev/null || true
  chown -R ${LOCAL_USER_ID}:${LOCAL_USER_ID} /workspace || true
fi

# Ensure outgoing dir exists
mkdir -p /workspace/scripts/screenshots/outgoing
chmod -R a+rw /workspace/scripts/screenshots/outgoing || true

# If the user passed a command, exec it, otherwise run default CMD
exec "$@"
