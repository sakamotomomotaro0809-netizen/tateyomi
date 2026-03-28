#!/bin/bash
# launchd 専用クラッシュ復旧ラッパー
# Desktop (TCC保護) にアクセスせず、基本的な復旧チェックのみ実行
# 元スクリプト: scripts/recover-from-crash.sh（手動実行用）

set -e

RECOVERY_START=$(date +%s)
DATA_DIR="$HOME/.taisun-data"
RECOVERY_LOG="$DATA_DIR/recovery-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$DATA_DIR"

echo "=== Crash Recovery System (launchd) ===" | tee "$RECOVERY_LOG"
echo "Time: $(date)" | tee -a "$RECOVERY_LOG"

echo "[Phase 1] Checking recent crash logs..." | tee -a "$RECOVERY_LOG"
CRASH_COUNT=$(find "$HOME/Library/Logs/DiagnosticMessages" -name "*.crash" -type f -mmin -5 2>/dev/null | wc -l | tr -d ' ')
echo "Found $CRASH_COUNT recent crashes" | tee -a "$RECOVERY_LOG"

echo "[Phase 2] Memory cleanup..." | tee -a "$RECOVERY_LOG"
sync
purge 2>/dev/null || true
echo "Memory cleaned" | tee -a "$RECOVERY_LOG"

echo "[Phase 3] System health..." | tee -a "$RECOVERY_LOG"
DISK_AVAIL=$(df -h "$HOME" | awk 'NR==2 {print $4}')
echo "Disk available: $DISK_AVAIL" | tee -a "$RECOVERY_LOG"

END_TS=$(date +%s)
RECOVERY_TIME=$((END_TS - RECOVERY_START))

echo "" | tee -a "$RECOVERY_LOG"
echo "=== Recovery Summary ===" | tee -a "$RECOVERY_LOG"
echo "Recovery time: ${RECOVERY_TIME}s" | tee -a "$RECOVERY_LOG"
echo "Log: $RECOVERY_LOG" | tee -a "$RECOVERY_LOG"
