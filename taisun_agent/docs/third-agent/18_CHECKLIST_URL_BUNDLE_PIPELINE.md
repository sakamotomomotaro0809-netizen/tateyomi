# Checklist: URL Bundle Pipeline

URL束パイプライン（normalize + batch skillize）の使用チェックリスト。

## Pre-requisites

- [ ] URL束がmemoryに保存済み（refIdを取得）
- [ ] 対象URLがアクセス可能（CAPTCHA/ログインなし）
- [ ] Chromeが起動中（CDP使用時）

## URL Bundle Normalize

### Step 1: 統計確認（オプション）

```typescript
const stats = await getUrlBundleStats(inputRefId);
console.log(stats.summary);
// → Total: 200, Unique domains: 15
```

- [ ] URL総数を確認
- [ ] ドメイン分布を確認
- [ ] 予想外のドメインがないか確認

### Step 2: 正規化実行

```typescript
const result = await normalizeUrlBundle(inputRefId, {
  maxUrls: 200,      // 必要に応じて調整
  removeUtm: true,   // UTMパラメータ除去
});
```

- [ ] `success: true` を確認
- [ ] `duplicatesRemoved` の数を確認
- [ ] `domainGroups` のドメイン分布を確認
- [ ] `outputRefId` を記録

### Step 3: 正規化結果確認

```typescript
const content = await memoryGetContent(outputRefId);
// JSON.parse(content.data.content) で確認
```

- [ ] URLが正しく正規化されている
- [ ] 重複が除去されている
- [ ] UTMパラメータが除去されている

## Batch Skillize

### Step 4: プレビュー確認

```typescript
const preview = await batchSkillizePreview(normalizedRefId, {
  maxUrls: 50,
});
console.log(preview.summary);
```

- [ ] 処理URL数を確認
- [ ] スキップされるURL数を確認
- [ ] 推定時間を確認
- [ ] ドメイン分布を確認

### Step 5: Dry-run実行

```typescript
const dryRun = await batchSkillizeUrlBundle(normalizedRefId, {
  maxUrls: 50,
  rateLimitMs: 1000,
  confirmWrite: false, // dry-run
});
```

- [ ] `success: true` を確認
- [ ] `successCount` を確認
- [ ] `failureCount` を確認（0であるべき）
- [ ] 生成されたスキル名を確認

### Step 6: 結果レビュー

```typescript
const results = await memoryGetContent(dryRun.outputRefId);
// 各スキルのrefIdから内容を確認
```

- [ ] 生成されたスキルの品質を確認
- [ ] テンプレート選択が適切か確認
- [ ] 不要なスキルがないか確認

### Step 7: 書き込み承認（Supervisor承認）

```typescript
// confirmWrite=true で実際に書き込み
const writeResult = await batchSkillizeUrlBundle(normalizedRefId, {
  maxUrls: 50,
  confirmWrite: true, // 実際に書き込み
});
```

- [ ] Supervisor承認を取得
- [ ] `.claude/skills/` への書き込みを確認
- [ ] 生成されたスキルファイルを確認

## Post-processing

### Step 8: スキル動作確認

- [ ] 生成されたスキルが `listGeneratedSkills()` に表示
- [ ] 代表的なスキルを実行してテスト
- [ ] エラーがないことを確認

### Step 9: クリーンアップ

- [ ] 不要な中間refIdをmemoryから削除（オプション）
- [ ] 失敗したURLを手動確認（必要に応じて）

## Troubleshooting

### CAPTCHA/ログインエラー
```
Error: CAPTCHA or login required
```
- [ ] 該当URLをブラウザで手動確認
- [ ] ログインが必要な場合はCDPで既存セッション使用

### Rate Limit超過
```
Error: Too many requests
```
- [ ] `rateLimitMs` を増加（例: 2000ms）
- [ ] `maxUrls` を減少

### メモリ不足
```
Error: Memory limit exceeded
```
- [ ] `maxUrls` を減少
- [ ] バッチを分割して処理

## Quick Reference

| Parameter | Default | 推奨範囲 |
|-----------|---------|---------|
| normalize.maxUrls | 200 | 50-500 |
| skillize.maxUrls | 50 | 10-100 |
| skillize.rateLimitMs | 1000 | 500-5000 |
