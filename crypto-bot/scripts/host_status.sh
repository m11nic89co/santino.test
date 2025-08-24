#!/usr/bin/env bash
echo "=== HOST ==="
uname -a

echo
echo "=== UPTIME & LOAD ==="
uptime

echo
echo "=== CPU INFO ==="
lscpu | egrep "^Model name|^CPU\(s\)|^Thread|^Core|^Socket|^Architecture" || true

echo
echo "=== MEM ==="
free -m

echo
echo "=== SWAP ==="
swapon --show || echo "(no swap)"

echo
echo "=== DISK /opt and / (df -h) ==="
df -h /opt / || true

echo
echo "=== TOP MEM PROCS ==="
ps -eo pid,pmem,pcpu,vsz,rss,etime,cmd --sort=-pmem | head -n 15

echo
echo "=== TOP CPU PROCS ==="
ps -eo pid,pmem,pcpu,etime,cmd --sort=-pcpu | head -n 15

echo
echo "=== PYTHON COUNT ==="
pgrep -fc python3 || true

echo
echo "=== ACTIVE BOTS ==="
pgrep -af src.cryptobot.grid_bot || true

