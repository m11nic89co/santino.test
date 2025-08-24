#!/usr/bin/env bash
# snapshot_grid.sh — sleep 2 hours, then save log + state snapshots and a small summary
SLEEP_SECONDS=${1:-7200}
TS=$(date -u +%Y%m%dT%H%M%SZ)
REPORT_DIR="/opt/crypto-bot/reports"
LOG_FILE="/opt/crypto-bot/logs/grid_bot.log"
STATE_FILE="/opt/crypto-bot/grid_state_DOGE.json"
mkdir -p "$REPORT_DIR"

# sleep for configured time
sleep ${SLEEP_SECONDS}
TS=$(date -u +%Y%m%dT%H%M%SZ)
SNAP_PREFIX="$REPORT_DIR/grid_snapshot_${TS}"

# tail log
if [ -f "$LOG_FILE" ]; then
  tail -n 500 "$LOG_FILE" > "${SNAP_PREFIX}.log"
else
  echo "(no log file)" > "${SNAP_PREFIX}.log"
fi

# copy state and produce json (use jq if available)
if [ -f "$STATE_FILE" ]; then
  if command -v jq >/dev/null 2>&1; then
    jq . "$STATE_FILE" > "${SNAP_PREFIX}.state.json" 2>/dev/null || cp "$STATE_FILE" "${SNAP_PREFIX}.state.json"
  else
    cp "$STATE_FILE" "${SNAP_PREFIX}.state.json"
  fi
  # produce small summary
  if command -v jq >/dev/null 2>&1; then
    USDT=$(jq -r '.balances.USDT // .balances["USDT"] // "0"' "$STATE_FILE")
    DOGE=$(jq -r '.balances.DOGE // .balances["DOGE"] // "0"' "$STATE_FILE")
    ORDERS=$(jq '.orders | length' "$STATE_FILE" 2>/dev/null || echo "0")
    FILLS=$(jq '.fills | length' "$STATE_FILE" 2>/dev/null || echo "0")
  else
    USDT="(jq N/A)"
    DOGE="(jq N/A)"
    ORDERS="N/A"
    FILLS="N/A"
  fi
  echo "${TS} USDT=${USDT} DOGE=${DOGE} orders=${ORDERS} fills=${FILLS}" > "${SNAP_PREFIX}.summary.txt"
else
  echo "${TS} no state file" > "${SNAP_PREFIX}.summary.txt"
fi

# final message to logs
echo "Snapshot completed: ${SNAP_PREFIX}.*" >> /opt/crypto-bot/logs/snapshot_grid.log 2>/dev/null || true
