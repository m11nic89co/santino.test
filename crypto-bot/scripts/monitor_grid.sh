#!/bin/bash
# monitor_grid.sh — покажет status grid_bot каждые 5 секунд (останавливается Ctrl+C)
while true; do
  echo "================================================================"
  echo "=== $(date) ==="
  echo "--- process ---"
  pgrep -af src.cryptobot.grid_bot || true
  echo
  echo "--- log (last 40 lines) ---"
  tail -n 40 /opt/crypto-bot/logs/grid_bot.log || true
  echo
  echo "--- sim state ---"
  if [ -f /opt/crypto-bot/grid_state_DOGE.json ]; then
    if command -v jq >/dev/null 2>&1; then
      jq . /opt/crypto-bot/grid_state_DOGE.json || cat /opt/crypto-bot/grid_state_DOGE.json
    else
      cat /opt/crypto-bot/grid_state_DOGE.json
    fi
  else
    echo "(no /opt/crypto-bot/grid_state_DOGE.json)"
  fi
  echo
  sleep 5
done
