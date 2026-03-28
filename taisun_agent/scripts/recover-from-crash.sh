#!/bin/bash
# 強制終了からの完全復旧スクリプト

set -e

RECOVERY_START=$(date +%s)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECOVERY_LOG="/tmp/crash-recovery-$(date +%s).log"
RECOVERED_COUNT=0

cd "$PROJECT_ROOT"

echo "=== Crash Recovery System ===" | tee "$RECOVERY_LOG"
echo "Time: $(date)" | tee -a "$RECOVERY_LOG"
echo "Project: $PROJECT_ROOT" | tee -a "$RECOVERY_LOG"
echo "" | tee -a "$RECOVERY_LOG"

echo "[Phase 1] Checking crash logs..." | tee -a "$RECOVERY_LOG"
CURSOR_CRASHES=$(find "$HOME/Library/Logs/DiagnosticMessages" -name "*.crash" -type f -mmin -5 2>/dev/null | wc -l | tr -d ' ')
echo "Found $CURSOR_CRASHES recent crashes" | tee -a "$RECOVERY_LOG"

echo "[Phase 2] Restoring Git state..." | tee -a "$RECOVERY_LOG"
if git stash list | grep -q "autosave"; then
  echo "Found autosave stashes:" | tee -a "$RECOVERY_LOG"
  git stash list | grep "autosave" | tee -a "$RECOVERY_LOG"
  LATEST_STASH=$(git stash list | grep "autosave" | head -1 | cut -d: -f1)
  echo "Restoring: $LATEST_STASH..." | tee -a "$RECOVERY_LOG"
  git stash pop "$LATEST_STASH" 2>/dev/null || true
  RECOVERED_COUNT=$((RECOVERED_COUNT + 1))
fi

if ! git diff-files --quiet; then
  echo "Uncommitted changes found:" | tee -a "$RECOVERY_LOG"
  git status --short | tee -a "$RECOVERY_LOG"
  RECOVERED_COUNT=$((RECOVERED_COUNT + 1))
fi

echo "[Phase 3] Restoring Claude Code session..." | tee -a "$RECOVERY_LOG"
CLAUDE_DIR="$HOME/.claude"
if [ -d "$CLAUDE_DIR/session-env" ]; then
  LATEST_SESSION=$(ls -t "$CLAUDE_DIR/session-env/" 2>/dev/null | head -1 || true)
  if [ -n "$LATEST_SESSION" ]; then
    echo "Latest session: $LATEST_SESSION" | tee -a "$RECOVERY_LOG"
    if [ -f "$CLAUDE_DIR/session-env/$LATEST_SESSION/env" ]; then
      # shellcheck disable=SC1090
      source "$CLAUDE_DIR/session-env/$LATEST_SESSION/env"
      echo "Session environment variables restored" | tee -a "$RECOVERY_LOG"
      RECOVERED_COUNT=$((RECOVERED_COUNT + 1))
    fi
  fi
fi

echo "[Phase 4] Cleanup memory..." | tee -a "$RECOVERY_LOG"
sync
purge 2>/dev/null || true
echo "Memory cleaned" | tee -a "$RECOVERY_LOG"

echo "[Phase 5] Verifying filesystem..." | tee -a "$RECOVERY_LOG"
find "$PROJECT_ROOT" -name ".DS_Store" -delete
find "$PROJECT_ROOT" -name "*.tmp" -mmin -30 -delete
npm cache clean --force 2>/dev/null || true
echo "Filesystem verified" | tee -a "$RECOVERY_LOG"

END_TS=$(date +%s)
RECOVERY_TIME=$((END_TS - RECOVERY_START))

echo "" | tee -a "$RECOVERY_LOG"
echo "=== Recovery Summary ===" | tee -a "$RECOVERY_LOG"
echo "Items recovered: $RECOVERED_COUNT" | tee -a "$RECOVERY_LOG"
echo "Recovery time: ${RECOVERY_TIME}s" | tee -a "$RECOVERY_LOG"
echo "Recovery log: $RECOVERY_LOG" | tee -a "$RECOVERY_LOG"

echo ""
echo "✅ Recovery complete!"
echo "📝 Log saved to: $RECOVERY_LOG"
echo "📊 Items recovered: $RECOVERED_COUNT"
