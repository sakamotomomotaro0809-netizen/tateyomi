#!/bin/bash
# 自動バックアップシステムのセットアップ
# Usage: bash scripts/setup-auto-backup.sh {install|uninstall|status}
#
# launchd は macOS TCC により Desktop 配下にアクセスできないため、
# 軽量ラッパースクリプトを ~/.taisun-scripts/ に配置して実行する。
# フル機能版 (git操作含む) は手動で実行: bash scripts/auto-session-backup.sh

set -euo pipefail

ACTION="${1:-install}"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHD_DIR="$PROJECT_DIR/scripts/launchd"

BACKUP_PLIST="com.taisun.auto-backup.plist"
RECOVERY_PLIST="com.taisun.crash-recovery.plist"
SCRIPTS_DEST="$HOME/.taisun-scripts"
DATA_DIR="$HOME/.taisun-data"

case "$ACTION" in
  install)
    echo "=== 自動バックアップシステム インストール ==="

    # 1. データディレクトリ作成（TCC保護外）
    mkdir -p "$DATA_DIR/workflow_state_backups"
    mkdir -p "$DATA_DIR/backup_logs"
    # プロジェクト内ディレクトリも作成（手動実行用）
    mkdir -p "$PROJECT_DIR/.backups"
    mkdir -p "$PROJECT_DIR/.workflow_state_backups"
    mkdir -p "$PROJECT_DIR/.backup_logs"
    echo "[1/5] ディレクトリ作成完了"

    # 2. launchd用ラッパースクリプトをコピー
    mkdir -p "$SCRIPTS_DEST"
    cp "$PROJECT_DIR/scripts/launchd/launchd-backup-wrapper.sh" "$SCRIPTS_DEST/" 2>/dev/null || true
    cp "$PROJECT_DIR/scripts/launchd/launchd-recovery-wrapper.sh" "$SCRIPTS_DEST/" 2>/dev/null || true
    # フル版スクリプトもコピー（手動実行用）
    cp "$PROJECT_DIR/scripts/auto-session-backup.sh" "$SCRIPTS_DEST/"
    cp "$PROJECT_DIR/scripts/recover-from-crash.sh" "$SCRIPTS_DEST/"
    chmod +x "$SCRIPTS_DEST"/*.sh
    echo "[2/5] スクリプトコピー完了 ($SCRIPTS_DEST)"

    # 3. LaunchAgents ディレクトリ確認 + 既存の登録を解除
    mkdir -p "$LAUNCH_AGENTS_DIR"
    launchctl unload "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST" 2>/dev/null || true
    launchctl unload "$LAUNCH_AGENTS_DIR/$RECOVERY_PLIST" 2>/dev/null || true

    # 4. plist をコピー
    cp "$LAUNCHD_DIR/$BACKUP_PLIST" "$LAUNCH_AGENTS_DIR/"
    cp "$LAUNCHD_DIR/$RECOVERY_PLIST" "$LAUNCH_AGENTS_DIR/"
    echo "[3/5] plist コピー完了"

    # 5. launchd に登録
    launchctl load "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST"
    launchctl load "$LAUNCH_AGENTS_DIR/$RECOVERY_PLIST"
    echo "[4/5] launchd 登録完了"

    # 6. 初回実行テスト
    echo "[5/5] 初回バックアップ実行テスト..."
    bash "$SCRIPTS_DEST/launchd-backup-wrapper.sh" 2>&1
    echo ""
    echo "=== インストール完了 ==="
    echo "  launchd (自動): システム状態を5分ごとに ~/.taisun-data/ へ保存"
    echo "  手動 (フル機能): bash scripts/auto-session-backup.sh"
    echo "  ログ: /tmp/taisun-backup-stdout.log"
    ;;

  uninstall)
    echo "=== 自動バックアップシステム アンインストール ==="

    launchctl unload "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST" 2>/dev/null || true
    launchctl unload "$LAUNCH_AGENTS_DIR/$RECOVERY_PLIST" 2>/dev/null || true
    rm -f "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST"
    rm -f "$LAUNCH_AGENTS_DIR/$RECOVERY_PLIST"

    echo "アンインストール完了"
    echo "  データ保持: $DATA_DIR (手動削除可)"
    echo "  スクリプト保持: $SCRIPTS_DEST (手動削除可)"
    ;;

  status)
    echo "=== 自動バックアップシステム状態 ==="
    echo ""
    echo "--- launchd 登録状態 ---"
    launchctl list | grep taisun || echo "  登録なし"
    echo ""
    echo "--- バックアップファイル数 (launchd) ---"
    LAUNCHD_COUNT=$(find "$DATA_DIR/workflow_state_backups" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "  $LAUNCHD_COUNT 件 ($DATA_DIR)"
    echo ""
    echo "--- バックアップファイル数 (手動) ---"
    MANUAL_COUNT=$(find "$PROJECT_DIR/.workflow_state_backups" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "  $MANUAL_COUNT 件 ($PROJECT_DIR)"
    echo ""
    echo "--- 最新ログ (launchd, 5行) ---"
    LAUNCHD_LOG="$DATA_DIR/backup_logs/backup-$(date +%Y%m%d).log"
    if [ -f "$LAUNCHD_LOG" ]; then
      tail -5 "$LAUNCHD_LOG"
    else
      echo "  本日のログなし"
    fi
    echo ""
    echo "--- launchd 出力 ---"
    if [ -f /tmp/taisun-backup-stdout.log ]; then
      tail -3 /tmp/taisun-backup-stdout.log
    else
      echo "  /tmp/taisun-backup-stdout.log なし（未実行）"
    fi
    ;;

  *)
    echo "Usage: $0 {install|uninstall|status}"
    exit 1
    ;;
esac
