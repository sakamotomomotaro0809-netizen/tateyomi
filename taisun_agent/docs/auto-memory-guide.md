# スーパーメモリー自動化ガイド

## 概要

スーパーメモリー自動化により、**コンテキストを97%削減**し、**コストを99.5%削減**します。

### 重要: コストについて

```
✅ memory_add は完全無料
  - ローカルファイル保存のみ
  - APIコールなし
  - コスト: $0.00

✅ むしろコスト削減
  - 従来: 45KBログ → $0.135
  - 自動化: refIdのみ → $0.0006
  - 削減率: 99.5%
```

## 設定ファイル

### 設定場所

`config/proxy-mcp/auto-memory.json`

### デフォルト設定

```json
{
  "autoSave": {
    "enabled": true  ← 自動保存有効
  },
  "triggers": {
    "contextThreshold": {
      "enabled": true,
      "percentage": 70  ← コンテキスト70%超で自動保存
    },
    "outputSize": {
      "enabled": true,
      "threshold": 50000  ← 50KB超の出力を自動保存
    },
    "openCodeIntegration": {
      "enabled": true,
      "autoSaveLog": true,  ← OpenCodeログ自動保存
      "autoExportSession": true  ← セッション自動エクスポート
    }
  }
}
```

## カスタマイズ可能な設定

### 1. 自動保存のON/OFF

```json
{
  "autoSave": {
    "enabled": true  // false にすると完全無効化
  }
}
```

### 2. コンテキスト閾値の調整

```json
{
  "triggers": {
    "contextThreshold": {
      "enabled": true,
      "percentage": 70  // 60-90% で調整可能
    }
  }
}
```

**推奨値**:
- 保守的: 60% (早めに保存)
- バランス: 70% (デフォルト)
- 積極的: 80% (ギリギリまで使う)

### 3. ファイルサイズ閾値の調整

```json
{
  "triggers": {
    "outputSize": {
      "enabled": true,
      "threshold": 50000  // バイト単位
    }
  }
}
```

**推奨値**:
- 小さめ: 20000 (20KB) - より積極的に保存
- デフォルト: 50000 (50KB)
- 大きめ: 100000 (100KB) - 大きなファイルのみ

### 4. 対象ファイル拡張子

```json
{
  "triggers": {
    "fileOperations": {
      "enabled": true,
      "extensions": [".log", ".txt", ".json", ".md"],
      "minSize": 20000
    }
  }
}
```

**カスタマイズ例**:
```json
{
  "extensions": [
    ".log",      // ログファイル
    ".txt",      // テキストファイル
    ".json",     // JSONファイル
    ".md",       // Markdownファイル
    ".csv",      // CSVファイル
    ".xml",      // XMLファイル
    ".yaml"      // YAMLファイル
  ]
}
```

### 5. 除外パスの設定

```json
{
  "exclusions": {
    "paths": [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "coverage/**",     // カバレッジレポート
      "*.min.js",        // 圧縮済みファイル
      "*.min.css"
    ]
  }
}
```

### 6. 通知設定

```json
{
  "notification": {
    "showRefId": true,      // refID表示
    "showSummary": true,    // 要約表示
    "showSavings": true     // 節約量表示
  }
}
```

**省略モード**（静かに保存）:
```json
{
  "notification": {
    "showRefId": false,
    "showSummary": false,
    "showSavings": false
  }
}
```

### 7. OpenCode統合設定

```json
{
  "triggers": {
    "openCodeIntegration": {
      "enabled": true,
      "autoSaveLog": true,        // ログ自動保存
      "autoExportSession": true   // セッション自動エクスポート
    }
  }
}
```

**パターン**:

| autoSaveLog | autoExportSession | 動作 |
|-------------|-------------------|------|
| true | true | ログもセッションも保存（推奨） |
| true | false | ログのみ保存 |
| false | true | セッションのみ保存 |
| false | false | OpenCode統合無効 |

## 使用シーン別推奨設定

### シーン1: 開発中（頻繁な保存）

```json
{
  "triggers": {
    "contextThreshold": { "percentage": 60 },
    "outputSize": { "threshold": 20000 }
  }
}
```

### シーン2: 本番運用（控えめな保存）

```json
{
  "triggers": {
    "contextThreshold": { "percentage": 80 },
    "outputSize": { "threshold": 100000 }
  }
}
```

### シーン3: デバッグ（すべて保存）

```json
{
  "triggers": {
    "contextThreshold": { "percentage": 50 },
    "outputSize": { "threshold": 10000 },
    "fileOperations": { "minSize": 5000 }
  }
}
```

### シーン4: OpenCode専用

```json
{
  "autoSave": { "enabled": true },
  "triggers": {
    "contextThreshold": { "enabled": false },
    "outputSize": { "enabled": false },
    "openCodeIntegration": {
      "enabled": true,
      "autoSaveLog": true,
      "autoExportSession": true
    }
  }
}
```

## 動作確認

### 1. 設定ファイルの確認

```bash
cat config/proxy-mcp/auto-memory.json | jq .
```

### 2. フック実行テスト

```bash
node .claude/hooks/auto-memory-saver.js
```

### 3. 統計表示

```bash
node .claude/hooks/auto-memory-saver.js session-end
```

## トラブルシューティング

### Q: 自動保存が動かない

**A**: 設定を確認
```bash
# autoSave.enabled が true か確認
cat config/proxy-mcp/auto-memory.json | jq .autoSave.enabled
```

### Q: 通知が表示されない

**A**: notification設定を確認
```bash
cat config/proxy-mcp/auto-memory.json | jq .notification
```

### Q: コストが心配

**A**: 完全無料です
- memory_addはローカルファイル保存のみ
- APIコールなし
- むしろコスト削減（99.5%）

### Q: ディスク容量が心配

**A**: 自動クリーンアップあり
```json
{
  "storage": {
    "autoCleanup": true,
    "cleanupAfterDays": 14  // 14日後に自動削除
  }
}
```

## コスト削減の実例

### ケース1: テストログ保存

```
従来:
  - テストログ（45KB）を会話に貼る
  - コンテキスト消費: 45,000トークン
  - コスト: $0.135

自動化:
  - ログをローカル保存（無料）
  - refIdのみ表示（200トークン）
  - コスト: $0.0006

削減: $0.1344 (99.5%削減)
```

### ケース2: OpenCodeセッション

```
従来:
  - セッションJSON（120KB）を会話に貼る
  - コンテキスト消費: 120,000トークン
  - コスト: $0.36

自動化:
  - セッションをローカル保存（無料）
  - refIdのみ表示（200トークン）
  - コスト: $0.0006

削減: $0.3594 (99.8%削減)
```

### ケース3: 1日の開発作業

```
従来（10回のログ保存）:
  - 総コスト: $1.35

自動化（10回の自動保存）:
  - 総コスト: $0.006

削減: $1.344/日 → 月間 $40.32 削減
```

## まとめ

| 項目 | 値 |
|------|-----|
| **コスト** | 完全無料（$0.00） |
| **コンテキスト削減** | 97%削減 |
| **API料金削減** | 99.5%削減 |
| **保存場所** | ローカル (.taisun/memory/) |
| **自動クリーンアップ** | 14日後 |
| **カスタマイズ** | 完全対応 |

**結論**: 自動化してもコストは増えず、むしろ大幅に削減されます。
