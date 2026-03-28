# Checklist: One-Command Pipeline

`pipeline.web_skillize_from_tabs` の使用チェックリスト。

## Pre-requisites

- [ ] Chromeが `--remote-debugging-port=9222` で起動済み
- [ ] 対象タブが開かれている
- [ ] CDP接続テスト: `npm run chrome:debug:test` がパス

## Standard Workflow

### Step 1: Chrome準備

```bash
# Chrome起動（CDPモード）
npm run chrome:debug:start
```

- [ ] Chromeが起動
- [ ] 目的のURLをタブで開く
- [ ] 不要なタブを閉じる（optional）

### Step 2: Dry-run実行

```typescript
const result = await skillRunAsync('pipeline.web_skillize_from_tabs', {});
console.log(result.data?.summary);
```

- [ ] `success: true` を確認
- [ ] 処理URL数を確認
- [ ] 成功/失敗数を確認
- [ ] `dryRun: true` を確認

### Step 3: 結果確認

```typescript
const runRecord = await memoryGetContent(result.referenceId);
console.log(runRecord);
```

- [ ] `stages.tabs.totalTabs` を確認
- [ ] `stages.normalize.duplicatesRemoved` を確認
- [ ] `stages.skillize.successCount` を確認
- [ ] `stages.skillize.failureCount` を確認（0であるべき）

### Step 4: スキル内容プレビュー

```typescript
// skillize結果のrefIdから内容確認
const skillizeResult = await memoryGetContent(runRecord.stages.skillize.outputRefId);
// 各スキルのrefIdから内容を確認
```

- [ ] 生成されたスキルの品質を確認
- [ ] テンプレート選択が適切か確認
- [ ] 不要なスキルがないか確認

### Step 5: 書き込み実行（Supervisor承認）

```typescript
const writeResult = await skillRunAsync('pipeline.web_skillize_from_tabs', {
  inputRefId: result.referenceId, // 既存結果を再利用
  confirmWrite: true,
});
```

- [ ] Supervisor承認を取得
- [ ] `.claude/skills/` への書き込みを確認
- [ ] 生成されたスキルファイルを確認

## Alternative: 既存URL束を使用

### Extension/手動収集したURL束

```typescript
// 1. URL束をmemoryに追加
const addResult = await memoryAdd(JSON.stringify([
  "https://docs.example.com/page1",
  "https://docs.example.com/page2",
  // ...
]), 'short-term', { tags: ['manual', 'urls'] });

// 2. パイプライン実行（tabs収集スキップ）
const result = await skillRunAsync('pipeline.web_skillize_from_tabs', {
  inputRefId: addResult.referenceId,
});
```

- [ ] inputRefIdでtabs収集がスキップされることを確認
- [ ] normalize -> skillize のみ実行されることを確認

## Domain Filtering

### 特定ドメインのみ対象

```typescript
const result = await skillRunAsync('pipeline.web_skillize_from_tabs', {
  includeDomains: ['docs.example.com', 'api.example.com'],
});
```

- [ ] 指定ドメインのみ処理されることを確認
- [ ] 他のドメインが除外されることを確認

### 特定ドメインを除外

```typescript
const result = await skillRunAsync('pipeline.web_skillize_from_tabs', {
  excludeDomains: ['analytics.example.com', 'tracking.example.com'],
});
```

- [ ] 指定ドメインが除外されることを確認

## Troubleshooting

### CDP接続エラー
```
Error: CDP connection failed: ECONNREFUSED
```
- [ ] Chromeが起動していることを確認
- [ ] `--remote-debugging-port=9222` が設定されていることを確認
- [ ] 別プロセスがポートを使用していないことを確認

### CAPTCHA検知
```
Error: CAPTCHA detected
```
- [ ] 該当URLをブラウザで手動確認
- [ ] CAPTCHAを手動で解決
- [ ] パイプライン再実行

### Rate Limit超過
```
Error: Too many requests
```
- [ ] `rateLimitMs` を増加（例: 2000ms）
- [ ] `maxFetch` を減少

## Quick Reference

| Parameter | Default | 推奨範囲 |
|-----------|---------|---------|
| maxUrls | 200 | 50-500 |
| maxFetch | 20 | 10-50 |
| rateLimitMs | 1000 | 500-5000 |
| perDomainLimit | 50 | 20-100 |

## Workflow Diagram

```
タブを開く
    ↓
pipeline.web_skillize_from_tabs (dry-run)
    ↓
結果確認（refIdで参照）
    ↓
問題なければ confirmWrite=true で再実行
    ↓
.claude/skills/ にスキル生成
```
