# プロジェクトタイプ別 MCP 設定推奨

## 概要

Taisun Agentは既に99%のコンテキスト削減を実現しています。このドキュメントは、プロジェクトタイプ別に最適なMCP設定を提案します。

---

## コスト分析

### 無料MCP（APIキー不要）

| MCP | 機能 | コンテキスト消費 |
|-----|------|------------------|
| `taisun-proxy` | 統合プロキシ | 低 |
| `youtube` | 字幕ダウンロード | 低 |
| `context7` | 最新ドキュメント | 中 |
| `puppeteer` | ブラウザ自動化 | 低 |
| `playwright` | ブラウザテスト | 低 |
| `chroma` | ローカルベクトルDB | 低 |
| `n8n-mcp` | ワークフロー | 中 |
| `mcp-memory-service` | メモリ管理 | 低 |
| `open-websearch` | 検索（DuckDuckGo/Bing/Brave） | 低 |
| `qdrant` | ローカルベクトル検索 | 低 |

### 有料MCP（APIキー必要）

| MCP | 必要なAPIキー | 概算コスト/月 |
|-----|---------------|---------------|
| `gpt-researcher` | OPENAI_API_KEY + TAVILY_API_KEY | $10-50（使用量による） |
| `figma` | FIGMA_API_KEY | 無料（Figmaプラン内） |
| `twitter-client` | Twitter Cookies | 無料（認証のみ） |

---

## プロジェクトタイプ別推奨設定

### 1. マーケティングプロジェクト 📈

**主要スキル**: taiyo-style, lp-analysis, copywriting-helper, mendan-lp

```json
// .mcp.json (マーケティング向け)
{
  "mcpServers": {
    "taisun-proxy": { "disabled": false },
    "open-websearch": { "disabled": false },
    "playwright": { "disabled": false },
    "youtube": { "disabled": true },
    "context7": { "disabled": true },
    "gpt-researcher": { "disabled": true },
    "figma": { "disabled": true },
    "qdrant": { "disabled": true },
    "puppeteer": { "disabled": true },
    "chroma": { "disabled": true },
    "n8n-mcp": { "disabled": true },
    "mcp-memory-service": { "disabled": true }
  }
}
```

**有効MCP**: 3個（最小構成）
**コスト**: 無料
**推奨スキル**:
- `/taiyo-style` - セールスレター
- `/lp-analysis` - LP分析
- `/copywriting-helper` - コピーライティング
- `/taiyo-style-headline` - ヘッドライン生成
- `/mendan-lp` - 面談LP

---

### 2. 動画制作プロジェクト 🎬

**主要スキル**: video-agent, youtube_channel_summary, nanobanana-pro

```json
// .mcp.json (動画制作向け)
{
  "mcpServers": {
    "taisun-proxy": { "disabled": false },
    "youtube": { "disabled": false },
    "playwright": { "disabled": false },
    "open-websearch": { "disabled": true },
    "context7": { "disabled": true },
    "gpt-researcher": { "disabled": true },
    "figma": { "disabled": true },
    "qdrant": { "disabled": true },
    "puppeteer": { "disabled": true },
    "chroma": { "disabled": true },
    "n8n-mcp": { "disabled": true },
    "mcp-memory-service": { "disabled": true }
  }
}
```

**有効MCP**: 3個
**コスト**: 無料
**推奨スキル**:
- `/video-agent` - 動画パイプライン統合
- `/youtube_channel_summary` - YouTube分析
- `/nanobanana-pro` - AI画像生成（サムネイル等）
- `/launch-video` - ローンチ動画スクリプト

---

### 3. リサーチプロジェクト 🔍

**主要スキル**: research, gpt-researcher, mega-research

```json
// .mcp.json (リサーチ向け)
{
  "mcpServers": {
    "taisun-proxy": { "disabled": false },
    "open-websearch": { "disabled": false },
    "gpt-researcher": { "disabled": false },
    "context7": { "disabled": true },
    "youtube": { "disabled": true },
    "figma": { "disabled": true },
    "qdrant": { "disabled": true },
    "puppeteer": { "disabled": true },
    "playwright": { "disabled": true },
    "chroma": { "disabled": true },
    "n8n-mcp": { "disabled": true },
    "mcp-memory-service": { "disabled": true }
  }
}
```

**有効MCP**: 3個
**コスト**: $10-50/月（gpt-researcher使用時のみ）
**推奨スキル**:
- `/research` - 深層調査
- `/gpt-researcher` - 自律型リサーチ（APIコスト発生）
- `/research-free` - 無料リサーチ（APIキー不要）
- `/research-cited-report` - 出典付きレポート

**コスト削減Tips**:
- 軽い調査は `/research-free` を使用（無料）
- 深い調査のみ `/gpt-researcher` を使用

---

### 4. システム開発プロジェクト 💻

**主要スキル**: sdd-req100, context7-docs, code-review

```json
// .mcp.json (システム開発向け)
{
  "mcpServers": {
    "taisun-proxy": { "disabled": false },
    "context7": { "disabled": false },
    "playwright": { "disabled": false },
    "qdrant": { "disabled": false },
    "chroma": { "disabled": false },
    "open-websearch": { "disabled": true },
    "youtube": { "disabled": true },
    "gpt-researcher": { "disabled": true },
    "figma": { "disabled": true },
    "puppeteer": { "disabled": true },
    "n8n-mcp": { "disabled": true },
    "mcp-memory-service": { "disabled": true }
  }
}
```

**有効MCP**: 5個
**コスト**: 無料
**推奨スキル**:
- `/sdd-req100` - 要件定義（100点満点スコアリング）
- `/context7-docs` - 最新ドキュメント取得
- `/tdd` - テスト駆動開発
- `/code-review` - コードレビュー
- `/plan` - 実装計画

---

### 5. 画像生成プロジェクト 🎨

**主要スキル**: nanobanana-pro, figma-design

```json
// .mcp.json (画像生成向け)
{
  "mcpServers": {
    "taisun-proxy": { "disabled": false },
    "playwright": { "disabled": false },
    "figma": { "disabled": false },
    "open-websearch": { "disabled": true },
    "youtube": { "disabled": true },
    "context7": { "disabled": true },
    "gpt-researcher": { "disabled": true },
    "qdrant": { "disabled": true },
    "puppeteer": { "disabled": true },
    "chroma": { "disabled": true },
    "n8n-mcp": { "disabled": true },
    "mcp-memory-service": { "disabled": true }
  }
}
```

**有効MCP**: 3個
**コスト**: 無料（Figma APIは無料枠内）
**推奨スキル**:
- `/nanobanana-pro` - Gemini画像生成
- `/nanobanana-prompts` - プロンプト最適化
- `/figma-design` - Figmaデザイン→コード

---

## クイック設定コマンド

プロジェクトディレクトリで以下を実行：

```bash
# マーケティング用
cp ~/.claude/mcp-presets/marketing.mcp.json .mcp.json

# 動画制作用
cp ~/.claude/mcp-presets/video.mcp.json .mcp.json

# リサーチ用
cp ~/.claude/mcp-presets/research.mcp.json .mcp.json

# システム開発用
cp ~/.claude/mcp-presets/development.mcp.json .mcp.json

# 画像生成用
cp ~/.claude/mcp-presets/image.mcp.json .mcp.json
```

---

## 既存の最適化（実装済み）

Taisun Agentには以下の最適化が既に実装されています：

| 最適化 | 効果 |
|--------|------|
| 4層階層メモリ | 99%コンテキスト削減 |
| 自動コンパクト | 70%/80%/85%/90%閾値 |
| パフォーマンスモード | 93%フック削減（31→5） |
| taisun-proxy統合 | 単一エントリポイント |

**追加の最適化は不要です。** プロジェクトに合わせてMCPを選択的に有効化するだけで十分です。

---

## コスト最適化のまとめ

| 戦略 | 節約効果 |
|------|----------|
| `/research-free` を優先使用 | gpt-researcher APIコスト削減 |
| MCPを3-5個に絞る | コンテキスト消費削減 |
| `npm run perf:fast` | フック処理時間93%削減 |
| プロジェクト別.mcp.json | 不要なMCP無効化 |
