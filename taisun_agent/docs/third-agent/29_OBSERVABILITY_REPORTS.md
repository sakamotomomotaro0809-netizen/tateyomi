# Observability Reports

## Overview

日次/週次レポートを自動生成し、GitHub Issueにポストするシステム。

## Components

```
src/proxy-mcp/observability/
├── index.ts          # Event recording
├── types.ts          # Type definitions
├── report.ts         # Report generation
├── report-cli.ts     # CLI interface
└── post-to-issue.ts  # GitHub posting
```

## Report Contents

### サマリー
- 総イベント数
- 成功率
- 失敗数

### 内部MCP別メトリクス
| MCP | 呼出数 | 失敗率 | 平均 | p95 | Circuit Open |
|-----|--------|--------|------|-----|--------------|

### 失敗理由トップ
- エラータイプ別の発生件数

### 上位スキル
- 使用頻度の高いスキル

### Circuit Breaker状態
- Closed / Open / Half-Open の数

### 改善提案
- 自動生成されるアクション提案

## CLI Usage

```bash
# Daily report (24h)
npm run obs:report:daily

# Weekly report (7d)
npm run obs:report:weekly

# Post to GitHub Issue
npm run obs:post:daily
npm run obs:post:weekly

# Save to file
npx ts-node src/proxy-mcp/observability/report-cli.ts --period 24h --output report.md
```

## Configuration

`config/proxy-mcp/observability-report.json`:

```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "issueNumber": 123
  },
  "schedule": {
    "daily": true,
    "weekly": true
  },
  "thresholds": {
    "warnSuccessRate": 0.95,
    "criticalSuccessRate": 0.90,
    "warnP95Ms": 5000
  }
}
```

## Alert Levels

| Level | Condition | Action |
|-------|-----------|--------|
| 🔴 CRITICAL | 成功率 < 90% or Circuit Open | 即時対応 |
| 🟡 WARNING | 成功率 < 95% or p95 > 5000ms | 調査推奨 |
| ✅ OK | すべて正常 | 継続監視 |

## GitHub Issue Setup

1. レポート用Issueを作成:
```bash
gh issue create --repo owner/repo \
  --title "[Observability] Daily/Weekly Report Thread" \
  --body "自動レポートスレッド" \
  --label "observability,automated"
```

2. Issue番号を設定ファイルに記載

3. `gh` CLIが認証済みであることを確認

## Event Log Format

`.taisun/observability/events.jsonl`:

```jsonl
{"type":"skill_run","timestamp":"2024-...","status":"ok","skillName":"commit",...}
{"type":"internal_mcp_tool_call","timestamp":"...","mcpName":"github","status":"fail",...}
```

## Scheduling (cron)

```cron
# Daily at 9:00 AM JST
0 0 * * * cd /path/to/project && npm run obs:post:daily

# Weekly on Monday at 9:00 AM JST
0 0 * * 1 cd /path/to/project && npm run obs:post:weekly
```

## Metrics Definitions

| Metric | Description |
|--------|-------------|
| successRate | (成功数 / 総数) |
| failureRate | (失敗数 / 総数) |
| avgDurationMs | 平均レイテンシ |
| p95DurationMs | 95パーセンタイルレイテンシ |
| circuitOpenCount | Circuit Open発生回数 |

## Recommendations Logic

自動生成される改善提案:

1. **成功率 < 95%**: エラーログ確認を推奨
2. **エラー多発**: 最頻出エラーの調査を推奨
3. **Circuit Open**: MCP復旧確認を推奨
4. **p95 > 5000ms**: パフォーマンス改善を推奨
