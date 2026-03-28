# スーパーメモリー自動化 - クイックスタート

## 🎯 3つの重要な事実

### 1. 完全無料
```
✅ ローカルファイル保存のみ
✅ APIコールなし
✅ コスト: $0.00
```

### 2. むしろコスト削減
```
従来: 45KBログ → $0.135
自動化: refIdのみ → $0.0006
削減: 99.5% 💰
```

### 3. コンテキスト大幅節約
```
従来: 45,000トークン消費
自動化: 200トークン消費
削減: 97% 🚀
```

## 🚀 5分で始める

### ステップ1: 設定ファイル確認

```bash
cat config/proxy-mcp/auto-memory.json
```

既に作成済み ✅

### ステップ2: デフォルト設定の理解

```json
{
  "autoSave": { "enabled": true },  ← 自動保存ON
  "triggers": {
    "contextThreshold": { "percentage": 70 },  ← コンテキスト70%超で保存
    "outputSize": { "threshold": 50000 },      ← 50KB超の出力を保存
    "openCodeIntegration": {
      "autoSaveLog": true,          ← OpenCodeログ自動保存
      "autoExportSession": true     ← セッション自動エクスポート
    }
  }
}
```

### ステップ3: すぐ使える

**何もしなくても自動的に動作します**

```bash
# 例: OpenCode実行
/opencode-fix "バグ修正"

# 自動的に:
# 1. ログを.opencode/runs/に保存
# 2. memory_addで退避（無料）
# 3. セッションをエクスポート
# 4. refIdのみ表示
# → コンテキスト97%削減、コスト99.5%削減
```

## 📊 どう動くのか

### 自動保存のトリガー

```mermaid
トリガー1: コンテキスト70%超
  ↓
自動的にローカル保存（無料）
  ↓
refIdのみ会話に表示
  ↓
コンテキスト97%削減

トリガー2: 出力50KB超
  ↓
自動的にローカル保存（無料）
  ↓
refIdのみ会話に表示
  ↓
コスト99.5%削減

トリガー3: OpenCode実行
  ↓
ログとセッションを自動保存（無料）
  ↓
refIdのみ会話に表示
  ↓
後から追跡可能
```

## 🎛️ カスタマイズ（必要な場合のみ）

### より積極的に保存（開発時）

```json
{
  "triggers": {
    "contextThreshold": { "percentage": 60 },
    "outputSize": { "threshold": 20000 }
  }
}
```

### 控えめに保存（本番時）

```json
{
  "triggers": {
    "contextThreshold": { "percentage": 80 },
    "outputSize": { "threshold": 100000 }
  }
}
```

### 完全無効化（必要な場合のみ）

```json
{
  "autoSave": { "enabled": false }
}
```

## 💰 コスト削減の実例

### 1日の開発作業（10回のログ保存）

| 項目 | 従来 | 自動化 | 削減 |
|------|------|--------|------|
| ログ保存10回 | $1.35 | $0.006 | **$1.344/日** |
| 月間 | $40.50 | $0.18 | **$40.32/月** |
| 年間 | $486 | $2.16 | **$483.84/年** |

### OpenCodeセッション（5回/日）

| 項目 | 従来 | 自動化 | 削減 |
|------|------|--------|------|
| セッション5回 | $1.80 | $0.003 | **$1.797/日** |
| 月間 | $54.00 | $0.09 | **$53.91/月** |
| 年間 | $648 | $1.08 | **$646.92/年** |

**合計年間削減**: $1,130.76 💰💰💰

## 📁 保存場所とクリーンアップ

### 保存場所

```
.taisun/memory/memory.jsonl  ← メモリーデータ
.opencode/runs/              ← OpenCodeログ
.opencode/exports/           ← セッションJSON
.claude/temp/                ← 一時ファイル
```

### 自動クリーンアップ

```json
{
  "storage": {
    "autoCleanup": true,
    "cleanupAfterDays": 14  // 14日後に自動削除
  }
}
```

**ディスク容量の心配なし** ✅

## 🔍 動作確認

### 統計表示

```bash
node .claude/hooks/auto-memory-saver.js session-end
```

出力例:
```
📊 スーパーメモリー統計（このセッション）
   保存回数: 12回
   節約コンテキスト: 540k トークン
   節約コスト: $1.62
```

### 設定確認

```bash
# 自動保存が有効か確認
cat config/proxy-mcp/auto-memory.json | jq .autoSave.enabled
# → true

# 閾値確認
cat config/proxy-mcp/auto-memory.json | jq .triggers.contextThreshold
# → { "enabled": true, "percentage": 70 }
```

## ❓ FAQ

### Q: コストがかかるのでは？
**A**: 完全無料です。ローカルファイル保存のみで、APIコールなし。

### Q: 自動保存を止めたい
**A**: `config/proxy-mcp/auto-memory.json` で `enabled: false` に設定

### Q: ディスク容量が心配
**A**: 14日後に自動削除。手動削除も可能:
```bash
rm -rf .taisun/memory/*.jsonl
```

### Q: OpenCodeがない場合は？
**A**: OpenCodeなしでも動作。OpenCode関連は自動でスキップ。

### Q: 保存されたデータを見たい
**A**: memory_searchで取得:
```bash
memory_search("ref_abc123")
```

## 🎓 詳細ガイド

より詳しい情報: `docs/auto-memory-guide.md`

## 📝 まとめ

| 特徴 | 値 |
|------|-----|
| **コスト** | $0.00（完全無料） |
| **コンテキスト削減** | 97% |
| **API料金削減** | 99.5% |
| **年間削減額** | $1,130+ |
| **設定** | デフォルトで最適化済み |
| **カスタマイズ** | 完全対応 |

**結論**:
- ✅ 自動化してもコスト増加なし
- ✅ むしろ大幅にコスト削減
- ✅ コンテキスト節約で快適
- ✅ 設定は必要に応じて調整可能

**今すぐ使えます** 🚀
