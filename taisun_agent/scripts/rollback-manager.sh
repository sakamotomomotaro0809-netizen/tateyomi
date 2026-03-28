#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Rollback Manager for TAISUN v2
# ============================================================
# 品質低下時の自動ロールバック機構
# Usage:
#   ./rollback-manager.sh backup              # 現在の状態をバックアップ
#   ./rollback-manager.sh list                # バックアップ一覧
#   ./rollback-manager.sh restore <backup>    # 指定バックアップから復元
#   ./rollback-manager.sh auto-rollback       # 品質チェック付き自動復元
#   ./rollback-manager.sh cleanup             # 古いバックアップ削除
# ============================================================

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/.claude/backups"
LOG_FILE="${PROJECT_DIR}/.claude/hooks/data/rollback-history.jsonl"
ANOMALY_DETECTOR="${PROJECT_DIR}/.claude/hooks/anomaly-detector.js"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# ユーティリティ関数
# ============================================================

log_action() {
    local action="$1"
    local backup_name="${2:-}"
    local status="$3"
    local message="${4:-}"

    local timestamp
    timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

    # ログディレクトリ作成
    mkdir -p "$(dirname "${LOG_FILE}")"

    # JSONL形式でログ出力
    cat >> "${LOG_FILE}" <<EOF
{"timestamp":"${timestamp}","action":"${action}","backup":"${backup_name}","status":"${status}","message":"${message}"}
EOF
}

get_backup_size() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        du -sh "$dir" 2>/dev/null | awk '{print $1}'
    else
        echo "0"
    fi
}

get_file_count() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        find "$dir" -type f | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

# ============================================================
# バックアップ作成
# ============================================================

cmd_backup() {
    echo -e "${BLUE}Creating backup...${NC}"

    local timestamp
    timestamp="$(date '+%Y%m%d-%H%M%S')"
    local backup_name="backup-${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    # バックアップディレクトリ作成
    mkdir -p "${backup_path}"

    # バックアップ対象
    local targets=(
        ".claude/CLAUDE.md"
        ".claude/hooks"
        ".claude/rules"
        ".claude/references"
        ".claude/settings.json"
    )

    local copied_count=0
    for target in "${targets[@]}"; do
        local src="${PROJECT_DIR}/${target}"
        if [[ -e "$src" ]]; then
            # rsync があれば使用、なければ cp
            if command -v rsync &> /dev/null; then
                rsync -a --quiet "${src}" "${backup_path}/" || {
                    echo -e "${YELLOW}Warning: Failed to copy ${target}${NC}" >&2
                    continue
                }
            else
                cp -r "${src}" "${backup_path}/" || {
                    echo -e "${YELLOW}Warning: Failed to copy ${target}${NC}" >&2
                    continue
                }
            fi
            ((copied_count++))
        fi
    done

    if [[ $copied_count -eq 0 ]]; then
        echo -e "${RED}Error: No files were backed up${NC}" >&2
        log_action "backup" "${backup_name}" "failed" "No files copied"
        rm -rf "${backup_path}"
        exit 1
    fi

    # バックアップサイズチェック（1MB制限）
    local size_bytes
    size_bytes=$(du -sk "${backup_path}" | awk '{print $1}')
    if [[ $size_bytes -gt 1024 ]]; then
        echo -e "${YELLOW}Warning: Backup size (${size_bytes}KB) exceeds 1MB limit${NC}" >&2
    fi

    local size
    size=$(get_backup_size "${backup_path}")
    local count
    count=$(get_file_count "${backup_path}")

    echo -e "${GREEN}✓ Backup created: ${backup_name}${NC}"
    echo -e "  Size: ${size}"
    echo -e "  Files: ${count}"
    echo -e "  Path: ${backup_path}"

    log_action "backup" "${backup_name}" "success" "Size: ${size}, Files: ${count}"
}

# ============================================================
# バックアップ一覧
# ============================================================

cmd_list() {
    echo -e "${BLUE}Available backups:${NC}"
    echo ""

    if [[ ! -d "${BACKUP_DIR}" ]] || [[ -z "$(ls -A "${BACKUP_DIR}" 2>/dev/null)" ]]; then
        echo -e "${YELLOW}No backups found${NC}"
        return 0
    fi

    # 新しい順にソート
    local backups
    backups=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "backup-*" | sort -r)

    printf "%-25s %-10s %-10s\n" "BACKUP NAME" "SIZE" "FILES"
    printf "%-25s %-10s %-10s\n" "------------------------" "----------" "----------"

    while IFS= read -r backup_path; do
        local backup_name
        backup_name=$(basename "${backup_path}")
        local size
        size=$(get_backup_size "${backup_path}")
        local count
        count=$(get_file_count "${backup_path}")

        printf "%-25s %-10s %-10s\n" "${backup_name}" "${size}" "${count}"
    done <<< "$backups"
}

# ============================================================
# 復元
# ============================================================

cmd_restore() {
    local backup_name="$1"
    local force="${2:-}"

    if [[ -z "$backup_name" ]]; then
        echo -e "${RED}Error: Backup name required${NC}" >&2
        echo "Usage: $0 restore <backup-name>" >&2
        exit 1
    fi

    local backup_path="${BACKUP_DIR}/${backup_name}"

    if [[ ! -d "$backup_path" ]]; then
        echo -e "${RED}Error: Backup not found: ${backup_name}${NC}" >&2
        exit 1
    fi

    # 確認メッセージ（--force で省略）
    if [[ "$force" != "--force" ]]; then
        echo -e "${YELLOW}⚠ This will restore from: ${backup_name}${NC}"
        echo -e "${YELLOW}⚠ Current state will be backed up first${NC}"
        read -p "Continue? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled"
            exit 0
        fi
    fi

    # 復元前に現在の状態をバックアップ
    echo -e "${BLUE}Backing up current state...${NC}"
    cmd_backup

    echo -e "${BLUE}Restoring from: ${backup_name}${NC}"

    # 復元対象
    local restored_count=0

    # CLAUDE.md
    if [[ -f "${backup_path}/.claude/CLAUDE.md" ]]; then
        cp "${backup_path}/.claude/CLAUDE.md" "${PROJECT_DIR}/.claude/CLAUDE.md" && ((restored_count++))
    fi

    # hooks/
    if [[ -d "${backup_path}/.claude/hooks" ]]; then
        rm -rf "${PROJECT_DIR}/.claude/hooks"
        cp -r "${backup_path}/.claude/hooks" "${PROJECT_DIR}/.claude/hooks" && ((restored_count++))
    fi

    # rules/
    if [[ -d "${backup_path}/.claude/rules" ]]; then
        rm -rf "${PROJECT_DIR}/.claude/rules"
        cp -r "${backup_path}/.claude/rules" "${PROJECT_DIR}/.claude/rules" && ((restored_count++))
    fi

    # references/
    if [[ -d "${backup_path}/.claude/references" ]]; then
        rm -rf "${PROJECT_DIR}/.claude/references"
        cp -r "${backup_path}/.claude/references" "${PROJECT_DIR}/.claude/references" && ((restored_count++))
    fi

    # settings.json
    if [[ -f "${backup_path}/.claude/settings.json" ]]; then
        cp "${backup_path}/.claude/settings.json" "${PROJECT_DIR}/.claude/settings.json" && ((restored_count++))
    fi

    if [[ $restored_count -eq 0 ]]; then
        echo -e "${RED}Error: No files were restored${NC}" >&2
        log_action "restore" "${backup_name}" "failed" "No files restored"
        exit 1
    fi

    echo -e "${GREEN}✓ Restored ${restored_count} items from ${backup_name}${NC}"
    log_action "restore" "${backup_name}" "success" "Items restored: ${restored_count}"
}

# ============================================================
# 品質チェック付き自動ロールバック
# ============================================================

cmd_auto_rollback() {
    echo -e "${BLUE}Running quality check...${NC}"

    # anomaly-detector.js 実行
    if [[ ! -f "${ANOMALY_DETECTOR}" ]]; then
        echo -e "${RED}Error: Anomaly detector not found: ${ANOMALY_DETECTOR}${NC}" >&2
        log_action "auto-rollback" "" "failed" "Anomaly detector not found"
        exit 1
    fi

    local detector_output
    detector_output=$(node "${ANOMALY_DETECTOR}" 2>&1) || {
        echo -e "${YELLOW}Warning: Anomaly detector failed to run${NC}" >&2
        echo "${detector_output}" >&2
        log_action "auto-rollback" "" "failed" "Detector execution failed"
        exit 1
    }

    # CRITICAL アラート数をカウント
    local critical_count
    critical_count=$(echo "${detector_output}" | grep -c "CRITICAL" || true)

    echo -e "Critical alerts detected: ${critical_count}"

    if [[ $critical_count -ge 2 ]]; then
        echo -e "${RED}⚠ CRITICAL threshold exceeded (${critical_count} alerts)${NC}"
        echo -e "${YELLOW}Initiating automatic rollback...${NC}"

        # 最新のバックアップを取得
        local latest_backup
        latest_backup=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "backup-*" | sort -r | head -1)

        if [[ -z "$latest_backup" ]]; then
            echo -e "${RED}Error: No backups available for rollback${NC}" >&2
            log_action "auto-rollback" "" "failed" "No backups available"
            exit 1
        fi

        local backup_name
        backup_name=$(basename "${latest_backup}")

        echo -e "${BLUE}Rolling back to: ${backup_name}${NC}"
        cmd_restore "${backup_name}" "--force"

        echo -e "${GREEN}✓ Automatic rollback completed${NC}"
        log_action "auto-rollback" "${backup_name}" "success" "Critical alerts: ${critical_count}"
    else
        echo -e "${GREEN}✓ Quality check passed (${critical_count} critical alerts)${NC}"
        log_action "auto-rollback" "" "skipped" "No rollback needed (${critical_count} alerts)"
    fi
}

# ============================================================
# クリーンアップ
# ============================================================

cmd_cleanup() {
    echo -e "${BLUE}Cleaning up old backups...${NC}"

    if [[ ! -d "${BACKUP_DIR}" ]]; then
        echo -e "${YELLOW}No backup directory found${NC}"
        return 0
    fi

    # 最新3つを保持リストに追加
    local keep_list
    keep_list=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "backup-*" | sort -r | head -3)

    # 7日以上古いバックアップを検索
    local old_backups
    old_backups=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "backup-*" -mtime +7)

    local deleted_count=0

    while IFS= read -r backup_path; do
        if [[ -z "$backup_path" ]]; then
            continue
        fi

        # 保持リストに含まれているかチェック
        if echo "${keep_list}" | grep -q "^${backup_path}$"; then
            continue
        fi

        local backup_name
        backup_name=$(basename "${backup_path}")

        echo -e "  Deleting: ${backup_name}"
        rm -rf "${backup_path}"
        ((deleted_count++))

        log_action "cleanup" "${backup_name}" "deleted" "Old backup removed"
    done <<< "$old_backups"

    if [[ $deleted_count -eq 0 ]]; then
        echo -e "${GREEN}✓ No old backups to clean up${NC}"
    else
        echo -e "${GREEN}✓ Deleted ${deleted_count} old backup(s)${NC}"
    fi
}

# ============================================================
# メインコマンド処理
# ============================================================

main() {
    local cmd="${1:-}"

    case "$cmd" in
        backup)
            cmd_backup
            ;;
        list)
            cmd_list
            ;;
        restore)
            cmd_restore "${2:-}" "${3:-}"
            ;;
        auto-rollback)
            cmd_auto_rollback
            ;;
        cleanup)
            cmd_cleanup
            ;;
        *)
            echo "Usage: $0 {backup|list|restore|auto-rollback|cleanup}"
            echo ""
            echo "Commands:"
            echo "  backup              Create a backup of current state"
            echo "  list                List all available backups"
            echo "  restore <backup>    Restore from specified backup"
            echo "  auto-rollback       Check quality and rollback if needed"
            echo "  cleanup             Remove backups older than 7 days (keep latest 3)"
            exit 1
            ;;
    esac
}

main "$@"
