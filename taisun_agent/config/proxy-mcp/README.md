# Proxy MCP 設定ディレクトリ

このディレクトリには、Proxy MCP サーバーの設定ファイルが含まれています。

---

## ファイル一覧

| ファイル | 必須 | Git管理 | 説明 |
|---------|------|---------|------|
| `internal-mcps.json` | はい | はい | MCP サーバー定義（ベース設定） |
| `internal-mcps.local.json` | いいえ | いいえ | ローカル有効化オーバーライド |
| `internal-mcps.local.example.json` | - | はい | ローカル設定のテンプレート |
| `internal-mcps.prod.example.json` | - | はい | 本番設定のテンプレート |
| `internal-mcps.staging.example.json` | - | はい | ステージング設定のテンプレート |
| `ops-schedule.json` | いいえ | はい | スケジュールジョブ設定 |
| `ops-schedule.schema.json` | - | はい | スケジュール設定のスキーマ |
| `observability-report.json` | いいえ | いいえ | レポート投稿設定 |
| `observability-report.example.json` | - | はい | レポート設定のテンプレート |
| `notifications.json` | いいえ | はい | 通知チャンネル設定 |
| `notifications.schema.json` | - | はい | 通知設定のスキーマ |
| `memory.json` | いいえ | はい | メモリシステム設定 |

---

## クイックセットアップ

### 最小構成（ローカル開発）

```bash
# 1. ローカルオーバーライドを作成
cp internal-mcps.local.example.json internal-mcps.local.json

# 2. 必要な MCP を有効化
# internal-mcps.local.json を編集
```

### フル構成（本番運用）

```bash
# 1. 全てのテンプレートをコピー
cp internal-mcps.local.example.json internal-mcps.local.json
cp observability-report.example.json observability-report.json

# 2. 各ファイルを環境に合わせて編集
```

---

## 各ファイルの詳細

### internal-mcps.json

MCP サーバーのベース定義。**直接編集しないでください。**

```json
{
  "version": "1.0.0",
  "mcps": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@0.6.2"],
      "enabled": false,
      "requiredEnv": ["GITHUB_TOKEN"],
      "tags": ["vcs", "issues", "pr"],
      "dangerousOperations": ["delete", "force-push"],
      "allowlist": ["get_*", "list_*"],
      "resilience": { ... }
    }
  ],
  "routerConfig": { ... }
}
```

### internal-mcps.local.json

ローカル環境で MCP を有効化するためのオーバーライド。

```json
{
  "mcps": [
    { "name": "github", "enabled": true },
    { "name": "filesystem", "enabled": true }
  ]
}
```

**重要:** このファイルは `.gitignore` に含まれます。

### ops-schedule.json

日次/週次の自動ジョブ設定。

```json
{
  "enabled": true,
  "timezone": "Asia/Tokyo",
  "dashboardIssue": 197,
  "jobs": {
    "daily_observability_report": {
      "enabled": true,
      "cadence": "daily",
      "at": "09:00",
      "postToIssue": true
    }
  }
}
```

### observability-report.json

GitHub Issue へのレポート投稿設定。

```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "issueNumber": 123
  },
  "thresholds": {
    "warnSuccessRate": 0.95,
    "criticalSuccessRate": 0.90
  }
}
```

**重要:** このファイルは `.gitignore` に含まれます。

### notifications.json

アラート通知の設定。

```json
{
  "enabled": true,
  "notifyOn": ["critical", "recovery"],
  "channels": {
    "slack": {
      "enabled": false,
      "webhookUrl": "${SLACK_WEBHOOK_URL}"
    }
  },
  "cooldown": {
    "criticalMinutes": 30
  }
}
```

### memory.json

エージェント学習システムの設定。

```json
{
  "storage": {
    "directory": ".taisun/memory"
  },
  "namespaces": {
    "short-term": { "maxEntries": 2000, "ttlDays": 14 },
    "long-term": { "maxEntries": 20000, "ttlDays": 3650 }
  }
}
```

---

## 環境変数の参照

設定ファイル内で `${ENV_VAR}` 構文を使用すると、環境変数を参照できます：

```json
{
  "webhookUrl": "${SLACK_WEBHOOK_URL}"
}
```

---

## スキーマ検証

各設定ファイルには対応するスキーマがあります。エディタの JSON 検証機能を使用してください：

```json
{
  "$schema": "./ops-schedule.schema.json",
  ...
}
```

---

## トラブルシューティング

### 「Config not found」エラー

```bash
# テンプレートからコピー
cp xxx.example.json xxx.json
```

### 「Invalid JSON」エラー

```bash
# JSON 文法を検証
cat xxx.json | python3 -m json.tool
```

### MCP が有効にならない

1. `internal-mcps.local.json` が存在するか確認
2. `enabled: true` になっているか確認
3. `requiredEnv` の環境変数が設定されているか確認

---

## 詳細ドキュメント

- [CONFIG.md](../../docs/CONFIG.md) - 設定ガイド全体
- [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) - トラブルシューティング
