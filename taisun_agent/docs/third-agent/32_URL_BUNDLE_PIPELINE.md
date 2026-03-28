# URL Bundle Pipeline - P7.2

URL束を整形・正規化し、バッチでSkillizeするパイプライン。

## Overview

Browser拡張やCDP経由で収集したURL一覧を処理するパイプライン:

1. **URL Bundle Normalize**: URL束を整形（重複除去、UTM除去、末尾スラッシュ統一）
2. **Batch Skillize**: 整形済みURL束からスキルをバッチ生成

全ての入出力はmemory refIdパターンに従い、大量データも最小出力で扱える。

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       URL Bundle Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  Raw URLs    │ ─> │ URL Bundle       │ ─> │ Normalized   │  │
│  │  (in memory) │    │ Normalize        │    │ Bundle       │  │
│  │  inputRefId  │    │                  │    │ outputRefId  │  │
│  └──────────────┘    └──────────────────┘    └──────────────┘  │
│                              │                       │          │
│                              │ UTM除去              │          │
│                              │ 重複除去              │          │
│                              │ ドメイングループ化    │          │
│                              │ 件数制限              ↓          │
│                      ┌──────────────────────────────────┐      │
│                      │     Batch Skillize               │      │
│                      │     (dry-run default)            │      │
│                      │     rate-limited                 │      │
│                      └──────────────────────────────────┘      │
│                                      │                          │
│                                      ↓                          │
│                      ┌──────────────────────────────────┐      │
│                      │     Generated Skills             │      │
│                      │     (in memory + disk if write)  │      │
│                      │     outputRefId                  │      │
│                      └──────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### url.normalize_bundle

URL束を正規化・整形する。

```typescript
normalizeUrlBundle(inputRefId: string, options?: UrlBundleConfig): Promise<WebSkillResult>
```

**Options:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| maxUrls | number | 200 | 処理する最大URL数 |
| removeUtm | boolean | true | UTMパラメータ除去 |
| normalizeTrailingSlash | boolean | true | 末尾スラッシュ統一 |
| groupByDomain | boolean | true | ドメイン別グループ化 |
| namespace | MemoryNamespace | 'short-term' | 出力の保存先 |

**入力フォーマット（自動検出）:**
- JSON配列: `["url1", "url2"]`
- オブジェクト配列: `[{ url: "url1" }, { href: "url2" }]`
- オブジェクト: `{ urls: [...] }` or `{ tabs: [...] }`
- 改行区切り: `url1\nurl2\nurl3`
- カンマ区切り: `url1, url2, url3`

**出力例:**
```json
{
  "success": true,
  "outputRefId": "abc123",
  "summary": "Normalized 150 URLs from 200 input URLs...",
  "data": {
    "inputCount": 200,
    "outputCount": 150,
    "duplicatesRemoved": 45,
    "removedCount": 50,
    "domainGroups": {
      "example.com": 80,
      "other.com": 70
    }
  }
}
```

### url.get_bundle_stats

URL束の統計情報を取得（処理なし）。

```typescript
getUrlBundleStats(inputRefId: string, options?: { namespace?: MemoryNamespace }): Promise<WebSkillResult>
```

### url.batch_skillize

URL束をバッチでSkillize処理。

```typescript
batchSkillizeUrlBundle(inputRefId: string, options?: BatchSkillizeConfig): Promise<WebSkillResult>
```

**Options:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| maxUrls | number | 50 | 処理する最大URL数 |
| rateLimitMs | number | 1000 | URL間の遅延（ms） |
| confirmWrite | boolean | false | ディスク書き込み（false=dry-run） |
| template | string | auto | テンプレート強制指定 |
| namespace | MemoryNamespace | 'long-term' | 出力の保存先 |
| stopOnError | boolean | false | エラー時に停止 |

**IMPORTANT:** `confirmWrite`はデフォルトでfalse（dry-run）。
書き込みにはSupervisor承認が必要。

### url.batch_skillize_preview

バッチSkillizeのプレビュー（実行なし）。

```typescript
batchSkillizePreview(inputRefId: string, options?: BatchSkillizeConfig): Promise<WebSkillResult>
```

## Usage Examples

### Basic Flow

```typescript
// 1. ブラウザ拡張からURL束をmemoryに保存
const addResult = await memoryAdd(JSON.stringify([
  "https://docs.example.com/getting-started",
  "https://docs.example.com/api-reference?utm_source=google",
  "https://docs.example.com/getting-started/", // 重複（末尾スラッシュ違い）
  "https://other.com/guide"
]), 'short-term', { tags: ['browser', 'tabs'] });

const inputRefId = addResult.referenceId;

// 2. URL束を正規化
const normalizeResult = await normalizeUrlBundle(inputRefId);
// → 4 URLs → 3 URLs (1 duplicate removed, UTM stripped)

const normalizedRefId = normalizeResult.outputRefId;

// 3. プレビューで確認
const preview = await batchSkillizePreview(normalizedRefId);
// → "3 URLs to process, ~5 minutes"

// 4. dry-runでスキル生成
const dryRunResult = await batchSkillizeUrlBundle(normalizedRefId);
// → 3 skills generated (not written)

// 5. 承認後、実際に書き込み
const writeResult = await batchSkillizeUrlBundle(normalizedRefId, {
  confirmWrite: true
});
// → 3 skills written to .claude/skills/
```

### With Rate Limiting

```typescript
// 大量URL処理時は適切なレート制限を
const result = await batchSkillizeUrlBundle(inputRefId, {
  maxUrls: 100,
  rateLimitMs: 2000, // 2秒間隔
  stopOnError: false, // エラーでも続行
});
```

### Template Override

```typescript
// ドキュメントサイトと分かっている場合
const result = await batchSkillizeUrlBundle(inputRefId, {
  template: 'docs',
});
```

## Safety Features

### Dry-run Default
- `confirmWrite`はデフォルトでfalse
- 書き込み前に必ずプレビューを確認できる

### Rate Limiting
- デフォルト1秒間隔でURL処理
- サイトへの負荷を軽減

### URL Count Caps
- normalize: デフォルト200件
- skillize: デフォルト50件
- 設定で調整可能

### Error Handling
- 個別URL失敗でも処理続行（stopOnError=false）
- 全結果をmemoryに保存

## Files

| File | Description |
|------|-------------|
| `src/proxy-mcp/browser/url-bundle.ts` | URL束正規化ロジック |
| `src/proxy-mcp/browser/url-bundle-skillize.ts` | バッチSkillizeロジック |
| `src/proxy-mcp/browser/skills.ts` | スキル関数エクスポート |
| `tests/unit/url-bundle.test.ts` | 正規化テスト |
| `tests/unit/url-bundle-skillize.test.ts` | バッチSkillizeテスト |

## Related

- [24_SKILLIZE.md](./24_SKILLIZE.md) - Skillize基本機能
- [31_PLAYWRIGHT_CDP.md](./31_PLAYWRIGHT_CDP.md) - CDP連携
- [22_MEMORY_SYSTEM.md](./22_MEMORY_SYSTEM.md) - Memoryシステム
