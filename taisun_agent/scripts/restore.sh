#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Simple Restore Script for TAISUN v2
# ============================================================
# 1コマンドで最新または指定バックアップから復元
# Usage:
#   ./restore.sh                    # 最新バックアップから復元
#   ./restore.sh backup-20260215-120000  # 指定バックアップから復元
#   ./restore.sh --force            # 確認なしで最新から復元
# ============================================================

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/.claude/backups"
ROLLBACK_MANAGER="${SCRIPT_DIR}/rollback-manager.sh"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# メイン処理
# ============================================================

main() {
    local backup_name="${1:-}"
    local force=""

    # rollback-manager.sh の存在チェック
    if [[ ! -f "${ROLLBACK_MANAGER}" ]]; then
        echo -e "${RED}Error: rollback-manager.sh not found: ${ROLLBACK_MANAGER}${NC}" >&2
        exit 1
    fi

    # --force フラグチェック
    if [[ "$backup_name" == "--force" ]]; then
        force="--force"
        backup_name=""
    fi

    # バックアップ名が指定されていない場合は最新を取得
    if [[ -z "$backup_name" ]]; then
        echo -e "${BLUE}Finding latest backup...${NC}"

        if [[ ! -d "${BACKUP_DIR}" ]]; then
            echo -e "${RED}Error: No backup directory found${NC}" >&2
            exit 1
        fi

        local latest_backup
        latest_backup=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "backup-*" 2>/dev/null | sort -r | head -1)

        if [[ -z "$latest_backup" ]]; then
            echo -e "${RED}Error: No backups available${NC}" >&2
            echo -e "${YELLOW}Hint: Create a backup first with: ${ROLLBACK_MANAGER} backup${NC}" >&2
            exit 1
        fi

        backup_name=$(basename "${latest_backup}")
        echo -e "${BLUE}Latest backup: ${backup_name}${NC}"
    fi

    # バックアップの存在チェック
    if [[ ! -d "${BACKUP_DIR}/${backup_name}" ]]; then
        echo -e "${RED}Error: Backup not found: ${backup_name}${NC}" >&2
        echo ""
        echo -e "${BLUE}Available backups:${NC}"
        bash "${ROLLBACK_MANAGER}" list
        exit 1
    fi

    # rollback-manager.sh を呼び出し
    if [[ -n "$force" ]]; then
        bash "${ROLLBACK_MANAGER}" restore "${backup_name}" --force
    else
        bash "${ROLLBACK_MANAGER}" restore "${backup_name}"
    fi
}

# ヘルプメッセージ
show_help() {
    cat << EOF
Simple Restore Script for TAISUN v2

Usage:
  $0                          Restore from latest backup
  $0 <backup-name>            Restore from specified backup
  $0 --force                  Restore from latest without confirmation

Examples:
  $0                          # Restore from latest backup
  $0 backup-20260215-120000   # Restore from specific backup
  $0 --force                  # Restore from latest (no confirmation)

To list available backups:
  ${ROLLBACK_MANAGER} list

To create a new backup:
  ${ROLLBACK_MANAGER} backup
EOF
}

# ============================================================
# 引数処理
# ============================================================

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

main "$@"
