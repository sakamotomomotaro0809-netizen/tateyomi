# One-Command Pipeline: web_skillize_from_tabs - P7.3

1コマンドで URL収集 -> 正規化 -> Skillize まで実行するパイプライン。

## Overview

`pipeline.web_skillize_from_tabs` は以下の3ステージを自動実行:

1. **Tabs Collection**: CDP経由でChromeの開いているタブURLを収集
2. **URL Normalize**: 重複除去、UTM除去、ドメイングループ化
3. **Batch Skillize**: 各URLをSkillize（dry-run既定）

全ての入出力はmemory refIdパターンに従い、大量データもチャットに出さない。

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    pipeline.web_skillize_from_tabs                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │  Chrome Tabs   │ -> │  URL Bundle     │ -> │  Batch          │      │
│  │  (CDP)         │    │  Normalize      │    │  Skillize       │      │
│  │  tabsRefId     │    │  normalizedRefId│    │  skillizeRefId  │      │
│  └────────────────┘    └─────────────────┘    └─────────────────┘      │
│         │                      │                      │                 │
│         │ list_tabs_urls       │ dedup/UTM            │ dry-run         │
│         │ domain filter        │ domain group         │ rate-limited    │
│         └──────────────────────┴──────────────────────┘                 │
│                                │                                         │
│                                ↓                                         │
│                    ┌───────────────────────────┐                        │
│                    │  Pipeline Run Record      │                        │
│                    │  (all intermediate refIds)│                        │
│                    │  outputRefId              │                        │
│                    └───────────────────────────┘                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Reference

### pipeline.web_skillize_from_tabs

```typescript
webSkillizeFromTabs(options?: PipelineTabsSkillizeConfig): Promise<WebSkillResult>
```

**Options:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| inputRefId | string \| null | null | 既存URL束を使用（tabs収集スキップ） |
| includeDomains | string[] \| null | null | 含めるドメイン |
| excludeDomains | string[] \| null | null | 除外するドメイン |
| excludeUrlPatterns | string[] \| null | null | 除外するURLパターン（正規表現） |
| maxUrls | number | 200 | 正規化の最大URL数 |
| perDomainLimit | number | 50 | ドメインごとの上限 |
| stripTracking | boolean | true | UTM等トラッキングパラメータ除去 |
| maxFetch | number | 20 | Skillize対象の最大URL数 |
| rateLimitMs | number | 1000 | URL間の遅延（ms） |
| confirmWrite | boolean | false | ディスク書き込み（false=dry-run） |
| namespace | MemoryNamespace | 'long-term' | 出力の保存先 |

**出力例:**
```json
{
  "success": true,
  "refId": "pipeline-run-abc123",
  "summary": "Pipeline: web_skillize_from_tabs (DRY-RUN)\nDuration: 45s\n\nStages:\n  1. Tabs: 25 collected\n  2. Normalize: 25 -> 20 URLs (5 duplicates removed)\n  3. Skillize: 18/20 success\n\nUse memory_search with refId to inspect intermediate results."
}
```

## Usage Examples

### Basic Usage (Dry-run)

```typescript
// 1. Chromeでタブを開く
// 2. パイプライン実行
const result = await webSkillizeFromTabs();

console.log(result.summary);
// → Pipeline complete, 20 URLs processed (dry-run)

// 3. 結果確認
const runRecord = await memoryGetContent(result.refId);
// → { stages: { tabs: {...}, normalize: {...}, skillize: {...} } }
```

### With Domain Filter

```typescript
// ドキュメントサイトのみ対象
const result = await webSkillizeFromTabs({
  includeDomains: ['docs.example.com', 'api.example.com'],
  excludeDomains: ['analytics.example.com'],
});
```

### Using Existing URL Bundle

```typescript
// 拡張機能等で収集済みのURL束を使用
const result = await webSkillizeFromTabs({
  inputRefId: 'existing-bundle-ref-123',
});
// → tabs収集をスキップ、normalize -> skillize のみ実行
```

### Write Mode (Supervisor Approval)

```typescript
// dry-run後、結果を確認してから書き込み
const dryRun = await webSkillizeFromTabs();
console.log(dryRun.summary); // 確認

// 承認後、書き込み実行
const writeResult = await webSkillizeFromTabs({
  inputRefId: dryRun.refId, // 既存結果を再利用
  confirmWrite: true,       // 書き込みモード
});
```

## Safety Features

### Dry-run Default
- `confirmWrite`はデフォルトでfalse
- 書き込み前に必ずプレビュー可能

### CDP Connection Check
- Chrome未起動時は `require_human` で停止
- 起動手順を含むエラーメッセージ返却

### Rate Limiting
- デフォルト1秒間隔でSkillize実行
- サイトへの負荷軽減

### Minimal Output
- URL全量はチャットに出さない
- 常にmemory refIdで参照

## CDP Setup

Chromeを以下のように起動:

```bash
# npm script
npm run chrome:debug:start

# Or manually
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222
```

## Pipeline Run Record

実行結果はmemoryに保存され、全ての中間refIdを含む:

```typescript
interface PipelineRunRecord {
  pipelineId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  config: PipelineConfig;
  stages: {
    tabs?: {
      refId: string;
      totalTabs: number;
      skipped?: boolean;
    };
    normalize?: {
      inputRefId: string;
      outputRefId: string;
      inputCount: number;
      outputCount: number;
      duplicatesRemoved: number;
    };
    skillize?: {
      inputRefId: string;
      outputRefId: string;
      processedCount: number;
      successCount: number;
      failureCount: number;
      dryRun: boolean;
    };
  };
  error?: string;
}
```

## Files

| File | Description |
|------|-------------|
| `src/proxy-mcp/browser/pipeline-tabs-skillize.ts` | パイプライン実装 |
| `src/proxy-mcp/browser/skills.ts` | スキル関数ラッパー |
| `src/proxy-mcp/tools/skill.ts` | skill_run統合 |
| `tests/unit/pipeline-tabs-skillize.test.ts` | ユニットテスト |

## Related

- [31_PLAYWRIGHT_CDP.md](./31_PLAYWRIGHT_CDP.md) - CDP連携
- [32_URL_BUNDLE_PIPELINE.md](./32_URL_BUNDLE_PIPELINE.md) - URL束パイプライン
- [24_SKILLIZE.md](./24_SKILLIZE.md) - Skillize基本機能
