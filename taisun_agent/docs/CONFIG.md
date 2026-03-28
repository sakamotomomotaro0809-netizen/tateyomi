# TAISUN v2 設定ガイド

このドキュメントでは、TAISUN v2の全ての設定ファイルについて説明します。

---

## 目次

1. [環境変数ファイル](#環境変数ファイル)
2. [Proxy MCP設定](#proxy-mcp設定)
3. [設定の優先順位](#設定の優先順位)

---

## 環境変数ファイル

### .env (メイン設定)

**場所:** プロジェクトルート
**作成方法:** `cp .env.example .env`
**必須:** いいえ（基本機能は動作）

```bash
# === AI APIキー ===
ANTHROPIC_API_KEY=sk-ant-xxx     # Anthropic API（必要時のみ）
OPENAI_API_KEY=sk-xxx            # OpenAI API（必要時のみ）
GOOGLE_API_KEY=AIza-xxx          # Google API（必要時のみ）

# === GitHub連携 ===
GITHUB_TOKEN=ghp_xxx             # GitHub Personal Access Token
                                 # 必要スコープ: repo, workflow, read:org

# === データベース ===
POSTGRES_MCP_DSN=postgresql://user:pass@host:5432/db    # 読み取り専用
POSTGRES_MCP_DSN_RW=postgresql://user:pass@host:5432/db # 読み書き（危険操作）

# === 外部サービス ===
NOTION_API_KEY=secret_xxx        # Notion統合
SLACK_BOT_TOKEN=xoxb-xxx         # Slack統合
BRAVE_API_KEY=BSA-xxx            # Brave Search API

# === 通知 ===
APPRISE_URLS=slack://xxx         # 通知先URL（カンマ区切りで複数指定可）

# === ローカライズ ===
TAISUN_LOCALE=ja                 # ja=日本語, en=英語（デフォルト: ja）

# === 機能フラグ ===
ENABLE_MULTI_AGENT_MODE=true     # マルチエージェント機能
ENABLE_OMEGA_OPTIMIZATION=true   # Ω関数最適化
ENABLE_LEARNING_SYSTEM=true      # 学習システム
ENABLE_MCP_HEALTH_CHECK=true     # MCPヘルスチェック
```

### .env.tools (ドキュメント処理ツール)

**場所:** プロジェクトルート
**作成方法:** `cp .env.tools.example .env.tools`
**必須:** いいえ（Docker使用時のみ）

```bash
# Gotenberg (HTML/Office→PDF変換)
GOTENBERG_PORT=3000
GOTENBERG_URL=http://localhost:3000

# Stirling-PDF (PDF操作)
STIRLING_PDF_PORT=8080
STIRLING_PDF_URL=http://localhost:8080
```

### .env.ops (運用スタック)

**場所:** プロジェクトルート
**作成方法:** `cp .env.ops.example .env.ops`
**必須:** いいえ（スケジューラー使用時のみ）

```bash
# Apprise通知
APPRISE_PORT=8000
APPRISE_URLS=slack://xxx,discord://xxx

# GitHub Issue投稿
GITHUB_TOKEN=ghp_xxx

# スケジューラー
OPS_SCHEDULE_ENABLED=false       # true で有効化
OPS_SCHEDULE_TIMEZONE=Asia/Tokyo
```

---

## Proxy MCP設定

全ての設定ファイルは `config/proxy-mcp/` にあります。

### internal-mcps.json (MCPサーバー定義)

**必須:** はい
**編集:** 基本的に不要

MCPサーバーの定義ファイル。各MCPの接続設定、タグ、危険操作、許可リストを定義。

```json
{
  "version": "1.0.0",
  "mcps": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@0.6.2"],
      "enabled": false,           // ← local.jsonでオーバーライド
      "requiredEnv": ["GITHUB_TOKEN"],
      "tags": ["vcs", "issues", "pr"],
      "dangerousOperations": ["delete", "force-push"],
      "allowlist": ["get_*", "list_*", "create_issue"]
    }
  ],
  "routerConfig": {
    "ruleFirst": true,
    "semanticThreshold": 0.7
  }
}
```

### internal-mcps.local.json (ローカルオーバーライド)

**必須:** いいえ
**作成方法:** `cp config/proxy-mcp/internal-mcps.local.example.json config/proxy-mcp/internal-mcps.local.json`
**Git:** `.gitignore` に含まれる（コミットされない）

ローカル環境でMCPを有効化するためのオーバーライドファイル。

```json
{
  "$comment": "このファイルで enabled: true にしたMCPが有効になります",
  "mcps": [
    { "name": "github", "enabled": true },
    { "name": "filesystem", "enabled": true },
    { "name": "notion", "enabled": true }
  ]
}
```

**使い方:**
1. `internal-mcps.json` で定義されているMCPの `name` を指定
2. `enabled: true` で有効化
3. 必要な環境変数を `.env` に設定

### ops-schedule.json (スケジュールジョブ)

**必須:** いいえ
**用途:** 日次/週次レポートの自動実行

```json
{
  "$schema": "./ops-schedule.schema.json",
  "enabled": true,                    // グローバル有効/無効
  "timezone": "Asia/Tokyo",
  "stateDir": "logs/schedule-state",  // 実行状態の保存先
  "dashboardIssue": 197,              // レポート投稿先Issue番号

  "jobs": {
    "daily_observability_report": {
      "enabled": true,
      "cadence": "daily",
      "at": "09:00",                  // 実行時刻 (HH:MM)
      "postToIssue": true
    },
    "weekly_observability_report": {
      "enabled": true,
      "cadence": "weekly",
      "dow": "Mon",                   // 曜日 (Mon, Tue, ...)
      "at": "09:10",
      "postToIssue": true
    },
    "weekly_improvement_digest": {
      "enabled": true,
      "cadence": "weekly",
      "dow": "Mon",
      "at": "09:20",
      "postToIssue": true
    }
  }
}
```

**起動方法:**
```bash
# 環境変数で有効化（推奨）
OPS_SCHEDULE_ENABLED=true npm run ops:schedule:loop &

# 状態確認
npm run ops:schedule:status
```

**注意:** デフォルトでは `enabled: false` です。本番環境では `OPS_SCHEDULE_ENABLED=true` を設定してください。

### observability-report.json (レポート設定)

**必須:** いいえ（Issue投稿時のみ必要）
**作成方法:** `cp config/proxy-mcp/observability-report.example.json config/proxy-mcp/observability-report.json`

```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "issueNumber": 123            // ダッシュボードIssue番号
  },
  "schedule": {
    "daily": true,
    "weekly": true
  },
  "thresholds": {
    "warnSuccessRate": 0.95,      // 95%未満で警告
    "criticalSuccessRate": 0.90,  // 90%未満でクリティカル
    "warnP95Ms": 5000             // P95が5秒超で警告
  }
}
```

### notifications.json (通知設定)

**必須:** いいえ
**用途:** アラート通知の送信先設定

```json
{
  "$schema": "./notifications.schema.json",
  "enabled": true,
  "notifyOn": ["critical", "recovery"],  // 通知するイベント

  "channels": {
    "apprise": {
      "enabled": false,
      "url": "${APPRISE_URL}"            // 環境変数を参照
    },
    "slack": {
      "enabled": false,
      "webhookUrl": "${SLACK_WEBHOOK_URL}"
    },
    "discord": {
      "enabled": false,
      "webhookUrl": "${DISCORD_WEBHOOK_URL}"
    }
  },

  "cooldown": {
    "criticalMinutes": 30,    // Critical通知の最小間隔
    "warnMinutes": 120,       // Warn通知の最小間隔
    "recoveryMinutes": 60     // Recovery通知の最小間隔
  },

  "quietHours": {
    "enabled": false,
    "startHour": 22,          // 22:00から
    "endHour": 7,             // 7:00まで通知抑制
    "allowCritical": true     // Criticalは許可
  }
}
```

### memory.json (メモリシステム)

**必須:** いいえ
**用途:** エージェントの学習データ設定

```json
{
  "version": "1.0.0",
  "storage": {
    "defaultBackend": "jsonl",
    "directory": ".taisun/memory"
  },
  "namespaces": {
    "short-term": {
      "maxEntries": 2000,
      "ttlDays": 14,
      "maxContentChars": 200000
    },
    "long-term": {
      "maxEntries": 20000,
      "ttlDays": 3650,
      "maxContentChars": 500000
    }
  },
  "retrieval": {
    "topK": 5,
    "minScore": 0.15
  }
}
```

---

## 設定の優先順位

設定は以下の順序で適用されます（後のものが優先）:

1. **デフォルト値** (コード内)
2. **internal-mcps.json** (ベース設定)
3. **internal-mcps.local.json** (ローカルオーバーライド)
4. **環境変数** (.env ファイル)
5. **コマンドライン引数**

---

## 設定ファイル一覧

| ファイル | 必須 | 用途 | Git管理 |
|---------|------|------|---------|
| `.env` | いいえ | API キー、環境変数 | いいえ |
| `.env.tools` | いいえ | Dockerツール設定 | いいえ |
| `.env.ops` | いいえ | 運用スタック設定 | いいえ |
| `internal-mcps.json` | はい | MCPサーバー定義 | はい |
| `internal-mcps.local.json` | いいえ | ローカル有効化 | いいえ |
| `ops-schedule.json` | いいえ | スケジュールジョブ | はい |
| `observability-report.json` | いいえ | レポート設定 | いいえ |
| `notifications.json` | いいえ | 通知設定 | はい |
| `memory.json` | いいえ | メモリシステム | はい |

---

## 環境別設定例

### ローカル開発環境

```bash
# .env
GITHUB_TOKEN=ghp_xxx
TAISUN_LOCALE=ja

# config/proxy-mcp/internal-mcps.local.json
{
  "mcps": [
    { "name": "github", "enabled": true },
    { "name": "filesystem", "enabled": true }
  ]
}
```

### 本番環境

```bash
# .env
GITHUB_TOKEN=ghp_xxx
TAISUN_LOCALE=ja
OPS_SCHEDULE_ENABLED=true
APPRISE_URLS=slack://xxx

# config/proxy-mcp/internal-mcps.prod.json
# → internal-mcps.local.json としてコピー
```

---

## スキーマファイル

各設定ファイルにはJSONスキーマが用意されています:

- `ops-schedule.schema.json` - スケジュールジョブのスキーマ
- `notifications.schema.json` - 通知設定のスキーマ

エディタのJSON検証機能を使用して、設定エラーを事前に検出できます。

---

*設定でエラーが出た場合は [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。*
