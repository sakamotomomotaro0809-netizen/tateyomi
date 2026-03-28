# TAISUN Agent システム強化計画

## 概要

既存の82エージェント自動選択システム、227 MCPツール、スキル自動マッピングを活かしつつ、最新技術を統合する強化計画。

---

## 1. Tool Search `defer_loading` 統合

### 背景
[Claude Code Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)により、コンテキスト消費を**46-85%削減**可能。

- 従来: 50+ MCPツール → ~77Kトークン消費
- Tool Search: → ~8.7Kトークン（**89%削減**）
- Opus 4.5精度: 79.5% → 88.1%（+8.6%向上）

### 実装方法

#### Phase 1: MCP設定の最適化

```json
// .mcp.json の更新
{
  "mcpServers": {
    // === 常時ロード（頻繁に使用） ===
    "taisun-proxy": {
      "disabled": false,
      "defer_loading": false  // 常時ロード
    },
    "playwright": {
      "disabled": false,
      "defer_loading": false  // 常時ロード
    },

    // === 遅延ロード（必要時のみ） ===
    "gpt-researcher": {
      "disabled": false,
      "defer_loading": true,  // 遅延ロード
      "search_keywords": ["research", "調査", "リサーチ", "分析"]
    },
    "figma": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["figma", "デザイン", "UI", "design"]
    },
    "youtube": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["youtube", "動画", "字幕", "video"]
    },
    "qdrant": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["vector", "ベクトル", "検索", "memory"]
    },
    "chroma": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["embedding", "記憶", "永続化"]
    },
    "n8n-mcp": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["workflow", "自動化", "n8n", "automation"]
    },
    "context7": {
      "disabled": false,
      "defer_loading": true,
      "search_keywords": ["docs", "ドキュメント", "API", "最新"]
    }
  }
}
```

#### Phase 2: コーディネーターとの統合

```markdown
// .claude/agents/00-ait42-coordinator.md への追加

<tool_search_integration>
## Tool Search 自動連携

タスク分析時に必要なMCPツールを動的にロード：

1. キーワード抽出 → defer_loading MCPの search_keywords とマッチング
2. マッチしたMCPのみ Tool Search で取得
3. 不要なMCPはコンテキストに含めない

### 例
User: "YouTube動画を分析して教材を作成して"
→ Keywords: ["YouTube", "動画", "分析", "教材"]
→ Load: youtube, video-agent skills
→ Skip: figma, qdrant, n8n-mcp (不要)
→ Context savings: ~60%
</tool_search_integration>
```

### 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| 初期コンテキスト | ~50Kトークン | ~15Kトークン |
| 削減率 | - | **70%** |
| 使用可能コンテキスト | 150K | 185K |
| エージェント精度 | ~85% | ~90% |

---

## 2. Apify MCP 統合（リサーチ強化）

### 背景
[Apify MCP Server](https://github.com/apify/apify-mcp-server)は数千のスクレイパーを提供し、SNS・検索エンジン・ECサイトからのデータ抽出を自動化。

### 追加するスクレイパー

| Actor | 用途 | Taisunでの活用 |
|-------|------|---------------|
| `instagram-scraper` | Instagram投稿・プロフィール取得 | マーケティングリサーチ |
| `google-search-scraper` | Google検索結果スクレイピング | 競合分析 |
| `youtube-scraper` | YouTube動画メタデータ | 動画リサーチ強化 |
| `twitter-scraper` | X/Twitter投稿取得 | SNSトレンド分析 |
| `amazon-scraper` | Amazon商品情報 | EC競合分析 |
| `linkedin-scraper` | LinkedIn プロフィール | B2Bリサーチ |

### 実装

```json
// .mcp.json への追加
{
  "apify": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@apify/mcp-server"],
    "env": {
      "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
    },
    "disabled": false,
    "defer_loading": true,
    "search_keywords": ["scrape", "スクレイピング", "抽出", "SNS", "Instagram", "Twitter"]
  }
}
```

### 新規スキル作成

```markdown
// .claude/skills/apify-research/SKILL.md

# Apify Research Skill

## Description
Apify MCP経由でSNS・検索エンジン・ECサイトからデータを自動抽出する高度なリサーチスキル。

## Triggers
- 「Instagramを調査」「Twitter分析」「競合のSNSを調べて」
- 「Amazon商品をリサーチ」「ECサイト分析」
- 「Google検索で競合を調べて」

## Workflow
1. ユーザーリクエストからターゲットプラットフォームを特定
2. 適切なApify Actorを選択
3. スクレイピング実行
4. データを構造化してレポート生成

## Required MCP
- apify (defer_loading: true)

## Cost
- Apify無料枠: 月5ドル相当のクレジット
- 超過時: 使用量に応じた課金
```

---

## 3. SkillsMP からのスキル追加

### 背景
[SkillsMP](https://skillsmp.com/)は96,751以上のClaude Codeスキルを提供するマーケットプレイス。

### 追加推奨スキル

#### マーケティング強化

| スキル | SkillsMP URL | 用途 |
|--------|-------------|------|
| `seo-analyzer` | skillsmp.com/skills/seo-analyzer | SEO分析・改善提案 |
| `competitor-analysis` | skillsmp.com/skills/competitor-analysis | 競合分析レポート |
| `ad-copy-generator` | skillsmp.com/skills/ad-copy-generator | 広告コピー生成 |
| `email-sequence-builder` | skillsmp.com/skills/email-sequence | メールシーケンス設計 |

#### 開発強化

| スキル | 用途 |
|--------|------|
| `api-documentation` | API仕様書自動生成 |
| `database-schema-designer` | DB設計支援 |
| `performance-auditor` | パフォーマンス監査 |
| `security-hardening` | セキュリティ強化提案 |

#### 動画・コンテンツ強化

| スキル | 用途 |
|--------|------|
| `youtube-seo` | YouTube SEO最適化 |
| `thumbnail-analyzer` | サムネイル分析・改善 |
| `script-optimizer` | 台本最適化 |
| `engagement-predictor` | エンゲージメント予測 |

### インストール方法

```bash
# SkillsMPからのスキルインストール
# 1. GitHubリポジトリをクローン
git clone https://github.com/[owner]/[skill-name] /tmp/skill-temp

# 2. SKILL.mdを確認（セキュリティレビュー）
cat /tmp/skill-temp/SKILL.md

# 3. ~/.claude/skills/ にコピー
cp -R /tmp/skill-temp ~/.claude/skills/[skill-name]

# 4. クリーンアップ
rm -rf /tmp/skill-temp
```

---

## 4. MCP Market からの追加MCP

### 背景
[MCP Market](https://mcpmarket.com/)と[GitHub MCP Registry](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/)から有用なMCPを追加。

### 追加推奨MCP

#### 生産性向上

| MCP | 機能 | defer_loading |
|-----|------|---------------|
| `zapier-mcp` | Zapier連携（クロスアプリ自動化） | true |
| `notion-mcp` | Notion連携（ドキュメント管理） | true |
| `slack-mcp` | Slack通知・メッセージ | true |
| `calendar-mcp` | Googleカレンダー連携 | true |

#### データ分析

| MCP | 機能 | defer_loading |
|-----|------|---------------|
| `bigquery-mcp` | BigQueryクエリ実行 | true |
| `sheets-mcp` | Googleスプレッドシート操作 | true |
| `airtable-mcp` | Airtable連携 | true |

#### AI/ML強化

| MCP | 機能 | defer_loading |
|-----|------|---------------|
| `perplexity-mcp` | Perplexity AI検索 | true |
| `exa-mcp` | Exa AIセマンティック検索 | true |
| `tavily-mcp` | Tavily AI検索（リサーチ特化） | true |

### 実装例

```json
// .mcp.json への追加
{
  "zapier": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-zapier"],
    "env": {
      "ZAPIER_API_KEY": "${ZAPIER_API_KEY}"
    },
    "defer_loading": true,
    "search_keywords": ["zapier", "自動化", "連携", "トリガー"]
  },
  "tavily": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "tavily-mcp"],
    "env": {
      "TAVILY_API_KEY": "${TAVILY_API_KEY}"
    },
    "defer_loading": true,
    "search_keywords": ["search", "検索", "web", "リサーチ"]
  }
}
```

---

## 5. その他の強化提案

### 5.1 スキル自動マッピング拡充

```json
// skill-mapping.json への追加
[
  {
    "name": "要件定義（SDD-REQ100）",
    "when_contains_any": ["要件", "仕様", "スペック", "要件定義"],
    "required_skills": ["sdd-req100"],
    "priority": 85
  },
  {
    "name": "リサーチ（無料）",
    "when_contains_any": ["調査", "リサーチ", "調べて", "検索して"],
    "required_skills": ["research-free"],
    "priority": 75
  },
  {
    "name": "深層リサーチ（API使用）",
    "when_contains_all": ["深く", "詳しく"],
    "when_contains_any": ["調査", "リサーチ"],
    "required_skills": ["gpt-researcher", "mega-research"],
    "priority": 90
  },
  {
    "name": "画像生成",
    "when_contains_any": ["画像", "イラスト", "ビジュアル", "グラフィック"],
    "required_skills": ["nanobanana-pro"],
    "priority": 70
  },
  {
    "name": "コードレビュー",
    "when_contains_any": ["レビュー", "チェック", "確認して"],
    "when_contains_all": ["コード"],
    "required_skills": ["code-review", "dual-ai-review"],
    "priority": 80
  }
]
```

### 5.2 統合ワークフローコマンド

```markdown
// .claude/commands/marketing-full.md

---
name: marketing-full
description: マーケティングキャンペーン一括作成（要件定義→LP→コピー→画像）
---

# Marketing Full Pipeline

## 実行フロー
1. `/sdd-req100` - 要件定義（100点スコアリング）
2. `/taiyo-style-lp` - LP構造設計
3. `/taiyo-style-sales-letter` - セールスコピー作成
4. `/nanobanana-pro` - ヒーロー画像生成
5. `/lp-analysis` - 最終チェック

## 出力
marketing-package/
├── requirements.md (100点要件書)
├── lp-structure.json
├── sales-letter.md
├── hero-image.png
└── analysis-report.md
```

### 5.3 コスト監視Hook

```javascript
// .claude/hooks/cost-warning.js

export default {
  name: "cost-warning",
  event: "PreToolUse",

  async run({ tool, input }) {
    const costlyMcps = ['gpt-researcher', 'apify', 'tavily'];

    if (costlyMcps.some(mcp => tool.includes(mcp))) {
      console.log(`⚠️ コスト警告: ${tool} はAPIコストが発生します`);
      console.log(`   続行しますか？ (Ctrl+C でキャンセル)`);
      // 3秒待機
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};
```

### 5.4 Memory Bank 強化

```json
// .mcp.json への追加
{
  "memory-bank": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "memory-bank-mcp"],
    "env": {
      "MEMORY_PATH": "./.taisun/memory-bank"
    },
    "defer_loading": true,
    "search_keywords": ["remember", "覚えて", "思い出して", "前回"]
  }
}
```

### 5.5 Sequential Thinking（複雑なロジック用）

```json
// .mcp.json への追加
{
  "sequential-thinking": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "sequential-thinking-mcp"],
    "defer_loading": true,
    "search_keywords": ["step by step", "順番に", "論理的に", "段階的"]
  }
}
```

---

## 6. 実装優先順位

### Phase 1: 即時実装（1-2日）

| 項目 | 工数 | 効果 |
|------|------|------|
| defer_loading 設定 | 2h | コンテキスト70%削減 |
| スキル自動マッピング追加 | 1h | 操作効率向上 |
| コスト警告Hook | 1h | 予期せぬ課金防止 |

### Phase 2: 短期実装（1週間）

| 項目 | 工数 | 効果 |
|------|------|------|
| Apify MCP統合 | 3h | リサーチ機能大幅強化 |
| 統合ワークフローコマンド | 4h | マーケティング効率化 |
| Memory Bank追加 | 2h | 長期記憶強化 |

### Phase 3: 中期実装（2-4週間）

| 項目 | 工数 | 効果 |
|------|------|------|
| SkillsMPスキル追加 | 6h | 機能拡張 |
| MCP Market追加 | 4h | 連携強化 |
| ドキュメント整備 | 4h | 使いやすさ向上 |

---

## 7. コスト見積もり

### 無料で実装可能

- defer_loading設定
- スキル自動マッピング
- 統合ワークフローコマンド
- SkillsMPスキル（オープンソース）
- Memory Bank（ローカル）

### APIコストが発生するもの

| サービス | 月額目安 | 用途 |
|----------|---------|------|
| Apify | $5-50 | SNSスクレイピング |
| Tavily | $0-20 | AI検索（無料枠あり） |
| gpt-researcher | $10-50 | 深層リサーチ |

**推奨**: 無料版（research-free, open-websearch）を優先使用し、必要時のみ有料サービスを使用。

---

## Sources

- [Claude Code Tool Search - 46.9% Context Reduction](https://medium.com/@joe.njenga/claude-code-just-cut-mcp-context-bloat-by-46-9-51k-tokens-down-to-8-5k-with-new-tool-search-ddf9e905f734)
- [Tool Search Tool - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Apify MCP Server - GitHub](https://github.com/apify/apify-mcp-server)
- [SkillsMP - 96,751+ Skills](https://skillsmp.com/)
- [MCP Market](https://mcpmarket.com/)
- [GitHub MCP Registry](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/)
- [Top 10 MCP Servers for Claude Code 2026](https://apidog.com/blog/top-10-mcp-servers-for-claude-code/)
- [Best MCP Servers 2026](https://www.builder.io/blog/best-mcp-servers-2026)
