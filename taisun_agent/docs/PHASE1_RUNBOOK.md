# Phase 1 Operations Runbook

TAISUN v2 Phase 1 Execution Foundation の運用ガイド。

## Overview

Phase 1 は安全で再現可能なツーリング基盤を提供します：
- ドキュメント処理（PDF変換、編集）
- 開発環境の検証・診断
- 最小権限の原則に基づく運用

## Quick Start

```bash
# 1. 環境セットアップ
make setup

# 2. インストール検証
make verify

# 3. ドキュメントツール起動
make tools-up

# 4. ドキュメント出力
make docs-export
```

## Daily Operations

### 起動・停止

```bash
# ツール起動
make tools-up

# ツール停止
make tools-down

# ログ確認
make logs
```

### 診断

```bash
# システム診断
make doctor

# MCP ヘルスチェック
make mcp-health

# コンポーネント一覧
make agents-list
make skills-list
```

## Troubleshooting

### Gotenberg が起動しない

```bash
# コンテナ状態確認
docker ps -a | grep gotenberg

# ログ確認
docker logs taisun-gotenberg

# 再起動
docker-compose -f docker-compose.tools.yml restart gotenberg
```

### Stirling-PDF が応答しない

```bash
# ヘルスチェック
curl http://localhost:8080/api/v1/info

# メモリ確認（メモリ不足の可能性）
docker stats taisun-stirling-pdf

# 再起動
docker-compose -f docker-compose.tools.yml restart stirling-pdf
```

### ドキュメント出力失敗

```bash
# Pandoc インストール確認
pandoc --version

# macOS: Pandoc インストール
brew install pandoc

# Ubuntu: Pandoc インストール
sudo apt-get install pandoc
```

## Governance Guidelines

### 1. 破壊的操作の承認

以下の操作は人間の承認が必要：
- データベースへの書き込み
- 本番環境へのデプロイ
- 外部サービスへの認証情報変更

### 2. シークレット管理

```bash
# ❌ やってはいけない
git add .env
git commit -m "Add secrets"

# ✅ 正しい方法
cp .env.example .env
# .env を手動編集
# .gitignore で除外されていることを確認
```

### 3. べき等性の確保

すべてのスクリプトは再実行可能：
```bash
# 何度実行しても同じ結果
make setup
make setup
make setup  # エラーなし、同じ状態
```

## Monitoring

### メトリクス確認

```bash
# パフォーマンスレポート
npm run perf:report

# メモリレポート
npm run memory:report
```

### ログ収集

```bash
# Docker ログ
docker-compose -f docker-compose.tools.yml logs -f

# アプリケーションログ
tail -f logs/*.log
```

## Maintenance

### 定期メンテナンス

```bash
# キャッシュクリア
make clean

# Docker イメージ更新
docker-compose -f docker-compose.tools.yml pull
docker-compose -f docker-compose.tools.yml up -d

# 依存関係更新
npm update
```

### バックアップ

```bash
# メモリシステムのバックアップ
npm run memory:backup

# 設定のバックアップ
cp .env .env.backup.$(date +%Y%m%d)
```

## Emergency Procedures

### 緊急停止

```bash
# すべてのツール停止
make tools-down

# すべてのコンテナ強制停止
docker stop $(docker ps -q)
```

### ロールバック

```bash
# 前回のコミットに戻す
git checkout HEAD~1 -- docker-compose.tools.yml

# ツール再起動
make tools-down
make tools-up
```

## Contact

問題が解決しない場合：
1. Issue を作成: https://github.com/taiyousan15/taisun_v2/issues
2. ログを添付
3. 実行したコマンドを記載
