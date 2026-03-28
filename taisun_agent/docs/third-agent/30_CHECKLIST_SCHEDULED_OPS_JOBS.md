# 30. Checklist: Scheduled Ops Jobs 有効化 - P18

## Prerequisites

- [ ] npm run proxy:build 成功
- [ ] npm run test:coverage パス
- [ ] GITHUB_TOKEN環境変数設定済み（Issue投稿する場合）
- [ ] 投稿先Issue作成済み（postToIssue使う場合）

## Step 1: Daily Report のみ有効化

### 1.1 設定変更

```bash
# config/proxy-mcp/ops-schedule.json を編集
```

```json
{
  "enabled": true,
  "timezone": "Asia/Tokyo",
  "stateDir": "logs/schedule-state",
  "dashboardIssue": null,
  "jobs": {
    "daily_observability_report": {
      "enabled": true,
      "cadence": "daily",
      "at": "09:00",
      "postToIssue": false
    }
  }
}
```

### 1.2 手動テスト

```bash
# 手動で1回実行してログ確認
npm run ops:schedule:run

# ステータス確認
npm run ops:schedule:status
```

### 1.3 ループ起動（ローカル）

```bash
# 1分間隔でループ実行
npm run ops:schedule:loop

# Ctrl+C で停止
```

### 1.4 チェックポイント

- [ ] ジョブが正しい時刻に実行される
- [ ] stateファイルが更新される
- [ ] 同日に重複実行されない
- [ ] エラーがあればログに出力される

## Step 2: Docker Compose 起動

### 2.1 環境変数設定

```bash
cp .env.ops.example .env.ops

# .env.ops を編集
OPS_SCHEDULE_ENABLED=true
GITHUB_TOKEN=ghp_xxx...
```

### 2.2 起動

```bash
docker compose -f docker-compose.ops.yml --profile ops-scheduler up -d

# ログ確認
docker compose -f docker-compose.ops.yml logs -f ops-scheduler
```

### 2.3 チェックポイント

- [ ] コンテナが起動する
- [ ] ヘルスチェックがパスする
- [ ] ジョブがスケジュール通り実行される

## Step 3: Issue投稿 有効化

### 3.1 Dashboard Issue 作成

```bash
gh issue create --repo owner/repo \
  --title "[Ops Dashboard] Daily/Weekly Reports" \
  --body "Automated ops reports are posted here."

# Issue番号をメモ（例: 123）
```

### 3.2 設定更新

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

### 3.3 チェックポイント

- [ ] レポートがIssueに投稿される
- [ ] 秘密情報がredactされている
- [ ] フォーマットが正しい

## Step 4: Weekly Report 追加

```json
{
  "jobs": {
    "weekly_observability_report": {
      "enabled": true,
      "cadence": "weekly",
      "dow": "Mon",
      "at": "09:10",
      "postToIssue": true
    }
  }
}
```

### チェックポイント

- [ ] 月曜 09:10 に実行される
- [ ] 同週に重複実行されない

## Step 5: Weekly Digest 追加（P17導入後のみ）

```json
{
  "jobs": {
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

### チェックポイント

- [ ] P17モジュールが存在する
- [ ] digestが正しく生成される
- [ ] Top3原因が抽出される

## Rollback

### 即時停止

```bash
# Docker Compose
docker compose -f docker-compose.ops.yml --profile ops-scheduler down

# または設定で無効化
```

```json
{
  "enabled": false
}
```

### 特定ジョブのみ停止

```json
{
  "jobs": {
    "daily_observability_report": {
      "enabled": false
    }
  }
}
```

### State リセット

```bash
rm -rf logs/schedule-state/
```

## Troubleshooting

| 問題 | 確認事項 | 対処 |
|------|----------|------|
| ジョブ実行されない | enabled確認 | true に設定 |
| 時刻がずれる | timezone確認 | Asia/Tokyo 設定 |
| 重複実行 | stateファイル確認 | logs/schedule-state/ 確認 |
| Issue投稿失敗 | GITHUB_TOKEN確認 | トークン再発行 |
| 秘密漏洩 | redaction確認 | patterns追加 |

## 完了確認

- [ ] daily_observability_report が毎日実行される
- [ ] weekly_observability_report が毎週月曜に実行される
- [ ] 重複実行がない
- [ ] Issue投稿が成功する（設定時）
- [ ] 秘密情報がredactされる
- [ ] コンテナ再起動後も正常動作
