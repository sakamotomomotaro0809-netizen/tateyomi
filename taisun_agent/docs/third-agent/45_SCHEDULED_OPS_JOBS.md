# 45. Scheduled Ops Jobs - P18

## Overview

日次/週次の運用タスクを自動化するスケジュールランナー。
Observabilityレポートやweekly digestを定期実行し、Issue投稿まで自動化可能。

## Principles

1. **自動で危険操作はしない** - 投稿/要約/提案のみ
2. **秘密情報は絶対に出さない** - redaction必須
3. **CIにネットワーク依存は持ち込まない** - GitHubはモックでテスト
4. **オプトイン運用** - `enabled=false`がデフォルト
5. **状態永続化** - 再起動耐性

## Architecture

```
config/proxy-mcp/ops-schedule.json  # 設定
  ↓
ScheduleRunner (runLoop)
  ├── 1分ごとにrunOnce実行
  ├── StateManager (永続化)
  │   └── logs/schedule-state/schedule-state.json
  └── Jobs
      ├── daily_observability_report
      ├── weekly_observability_report
      └── weekly_improvement_digest
```

## Configuration

### config/proxy-mcp/ops-schedule.json

```json
{
  "enabled": false,
  "timezone": "Asia/Tokyo",
  "stateDir": "logs/schedule-state",
  "dashboardIssue": 123,
  "jobs": {
    "daily_observability_report": {
      "enabled": false,
      "cadence": "daily",
      "at": "09:00",
      "postToIssue": false
    },
    "weekly_observability_report": {
      "enabled": false,
      "cadence": "weekly",
      "dow": "Mon",
      "at": "09:10",
      "postToIssue": false
    },
    "weekly_improvement_digest": {
      "enabled": false,
      "cadence": "weekly",
      "dow": "Mon",
      "at": "09:20",
      "postToIssue": false
    }
  },
  "redaction": {
    "patterns": [],
    "placeholder": "[REDACTED]"
  }
}
```

### 設定項目

| 項目 | 型 | デフォルト | 説明 |
|------|------|----------|------|
| enabled | boolean | false | グローバル有効化 |
| timezone | string | Asia/Tokyo | スケジュール実行タイムゾーン |
| stateDir | string | logs/schedule-state | 状態保存ディレクトリ |
| dashboardIssue | number | null | 投稿先Issue番号 |
| jobs.*.enabled | boolean | false | ジョブ個別有効化 |
| jobs.*.cadence | string | - | daily / weekly |
| jobs.*.at | string | 09:00 | 実行時刻 (HH:MM) |
| jobs.*.dow | string | Mon | 曜日 (weeklyのみ) |
| jobs.*.postToIssue | boolean | false | Issue投稿 |

## Jobs

### daily_observability_report

24時間分のObservabilityメトリクスをレポート化。

**出力内容:**
- 総イベント数、成功率、失敗数
- MCP別メトリクス（呼出数、失敗率、p95）
- 失敗理由トップ5
- Circuit Breaker状態
- 改善提案

### weekly_observability_report

7日間分のObservabilityメトリクスをレポート化。
daily_observability_reportと同じフォーマットで週間集計。

### weekly_improvement_digest

P17 Incident Lifecycleが導入されている場合に動作。
週間のインシデントを分析し、Top3の原因と改善提案を生成。

## Usage

### CLI

```bash
# 今すぐ実行（時刻に関係なく）
npm run proxy:build
npm run ops:schedule:run

# ループ実行（本番用）
npm run ops:schedule:loop

# ステータス確認
npm run ops:schedule:status
```

### Docker Compose

```bash
# ops-schedulerプロファイルで起動
docker compose -f docker-compose.ops.yml --profile ops-scheduler up -d

# ログ確認
docker compose -f docker-compose.ops.yml logs -f ops-scheduler
```

## State Management

### 永続化

`logs/schedule-state/schedule-state.json`に以下を保存:
- lastRunAt: 最終実行時刻
- lastStatus: 最終ステータス (ok/fail/skipped)
- consecutiveFailures: 連続失敗回数
- runCount: 総実行回数

### 重複実行防止

- daily: 同日に複数回実行しない
- weekly: 同ISO週に複数回実行しない
- 再起動してもstateから復元して重複防止

## Redaction

投稿前に以下を自動的に置換:
- メールアドレス
- GitHubトークン (ghp_*, gho_*, etc.)
- OpenAI APIキー (sk-*)
- Slackトークン (xox*)
- 32文字以上の英数字文字列

カスタムパターンはredaction.patternsに正規表現で追加可能。

## Rollout Strategy

### Step 1: daily_observability_report のみ有効化

```json
{
  "enabled": true,
  "jobs": {
    "daily_observability_report": {
      "enabled": true,
      "postToIssue": false
    }
  }
}
```

ログを1週間監視し、問題なければ次へ。

### Step 2: Issue投稿を有効化

```json
{
  "dashboardIssue": 123,
  "jobs": {
    "daily_observability_report": {
      "enabled": true,
      "postToIssue": true
    }
  }
}
```

### Step 3: weekly_observability_reportを追加

```json
{
  "jobs": {
    "weekly_observability_report": {
      "enabled": true,
      "postToIssue": true
    }
  }
}
```

### Step 4: weekly_improvement_digest（P17導入後）

```json
{
  "jobs": {
    "weekly_improvement_digest": {
      "enabled": true,
      "postToIssue": true
    }
  }
}
```

## Troubleshooting

### ジョブが実行されない

1. グローバルenabledがtrueか確認
2. ジョブ個別のenabledがtrueか確認
3. 時刻とタイムゾーンが正しいか確認
4. stateファイルで既に実行済みでないか確認

### Issue投稿が失敗する

1. GITHUB_TOKEN環境変数の確認
2. dashboardIssueのIssue番号が存在するか確認
3. トークンの権限（issues:write）を確認

### Digestが動作しない

P17 Incident Lifecycleモジュールが必要。
`src/proxy-mcp/ops/digest/`が存在するか確認。

## Files

```
config/proxy-mcp/
├── ops-schedule.json          # 設定
└── ops-schedule.schema.json   # スキーマ

src/proxy-mcp/ops/schedule/
├── index.ts                   # エクスポート
├── types.ts                   # 型定義
├── state.ts                   # 状態管理
└── runner.ts                  # 実行ロジック

scripts/ops/
└── schedule-runner.ts         # CLI

tests/unit/
├── ops-schedule-state.test.ts
└── ops-schedule-runner.test.ts
```

## Related

- P5: Observability
- P16: SLO Notifications
- P17: Incident Lifecycle (optional)
