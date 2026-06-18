#!/bin/sh
# ============================================================
# PiForum — Serv00.com Startup Script
# ============================================================
# Place at: ~/piforum/start-serv00.sh
# Make executable: chmod +x start-serv00.sh
#
# Usage:
#   ./start-serv00.sh           # start (or restart if running)
#   ./start-serv00.sh stop      # stop
#   ./start-serv00.sh status    # show status
#   ./start-serv00.sh logs      # tail logs
# ============================================================

set -e

# ---- CONFIG (edit these) ----
APP_DIR="$HOME/piforum"
PORT=3000
PM2_BIN="$HOME/.npm-global/bin/pm2"

# Ensure npm global bin is in PATH
export PATH="$HOME/.npm-global/bin:$HOME/.bun/bin:$PATH"

cd "$APP_DIR"

mkdir -p logs

case "$1" in
  stop)
    if command -v "$PM2_BIN" >/dev/null 2>&1; then
      "$PM2_BIN" stop piforum || true
      "$PM2_BIN" delete piforum || true
    else
      pkill -f "next/standalone/server.js" || true
    fi
    echo "PiForum stopped."
    ;;

  status)
    if command -v "$PM2_BIN" >/dev/null 2>&1; then
      "$PM2_BIN" status
      "$PM2_BIN" describe piforum 2>/dev/null || echo "Not running under PM2."
    else
      pgrep -fa "next/standalone/server.js" || echo "Not running."
    fi
    ;;

  logs)
    if command -v "$PM2_BIN" >/dev/null 2>&1; then
      "$PM2_BIN" logs piforum --lines 100
    else
      tail -n 100 logs/out.log logs/error.log 2>/dev/null
    fi
    ;;

  restart)
    "$0" stop
    sleep 2
    "$0" start
    ;;

  start|*)
    # Try PM2 first (preferred — auto-restart on crash)
    if command -v "$PM2_BIN" >/dev/null 2>&1; then
      echo "Starting PiForum with PM2..."
      "$PM2_BIN" startOrReload ecosystem.config.cjs
      "$PM2_BIN" save
      echo "PiForum started on port $PORT (PM2)."
    else
      # Fallback: nohup
      echo "PM2 not found. Starting with nohup..."
      pkill -f "next/standalone/server.js" 2>/dev/null || true
      nohup node .next/standalone/server.js > logs/out.log 2> logs/error.log &
      echo $! > logs/piforum.pid
      echo "PiForum started on port $PORT (PID $(cat logs/piforum.pid))."
    fi
    ;;
esac
