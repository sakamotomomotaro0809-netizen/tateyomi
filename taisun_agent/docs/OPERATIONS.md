# TAISUN v2 運用ガイド

## 目次

1. [環境管理](#環境管理)
2. [デプロイメント](#デプロイメント)
3. [監視・アラート](#監視アラート)
4. [バックアップ・リカバリ](#バックアップリカバリ)
5. [トラブルシューティング](#トラブルシューティング)
6. [セキュリティ運用](#セキュリティ運用)
7. [Runbook](#runbook)

---

## 環境管理

### 環境一覧

| 環境 | 用途 | ブランチ | URL |
|------|------|----------|-----|
| Development | ローカル開発 | feature/* | localhost:3000 |
| Staging | 統合テスト | develop | staging.example.com |
| Production | 本番 | main | example.com |

### 環境変数

#### 必須環境変数

```bash
# .env.example
NODE_ENV=development

# Claude Code
ANTHROPIC_API_KEY=sk-ant-xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/taisun
POSTGRES_MCP_DSN=postgresql://readonly:pass@localhost:5432/taisun

# External Services
NOTION_API_KEY=secret_xxx
GITHUB_TOKEN=ghp_xxx

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

#### 環境別設定

```bash
# Development
DEBUG=true
LOG_LEVEL=debug

# Staging
DEBUG=false
LOG_LEVEL=info

# Production
DEBUG=false
LOG_LEVEL=warn
```

### シークレット管理

```
┌─────────────────────────────────────────────────────┐
│                  Secrets Management                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ GitHub       │  │ AWS Secrets  │  │ HashiCorp │ │
│  │ Secrets      │  │ Manager      │  │ Vault     │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│         │                 │                │        │
│         └─────────────────┼────────────────┘        │
│                           ▼                          │
│                  ┌────────────────┐                 │
│                  │  Application   │                 │
│                  └────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

#### GitHub Secrets の設定

```bash
# リポジトリ設定
gh secret set ANTHROPIC_API_KEY --body "sk-ant-xxx"
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set NOTION_API_KEY --body "secret_xxx"
```

---

## デプロイメント

### デプロイフロー

```
Feature Branch
      │
      ▼
Pull Request ──────────────────────────────┐
      │                                     │
      │ ┌─────────────────────────────────┐│
      │ │           CI Checks              ││
      │ │  ・Lint & TypeScript            ││
      │ │  ・Unit Tests (80% coverage)    ││
      │ │  ・Security Scan                ││
      │ │  ・Build                        ││
      │ └─────────────────────────────────┘│
      │                                     │
      ▼                                     │
   Merge to develop ◄──────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                    Staging                           │
│  ・自動デプロイ                                      │
│  ・統合テスト実行                                    │
│  ・E2Eテスト実行                                     │
│  ・パフォーマンステスト                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
                   Approval
                       │
                       ▼
               Merge to main
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   Production                         │
│  ・Blue-Green デプロイ                               │
│  ・ヘルスチェック                                    │
│  ・段階的ロールアウト                                │
└─────────────────────────────────────────────────────┘
```

### デプロイコマンド

#### Staging へのデプロイ

```bash
# 自動（develop ブランチへのマージ時）
git checkout develop
git merge feature/xxx
git push origin develop
# → GitHub Actions が自動実行

# 手動
gh workflow run cd.yml -f environment=staging
```

#### Production へのデプロイ

```bash
# タグベースデプロイ（推奨）
git tag v1.2.3
git push origin v1.2.3
# → GitHub Actions が自動実行

# 手動
gh workflow run cd.yml -f environment=production
```

### ロールバック

#### 即時ロールバック

```bash
# 前のバージョンにロールバック
gh workflow run cd.yml -f environment=production -f rollback=true -f version=v1.2.2
```

#### 手動ロールバック

```bash
# 1. 前のリリースタグを確認
git tag -l 'v*' --sort=-v:refname | head -5

# 2. 該当バージョンをチェックアウト
git checkout v1.2.2

# 3. 新しいパッチバージョンとしてタグ付け
git tag v1.2.4-rollback
git push origin v1.2.4-rollback
```

### デプロイ検証

```bash
# ヘルスチェック
curl https://api.example.com/health

# バージョン確認
curl https://api.example.com/version

# スモークテスト
npm run test:smoke -- --env=production
```

---

## 監視・アラート

### 監視アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                   Monitoring Stack                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Prometheus  │  │    Loki      │  │  Jaeger   │ │
│  │  (Metrics)   │  │   (Logs)     │  │  (Traces) │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│         └─────────────────┼────────────────┘        │
│                           ▼                          │
│                  ┌────────────────┐                 │
│                  │    Grafana     │                 │
│                  │  (Dashboards)  │                 │
│                  └────────────────┘                 │
│                           │                          │
│                           ▼                          │
│                  ┌────────────────┐                 │
│                  │ AlertManager   │                 │
│                  └────────┬───────┘                 │
│                           │                          │
│              ┌────────────┼────────────┐            │
│              ▼            ▼            ▼            │
│         ┌───────┐   ┌───────┐   ┌───────────┐      │
│         │ Slack │   │ Email │   │ PagerDuty │      │
│         └───────┘   └───────┘   └───────────┘      │
└─────────────────────────────────────────────────────┘
```

### 主要メトリクス

#### アプリケーション

| メトリクス | 閾値 | アラートレベル |
|-----------|------|---------------|
| Response Time (p99) | > 500ms | Warning |
| Response Time (p99) | > 1000ms | Critical |
| Error Rate | > 1% | Warning |
| Error Rate | > 5% | Critical |
| Request Rate | < 10/min | Warning |

#### インフラ

| メトリクス | 閾値 | アラートレベル |
|-----------|------|---------------|
| CPU Usage | > 70% | Warning |
| CPU Usage | > 90% | Critical |
| Memory Usage | > 80% | Warning |
| Memory Usage | > 95% | Critical |
| Disk Usage | > 80% | Warning |

### SLO/SLI

| サービス | SLI | SLO |
|----------|-----|-----|
| API | 可用性 | 99.9% |
| API | レイテンシ (p99) | < 500ms |
| Database | 可用性 | 99.95% |

### ダッシュボード

#### 概要ダッシュボード

- リクエスト数/分
- エラー率
- レスポンスタイム分布
- アクティブユーザー数

#### 詳細ダッシュボード

- エンドポイント別レイテンシ
- データベースクエリ時間
- 外部API呼び出し時間
- キャッシュヒット率

---

## バックアップ・リカバリ

### バックアップ戦略

```
┌─────────────────────────────────────────────────────┐
│                  Backup Strategy                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Database                                            │
│  ├── Full Backup: 毎日 02:00 JST                    │
│  ├── Incremental: 毎時                              │
│  └── Retention: 30日                                │
│                                                      │
│  Application Data                                    │
│  ├── Configuration: Git管理                         │
│  ├── Secrets: AWS Secrets Manager                   │
│  └── Logs: S3 (90日保持)                            │
│                                                      │
│  Memory System                                       │
│  ├── Agent Stats: 毎日バックアップ                  │
│  └── Task History: 毎日バックアップ                 │
└─────────────────────────────────────────────────────┘
```

### バックアップ実行

```bash
# データベースバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Memory Systemバックアップ
tar -czf memory_backup_$(date +%Y%m%d).tar.gz .claude/memory/

# S3へアップロード
aws s3 cp backup_$(date +%Y%m%d).sql s3://backups/db/
```

### リカバリ手順

#### データベースリカバリ

```bash
# 1. バックアップをダウンロード
aws s3 cp s3://backups/db/backup_20240101.sql .

# 2. リストア
psql $DATABASE_URL < backup_20240101.sql

# 3. 整合性確認
npm run db:verify
```

#### 障害復旧（DR）

| RPO | RTO |
|-----|-----|
| 1時間 | 4時間 |

---

## トラブルシューティング

### よくある問題と解決策

#### 1. エージェントが応答しない

**症状**: Task 実行がタイムアウトする

**原因**:
- API レート制限
- ネットワーク接続問題
- モデル過負荷

**解決策**:
```bash
# 1. API ステータス確認
curl https://status.anthropic.com

# 2. レート制限確認
# 429エラーの場合は待機

# 3. タイムアウト値を増加
Task(..., timeout=300000)
```

---

#### 2. MCP 接続エラー

**症状**: `MCP_CONNECTION_ERROR`

**原因**:
- 環境変数未設定
- 認証失敗
- サーバー未起動

**解決策**:
```bash
# 1. 環境変数確認
echo $POSTGRES_MCP_DSN
echo $NOTION_API_KEY

# 2. 接続テスト
npx @modelcontextprotocol/server-postgres --test

# 3. サーバーログ確認
cat ~/.claude/mcp-server.log
```

---

#### 3. 品質ゲート失敗

**症状**: CI/CD パイプラインが品質ゲートで停止

**原因**:
- テストカバレッジ不足
- コードレビュースコア低下
- セキュリティ脆弱性検出

**解決策**:
```bash
# 1. カバレッジ確認
npm run test:coverage

# 2. 不足しているテストを追加
Task(subagent_type="test-generator", prompt="カバレッジを改善して")

# 3. セキュリティ修正
npm audit fix
```

---

#### 4. デプロイ失敗

**症状**: デプロイがヘルスチェックで失敗

**原因**:
- 設定ミス
- 依存関係問題
- リソース不足

**解決策**:
```bash
# 1. ログ確認
gh run view --log

# 2. ヘルスチェック確認
curl -v https://api.example.com/health

# 3. ロールバック
gh workflow run cd.yml -f rollback=true
```

---

#### 5. パフォーマンス低下

**症状**: レスポンスタイムが増加

**原因**:
- クエリ最適化不足
- メモリリーク
- 外部サービス遅延

**解決策**:
```bash
# 1. スロークエリ確認
SELECT * FROM pg_stat_activity WHERE state = 'active';

# 2. プロファイリング実行
npm run profile

# 3. キャッシュ確認
redis-cli INFO memory
```

---

### ログ調査

#### ログの場所

| ログ種別 | 場所 |
|----------|------|
| アプリケーション | /var/log/app/*.log |
| Claude Code | ~/.claude/logs/ |
| MCP Server | ~/.claude/mcp-server.log |
| CI/CD | GitHub Actions Logs |

#### ログ検索

```bash
# エラーログ検索
grep -r "ERROR" /var/log/app/

# 特定時間帯のログ
awk '/2024-01-01 10:00/,/2024-01-01 11:00/' /var/log/app/app.log

# JSON ログのパース
cat app.log | jq 'select(.level == "error")'
```

---

## セキュリティ運用

### 定期セキュリティタスク

| タスク | 頻度 | 担当 |
|--------|------|------|
| 依存関係スキャン | 週次（月曜） | 自動 |
| シークレットローテーション | 月次 | 手動 |
| アクセス権レビュー | 四半期 | 手動 |
| ペネトレーションテスト | 年次 | 外部 |

### インシデント対応

```
┌─────────────────────────────────────────────────────┐
│               Incident Response Flow                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Detection → Triage → Containment → Eradication     │
│      │          │          │             │          │
│      ▼          ▼          ▼             ▼          │
│  Monitoring  Severity   Isolate      Fix Root       │
│  Alerts      Assessment Resources    Cause          │
│                                                      │
│  → Recovery → Post-Mortem → Improvement             │
│        │           │              │                 │
│        ▼           ▼              ▼                 │
│    Restore     Document       Update                │
│    Service     Findings       Runbooks              │
└─────────────────────────────────────────────────────┘
```

### セキュリティスキャン

```bash
# 週次スキャン（自動実行）
npm run security:scan

# 手動スキャン
/security-scan-trivy

# 結果確認
cat security-report.json | jq '.vulnerabilities | group_by(.severity)'
```

---

## Runbook

### サービス再起動

```bash
# 1. 現在のステータス確認
systemctl status taisun

# 2. グレースフル再起動
systemctl restart taisun

# 3. ヘルスチェック
curl http://localhost:3000/health
```

### データベース接続リセット

```bash
# 1. 接続プール確認
SELECT count(*) FROM pg_stat_activity;

# 2. アイドル接続を終了
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '1 hour';

# 3. アプリケーション再起動
systemctl restart taisun
```

### キャッシュクリア

```bash
# Redis キャッシュクリア
redis-cli FLUSHALL

# アプリケーションキャッシュクリア
npm run cache:clear
```

### 緊急時連絡先

| 役割 | 連絡先 |
|------|--------|
| オンコール | oncall@example.com |
| インフラ | infra@example.com |
| セキュリティ | security@example.com |

---

## 次のステップ

- [アーキテクチャ](ARCHITECTURE.md) - システム構成の理解
- [開発者ガイド](DEVELOPER_GUIDE.md) - 開発環境セットアップ
- [API リファレンス](API_REFERENCE.md) - API 仕様

---

Built with Claude Code
