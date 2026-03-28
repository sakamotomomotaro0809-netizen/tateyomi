#!/bin/bash
# launchd 専用バックアップラッパー
# Desktop (TCC保護) にアクセスせず、~/.taisun-data/ にデータを保存
# 元スクリプト: scripts/auto-session-backup.sh（手動実行用）

set -o pipefail

DATA_DIR="$HOME/.taisun-data"
STATE_DIR="$DATA_DIR/workflow_state_backups"
LOG_DIR="$DATA_DIR/backup_logs"
RETENTION_DAYS=30

mkdir -p "$STATE_DIR" "$LOG_DIR"

LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

save_system_state() {
    local state_file="$STATE_DIR/state-$(date +%s).json"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    local mem_free="unknown"
    if command -v vm_stat &>/dev/null; then
        mem_free="$(vm_stat | awk '/Pages free/ { gsub("\\.", "", $3); print $3 }')"
        mem_free="${mem_free:-unknown}"
    fi

    local disk_avail
    disk_avail="$(df -h "$HOME" | awk 'NR==2 {print $4}')"

    local load_avg
    load_avg="$(sysctl -n vm.loadavg 2>/dev/null | tr -d '{}')"

    cat > "$state_file" <<JSONEOF
{
  "timestamp": "$timestamp",
  "memory_free_pages": "$mem_free",
  "disk_available": "$disk_avail",
  "load_average": "${load_avg:-unknown}",
  "source": "launchd-auto"
}
JSONEOF

    log_message "システム状態保存: $state_file"
}

cleanup_old() {
    find "$STATE_DIR" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null
    find "$LOG_DIR" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null
    log_message "古いバックアップ削除完了"
}

main() {
    log_message "========== launchd バックアップ開始 =========="
    save_system_state
    cleanup_old
    log_message "========== launchd バックアップ完了 =========="
}

main
