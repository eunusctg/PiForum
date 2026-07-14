#!/bin/bash
# PiForum Dev Server — auto-restart wrapper
# Restarts the Next.js dev server if it crashes (e.g. OOM during
# Turbopack compilation).  The compiled page cache survives restarts
# so subsequent loads are fast.
cd /home/z/my-project

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "[start-dev] Starting Next.js dev server (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)..."
  node --max-old-space-size=2048 node_modules/next/dist/bin/next dev -p 3000
  EXIT_CODE=$?
  echo "[start-dev] Server exited with code $EXIT_CODE"
  if [ $EXIT_CODE -eq 0 ]; then
    echo "[start-dev] Clean shutdown, exiting."
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "[start-dev] Restarting in 3 seconds..."
  sleep 3
done

echo "[start-dev] Max retries reached, exiting."
