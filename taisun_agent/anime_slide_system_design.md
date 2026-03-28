# 長文→アニメ・漫画風スライドシステム構成案

## システム概要

長文テキストをアニメ・漫画風のビジュアルスライドに自動変換するシステム。

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INPUT: 長文テキスト                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: テキスト分析・構造化                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Claude/GPT API  │  │ テキスト要約    │  │ シーン分割       │      │
│  │ (意味理解)      │  │ (章・セクション) │  │ (キーポイント)   │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2: ビジュアルプロンプト生成                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ シーン描写生成  │  │ アニメスタイル  │  │ キャラクター    │      │
│  │ (プロンプト)    │  │ 指定           │  │ 一貫性維持      │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3: 画像生成 (MCP/API)                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ NanoBanana Pro  │  │ Komiko         │  │ FLUX.1/DALL-E   │      │
│  │ (Gemini)        │  │ (漫画生成)     │  │ (高品質画像)    │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 4: スライド生成 (MCP/API)                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Presenton       │  │ PPTAgent       │  │ SlideSpeak MCP  │      │
│  │ (オープンソース) │  │ (AI編集)       │  │ (PowerPoint)    │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OUTPUT: アニメ風スライドデッキ                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 推奨コンポーネント

### 1. 画像生成 (アニメ・漫画風)

| ツール | 特徴 | GitHub | 推奨度 |
|--------|------|--------|--------|
| **Komiko** | 漫画・コミック特化、キャラクター一貫性 | Story-Engine-Inc/Komiko | ★★★★★ |
| **LlamaGen.AI** | アニメ・ゲーム生成、Cyaniモデル | LlamaGenAI | ★★★★☆ |
| **AnimeGAN** | 写真→アニメ変換 | TachibanaYoshino/AnimeGAN | ★★★★☆ |
| **AI-Anime-Maker** | Stable Diffusion使用 | blndev/AI-Anime-Maker | ★★★☆☆ |
| **FLUX.1** | 高品質イラスト生成 | SiliconFlow | ★★★★★ |

### 2. スライド生成

| ツール | 特徴 | GitHub/URL | 推奨度 |
|--------|------|------------|--------|
| **Presenton** | オープンソース、ローカル実行、DALL-E/Gemini/ComfyUI対応 | presenton/presenton | ★★★★★ |
| **PPTAgent** | Deep Research統合、自動アセット作成 | icip-cas/PPTAgent | ★★★★★ |
| **SlideSpeak MCP** | MCP標準対応 | mcp.aibase.com | ★★★★☆ |
| **SlideDeck AI** | Gemini Flash/GPT-4o対応 | barun-saha/slide-deck-ai | ★★★★☆ |
| **FlashDocs MCP** | AI駆動スライド生成 | flashdocs.com | ★★★★☆ |

### 3. MCP連携

| サーバー | 機能 | 推奨度 |
|----------|------|--------|
| **Playwright MCP** | ブラウザ自動化（NanoBanana連携） | ★★★★★ |
| **GitHub MCP** | リポジトリ操作・コード取得 | ★★★★★ |
| **Apify MCP** | ウェブスクレイピング | ★★★★☆ |
| **Firecrawl MCP** | コンテンツ抽出 | ★★★★☆ |

## 実装案: 統合パイプライン

```python
# anime_slide_pipeline.py

class AnimeSlideGenerator:
    """長文→アニメ風スライド変換パイプライン"""

    def __init__(self):
        self.text_analyzer = TextAnalyzer()  # Claude API
        self.prompt_generator = AnimePromptGenerator()
        self.image_generator = KomikoGenerator()  # or NanoBananaPro
        self.slide_generator = PresentonGenerator()

    async def generate(self, long_text: str, style: str = "anime") -> str:
        # 1. テキスト分析・シーン分割
        scenes = await self.text_analyzer.extract_scenes(long_text)

        # 2. 各シーンのビジュアルプロンプト生成
        visual_prompts = []
        for scene in scenes:
            prompt = await self.prompt_generator.generate(
                scene=scene,
                style=style,
                maintain_character_consistency=True
            )
            visual_prompts.append(prompt)

        # 3. 画像生成（並列処理）
        images = await asyncio.gather(*[
            self.image_generator.generate(prompt)
            for prompt in visual_prompts
        ])

        # 4. スライド生成
        slide_deck = await self.slide_generator.create(
            scenes=scenes,
            images=images,
            template="anime_style"
        )

        return slide_deck
```

## 技術スタック

```yaml
core:
  language: Python 3.11+
  framework: FastAPI / Streamlit

text_analysis:
  - anthropic (Claude API)
  - openai (GPT-4)
  - langchain (orchestration)

image_generation:
  primary:
    - komiko (manga/anime specialized)
    - nanobanana-pro (Gemini via Playwright)
  fallback:
    - flux.1 (high quality)
    - stable-diffusion (open source)

slide_generation:
  - presenton (local, open source)
  - pptx (python-pptx library)

mcp_integration:
  - playwright-mcp (browser automation)
  - github-mcp (code retrieval)
  - apify-mcp (web scraping)

storage:
  - local filesystem
  - s3 (optional cloud storage)
```

## セットアップ手順

### Step 1: 依存関係のインストール

```bash
# 1. リポジトリのクローン
git clone https://github.com/presenton/presenton.git
git clone https://github.com/Story-Engine-Inc/Komiko.git
git clone https://github.com/icip-cas/PPTAgent.git

# 2. Python環境
python -m venv venv
source venv/bin/activate

# 3. 依存関係
pip install anthropic openai langchain playwright python-pptx
pip install -e ./presenton
pip install -e ./Komiko
```

### Step 2: MCP設定

```json
// ~/.claude/mcp_servers.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-github"]
    },
    "slide-speak": {
      "command": "npx",
      "args": ["-y", "slidespeak-mcp"]
    }
  }
}
```

### Step 3: NanoBanana Pro認証

```bash
cd ~/.claude/skills/nanobanana-pro
python scripts/run.py auth_manager.py setup
```

## 利用シナリオ

### シナリオ1: 教育コンテンツ
- 教科書の章→漫画風解説スライド
- 複雑な概念→キャラクターが説明するビジュアル

### シナリオ2: ビジネスプレゼン
- 長文レポート→視覚的サマリースライド
- データ分析結果→グラフ+キャラクター解説

### シナリオ3: ストーリーテリング
- 小説・脚本→シーンごとのビジュアルストーリー
- マーケティングナラティブ→感情を喚起するスライド

## 参考資料

### MCPマーケットプレイス
- [SkillsMP](https://skillsmp.com/ja) - 128,427+エージェントスキル
- [MCPMarket](https://mcpmarket.com/ja) - 20,152+ MCPサーバー

### GitHubリポジトリ
- [Presenton](https://github.com/presenton/presenton) - オープンソースAIスライド生成
- [PPTAgent](https://github.com/icip-cas/PPTAgent) - Deep Research統合
- [Komiko](https://github.com/Story-Engine-Inc/Komiko) - AI漫画生成
- [LlamaGen.AI](https://github.com/LlamaGenAI) - アニメ生成

### MCP公式
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Skills](https://github.com/anthropics/skills)
