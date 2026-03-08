#!/bin/bash
# ============================================================================
# Engram Watch — Background File Watcher
# Monitors your engram project files and auto-regenerates VISUALIZER.html
# whenever ENGRAM-LOG.md (or other tracked files) change.
#
# No dependencies beyond bash and Python 3 (stdlib only).
#
# Usage:
#   ./engram-watch.sh                    # watch project in same dir, foreground
#   ./engram-watch.sh --dir ~/myproject  # watch a specific project dir
#   ./engram-watch.sh --daemon           # run in background
#   ./engram-watch.sh stop               # stop the background daemon
#   ./engram-watch.sh status             # check if daemon is running
#   ./engram-watch.sh restart            # restart daemon
#
# How it works:
#   Polls ENGRAM-LOG.md, DECISIONS.md, STATE.md, ENGRAM.md, AGENTS.md every
#   5 seconds. When any file changes (mtime or size), it runs update-visualizer.sh.
#   The browser auto-refreshes every 30 seconds via a <meta> tag in the HTML.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
INTERVAL=5          # seconds between polls
PID_FILE="$SCRIPT_DIR/.engram-watch.pid"
LOG_FILE="$SCRIPT_DIR/.engram-watch.log"
UPDATER="$SCRIPT_DIR/update-visualizer.sh"

# ── Parse arguments ───────────────────────────────────────────────────────
DAEMON=false
COMMAND="watch"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dir)        PROJECT_DIR="$(cd "$2" && pwd)"; shift 2 ;;
    --daemon|-d)  DAEMON=true; shift ;;
    --interval)   INTERVAL="$2"; shift 2 ;;
    stop)         COMMAND="stop"; shift ;;
    status)       COMMAND="status"; shift ;;
    restart)      COMMAND="restart"; shift ;;
    -h|--help)
      echo "Usage: engram-watch.sh [--dir PATH] [--daemon] [stop|status|restart]"
      echo "  --dir PATH     Project directory to watch (default: script directory)"
      echo "  --daemon       Run in background"
      echo "  stop           Stop the background daemon"
      echo "  status         Check if daemon is running"
      echo "  restart        Restart the daemon"
      exit 0
      ;;
    *) echo "Unknown option: $1. Use -h for help."; exit 1 ;;
  esac
done

# ── Commands ──────────────────────────────────────────────────────────────
cmd_status() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "✓ engram-watch is running (PID $PID)"
      echo "  Project: $PROJECT_DIR"
      echo "  Log: $LOG_FILE"
      return 0
    else
      echo "✗ PID file exists but process $PID is not running"
      rm -f "$PID_FILE"
      return 1
    fi
  else
    echo "✗ engram-watch is not running"
    return 1
  fi
}

cmd_stop() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID"
      rm -f "$PID_FILE"
      echo "✓ engram-watch stopped (PID $PID)"
    else
      echo "Process $PID not found — removing stale PID file"
      rm -f "$PID_FILE"
    fi
  else
    echo "engram-watch is not running"
  fi
}

case "$COMMAND" in
  stop)    cmd_stop; exit 0 ;;
  status)  cmd_status; exit $? ;;
  restart) cmd_stop; DAEMON=true ;;
esac

# ── Validation ────────────────────────────────────────────────────────────
if [ ! -f "$UPDATER" ]; then
  echo "Error: update-visualizer.sh not found at $SCRIPT_DIR"
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: project directory not found: $PROJECT_DIR"
  exit 1
fi

# ── Daemon mode ───────────────────────────────────────────────────────────
if [ "$DAEMON" = true ]; then
  if cmd_status &>/dev/null; then
    echo "engram-watch is already running. Use 'restart' to restart it."
    exit 1
  fi
  # Re-launch self in background, stripping --daemon flag
  nohup bash "$0" --dir "$PROJECT_DIR" --interval "$INTERVAL" \
    >> "$LOG_FILE" 2>&1 &
  BGPID=$!
  echo $BGPID > "$PID_FILE"
  echo "✓ engram-watch started in background (PID $BGPID)"
  echo "  Project:  $PROJECT_DIR"
  echo "  Interval: ${INTERVAL}s"
  echo "  Log:      $LOG_FILE"
  echo "  Stop:     ./engram-watch.sh stop"
  exit 0
fi

# ── Watched files ─────────────────────────────────────────────────────────
WATCHED_FILES=(
  "$PROJECT_DIR/ENGRAM-LOG.md"
  "$PROJECT_DIR/DECISIONS.md"
  "$PROJECT_DIR/STATE.md"
  "$PROJECT_DIR/ENGRAM.md"
  "$PROJECT_DIR/AGENTS.md"
)

# ── Get fingerprint (mtime+size) for all watched files ───────────────────
fingerprint() {
  local fp=""
  for f in "${WATCHED_FILES[@]}"; do
    if [ -f "$f" ]; then
      # stat is cross-platform: mtime + size
      fp+=$(python3 -c "
import os
s = os.stat('$f')
print(int(s.st_mtime), s.st_size)
" 2>/dev/null || echo "0 0")
    fi
  done
  echo "$fp"
}

# ── Main watch loop ───────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Engram Watch — Active"
echo "  Project:  $PROJECT_DIR"
echo "  Interval: ${INTERVAL}s"
echo "  Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LAST_FP=$(fingerprint)

# Run once on start to ensure VISUALIZER.html is current
echo "[$(date '+%H:%M:%S')] Initial update..."
bash "$UPDATER" --dir "$PROJECT_DIR" --quiet 2>&1 || \
  bash "$UPDATER" --dir "$PROJECT_DIR" 2>&1
echo "[$(date '+%H:%M:%S')] VISUALIZER.html ready. Watching for changes..."
echo ""

while true; do
  sleep "$INTERVAL"
  CURRENT_FP=$(fingerprint)

  if [ "$CURRENT_FP" != "$LAST_FP" ]; then
    TS=$(date '+%H:%M:%S')
    echo "[$TS] Change detected — regenerating VISUALIZER.html..."
    if bash "$UPDATER" --dir "$PROJECT_DIR" --quiet 2>&1 || \
       bash "$UPDATER" --dir "$PROJECT_DIR" 2>&1; then
      echo "[$TS] ✓ Done"
    else
      echo "[$TS] ✗ update-visualizer.sh failed (check output above)"
    fi
    LAST_FP="$CURRENT_FP"
    echo ""
  fi
done
