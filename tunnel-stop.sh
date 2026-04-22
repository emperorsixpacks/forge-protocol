#!/usr/bin/env bash
# Stop all running Forge tunnels
if [ -f /tmp/forge-tunnel-pids ]; then
  while read pid; do kill "$pid" 2>/dev/null; done < /tmp/forge-tunnel-pids
  rm /tmp/forge-tunnel-pids
  echo "All tunnels stopped."
else
  pkill -f "cloudflared tunnel" 2>/dev/null && echo "Tunnels stopped." || echo "No tunnels running."
fi
