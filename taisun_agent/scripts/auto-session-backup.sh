#!/bin/bash

set -o pipefail

# ============ 設定 ============
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/Desktop/開発2026/taisun_agent2026}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECTS_DIR/.backups}"
STATE_DIR="${STATE_DIR:-$PROJECTS_DIR/.workflow_state_backups}"
LOG_DIR="${LOG_DIR:-$PROJECTS_DIR/.backup_logs}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-60}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MEMORY_FREE_PAGES_CRITICAL="${MEMORY_FREE_PAGES_CRITICAL:-500000}"
MEMORY_FREE_PAGES_WARNING="${MEMORY_FREE_PAGES_WARNING:-1000000}"

# ============ 初期化 ============
mkdir -p "$BACKUP_DIR" "$STATE_DIR" "$LOG_DIR"
LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_memory_pressure() {
    if command -v vm_stat &>/dev/null; then
        local free_pages
        free_pages="$(vm_stat | awk '/Pages free/ { gsub("\\.", "", $3); print $3 }')"
        if [[ -n "$free_pages" ]] && (( free_pages < MEMORY_FREE_PAGES_CRITICAL )); then
            return 2
        elif [[ -n "$free_pages" ]] && (( free_pages < MEMORY_FREE_PAGES_WARNING )); then
            return 1
        fi
    fi
    return 0
}

backup_git_state() {
    log_message "Git状態バックアップ開始"
    cd "$PROJECTS_DIR" || return 1

    local state_file="$STATE_DIR/git-state-$(date +%s).json"
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    local branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
    local changes="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
    local commit="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    local staged="$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')"
    local stash="$(git stash list 2>/dev/null | wc -l | tr -d ' ')"

    cat > "$state_file" <<JSONEOF
{
  "timestamp": "$timestamp",
  "branch": "$branch",
  "uncommitted_changes": $changes,
  "last_commit": "$commit",
  "staged_files": $staged,
  "stash_count": $stash
}
JSONEOF

    log_message "Git状態保存完了: $state_file"
}

auto_stash_if_needed() {
    check_memory_pressure
    local pressure=$?

    if (( pressure >= 2 )); then
        log_message "CRITICAL メモリ圧力検出"
        cd "$PROJECTS_DIR" || return 1

        local uncommitted
        uncommitted="$(git status --porcelain 2>/dev/null | awk '$1 != "??" {print}')"
        if [[ -n "$uncommitted" ]]; then
            git stash push -m "AUTO-STASH-$(date +%Y%m%d-%H%M%S)" -u --all 2>&1 | tee -a "$LOG_FILE"
            log_message "オートスタッシュ完了"
        fi
    elif (( pressure >= 1 )); then
        log_message "WARNING メモリ圧力検出"
    fi
}

create_checkpoint_commit() {
    log_message "チェックポイントコミット作成"
    cd "$PROJECTS_DIR" || return 1

    if [[ "${SKIP_CHECKPOINT_COMMIT:-0}" == "1" ]]; then
        log_message "チェックポイントコミットをスキップ"
        return 0
    fi

    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        git add -A 2>&1 | tee -a "$LOG_FILE"
        git commit --allow-empty \
            -m "CHECKPOINT: オートバックアップ $(date +%Y-%m-%d\ %H:%M:%S)" \
            -m "Memory status: $(check_memory_pressure; echo $?)" \
            2>&1 | tee -a "$LOG_FILE"
        log_message "チェックポイントコミット作成完了"
    else
        log_message "変更なし - スキップ"
    fi
}

cleanup_old_backups() {
    log_message "古いバックアップ削除"
    find "$STATE_DIR" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null
    find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null
    log_message "クリーンアップ完了"
}

main() {
    log_message "========== バックアップサイクル開始 =========="
    backup_git_state
    auto_stash_if_needed
    create_checkpoint_commit
    cleanup_old_backups
    log_message "========== バックアップサイクル完了 =========="
}

main
