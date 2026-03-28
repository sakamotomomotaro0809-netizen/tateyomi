# url-all v4 強化リサーチレポート

**調査日**: 2026-02-09
**調査ソース**: SkillsMP / MCPMarket / Apify / Reddit + GitHub
**調査エージェント**: 3並列（画像・動画 / 認証 / マーケットプレイス比較）

---

## Executive Summary

url-all v3 の3つの限界（画像の中身、動画の内容、認証ページ）を**全てローカルで突破可能**であることが判明。

| 限界 | 突破方法 | ベストツール | コスト |
|------|---------|-------------|--------|
| 画像の中身が分からない | Ollama Vision モデル | `qwen3-vl:8b` | 無料 |
| 動画の内容が分からない | DL + 文字起こし | `yt-dlp` + `mlx-whisper-mcp` | 無料 |
| 認証ページにアクセスできない | storageState + DevTools MCP | Playwright + Chrome DevTools MCP | 無料 |

**全てローカル完結、API課金ゼロ、M4 Max 128GBで余裕で動作。**

---

## Part 1: 画像の中身を理解する

### 最終推奨: Ollama Vision モデル

| 順位 | モデル | サイズ | 品質 | 特徴 |
|------|--------|--------|------|------|
| **1** | **qwen3-vl:8b** | ~5GB | **S** | 最新2026年。OCR 32言語対応、空間理解、コード生成、日本語最強 |
| 2 | qwen2.5-vl:7b | ~5GB | A | DocVQA 95.7%、GPT-4o-miniを超える |
| 3 | minicpm-v:8b | 5.5GB | A | GPT-4V/Claude 3.5 Sonnet超え（単一画像） |
| 4 | llava:7b | ~4GB | B | 安定版だが日本語はQwen系に劣る |

### 導入方法（即実行可能）

```bash
# Step 1: Vision モデルをpull
ollama pull qwen3-vl:8b

# Step 2: 画像分析テスト
IMG=$(base64 < image.png | tr -d '\n')
curl -s http://localhost:11434/api/chat -d '{
  "model": "qwen3-vl:8b",
  "messages": [{"role":"user","content":"この画像の内容を詳細に日本語で説明してください","images":["'"$IMG"'"]}],
  "stream": false
}' | jq -r '.message.content'
```

### MCP統合オプション

| MCP | 機能 | GitHub |
|-----|------|--------|
| **Ollama Vision MCP** | ローカルOllama Visionで画像分析+OCR | github.com/xkiranj/ollama-vision-mcp |
| **Vision MCP** | スクリーンショット分析、UI検出、Tesseract OCR | github.com/arealicehole/vision-mcp |
| **OCR MCP** | 7つのOCRエンジン統合（DeepSeek-OCR, Florence-2等） | github.com/sandraschi/ocr-mcp |

### url-allへの統合案

```
既存: Script 04 で画像URL一覧を取得
追加: 各画像を base64 化 → Ollama qwen3-vl:8b で内容記述
結果: CONTENT_JSON に imageDescriptions[] として追加
```

新規スクリプト `13-image-analysis.js`:
- ページ内の全`<img>`要素をbase64化
- チャート/グラフは「データ抽出」プロンプト
- テキスト画像は「OCR」プロンプト

---

## Part 2: 動画の内容を理解する

### 最終推奨: yt-dlp + mlx-whisper-mcp パイプライン

| ステップ | ツール | 役割 |
|----------|--------|------|
| 1. ダウンロード | `yt-dlp` | YouTube/ニコニコ/Twitter等 1000+サイト対応 |
| 2. 音声抽出 | `FFmpeg` | 動画→WAV変換 |
| 3. 文字起こし | `mlx-whisper-mcp` | Apple Silicon最適化、リアルタイム10倍速 |
| 4. 要約 | Ollama `qwen2.5:32b` | 文字起こし結果を日本語要約 |

### 文字起こしツール比較

| 順位 | ツール | 速度 | 品質 | MCP統合 |
|------|--------|------|------|---------|
| **1** | **mlx-whisper-mcp** | **10倍速**(M4) | S | MCP直接統合済み |
| 2 | faster-whisper | 4倍速 | S | CLI連携 |
| 3 | whisper.cpp (whisper-mcp) | 3倍速 | A | MCP統合済み |
| 4 | OpenAI Whisper原版 | 1倍速 | A | CLI連携 |

### 導入方法

```bash
# Step 1: yt-dlp + FFmpeg インストール
brew install yt-dlp ffmpeg

# Step 2: mlx-whisper-mcp をClaude Codeに追加
# Option A: kachiO/mlx-whisper-mcp
pip install mlx-whisper
claude mcp add mlx-whisper -- python -m mlx_whisper.mcp_server

# Option B: jwulff/whisper-mcp (whisper.cpp ベース)
git clone https://github.com/jwulff/whisper-mcp.git ~/whisper-mcp
cd ~/whisper-mcp && npm install && npm run build
claude mcp add whisper-mcp -- node ~/whisper-mcp/dist/index.js
```

### 完全ローカル動画→テキスト パイプライン

```bash
# 1. 音声のみダウンロード
yt-dlp -x --audio-format wav -o "/tmp/audio.%(ext)s" "<VIDEO_URL>"

# 2. mlx-whisper で文字起こし（MCP経由 or 直接）
mlx_whisper /tmp/audio.wav --model large-v3-turbo --language ja > /tmp/transcript.txt

# 3. Ollama で要約
bash "$HOME/.claude/skills/url-all/scripts/ollama-call.sh" \
  "qwen2.5:32b" \
  "以下の動画の文字起こしテキストを日本語で要約してください" \
  "$(cat /tmp/transcript.txt)"
```

### url-allへの統合案

```
既存: Script 00 で <video>, <iframe[src*=youtube]> を検出
追加:
  YouTube → yt-dlp で音声DL → mlx-whisper → 文字起こし
  直接動画 → yt-dlp でDL → FFmpeg → mlx-whisper → 文字起こし
結果: CONTENT_JSON に videoTranscripts[] として追加
```

新規スクリプト `14-video-transcript.sh`:
- 埋め込み動画URLを抽出
- yt-dlp + FFmpeg + whisper パイプライン実行
- 文字起こし結果をJSONで返却

---

## Part 3: 認証ページへのアクセス

### 最終推奨: 3層認証ハンドリングシステム

```
Layer 1: Public（認証不要）
  → 既存の WebFetch / Playwright MCP

Layer 2: Cookie/Token注入（Semi-Auth）
  → storageState ファイル読み込み
  → API Token ヘッダー注入
  → Basic Auth 自動設定

Layer 3: フルログインフロー（Full-Auth）
  → Playwright フォームログイン
  → TOTP 2FA 自動化（otpauth ライブラリ）
  → Chrome DevTools MCP（手動ログイン済みChrome利用）
```

### 認証方式別の自動化方法

| 認証方式 | 自動化可能性 | 方法 | 必要ツール |
|----------|------------|------|----------|
| Form login (ID/PW) | **高** | Playwright フォーム入力 → storageState保存 | Playwright MCP |
| OAuth 2.0 / OIDC | **中** | 手動1回 → storageState保存 | Chrome DevTools MCP |
| Basic Auth | **高** | httpCredentials オプション | Playwright |
| API Key / Token | **高** | extraHTTPHeaders 注入 | Playwright |
| TOTP 2FA | **高** | otpauth ライブラリでコード自動生成 | otpauth npm |
| CAPTCHA | **中** | 手動1回 → storageState保存 | Chrome DevTools MCP |
| Magic Link | **低〜中** | メールAPI連携 | Gmail API等 |
| SMS 2FA | **低** | 手動のみ | - |

### 核心: Chrome DevTools MCP ハイブリッド方式

**最も推奨するアプローチ。** 理由:
1. ユーザーが手動で1回ログインすれば、全サイトのセッションが使える
2. CAPTCHA/2FA/OAuth 全て人間が1回処理すれば、以降は自動
3. 実際のユーザーブラウザを使うためボット検出に最強
4. storageState保存で長期間再利用可能

```bash
# Chrome をリモートデバッグモードで起動
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"

# Claude Code にMCPとして追加
claude mcp add chrome-devtools -- \
  npx -y chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222
```

### Auth Profile System（設計案）

```json
// ~/.url-all/auth-profiles.json
{
  "profiles": [
    {
      "id": "github",
      "domain": "github.com",
      "method": "form-login",
      "storageStatePath": "~/.url-all/auth/github-state.json",
      "sessionMaxAge": 86400,
      "selectors": {
        "usernameField": "#login_field",
        "passwordField": "#password",
        "submitButton": "input[type=submit]",
        "successIndicator": ".dashboard"
      }
    }
  ]
}
```

### url-allへの統合フロー

```
ユーザーがURL指定
  ↓
ドメイン照合 → Auth Profile検索
  ↓
[プロファイルなし] → Layer 1 (Public取得)
[プロファイルあり] → storageState存在 & 有効期限内？
  YES → storageStateで即アクセス（Layer 2）
  NO  → フルログインフロー実行（Layer 3）→ 新storageState保存
```

---

## Part 4: マーケットプレイス調査結果

### 4つのソースから発見された重要ツール

#### SkillsMP (160,000+スキル)
| ツール | 機能 | GitHub Stars |
|--------|------|-------------|
| **Crawl4AI Skill** | CSS/XPath/LLM抽出、認証セッション、BM25フィルタ | 58,000+ |
| **Dev Browser** | ログイン済みChromeセッション活用 | - |
| **Skill Seekers** | ドキュメント/GitHubリポをClaude Skill化 | - |

#### MCPMarket (435+サーバー)
| MCP | 機能 | GitHub |
|-----|------|--------|
| **Ultimate MCP Server** | OCR/ブラウザ/文字起こし/ドキュメント統合 | 136 Stars |
| **Ollama Vision MCP** | ローカルOllama Visionで画像分析 | xkiranj/ollama-vision-mcp |
| **OCR MCP** | 7エンジン統合OCR | sandraschi/ocr-mcp |
| **MLX Whisper MCP** | Apple Silicon最適化文字起こし | kachiO/mlx-whisper-mcp |

#### Apify (6,000+アクター)
| ツール | 機能 | GitHub Stars |
|--------|------|-------------|
| **Crawlee** | アンチボット自動回避、プロキシローテーション | 20,000+ |
| **Website Content Crawler** | ログイン背後のクロール対応 | - |

#### Reddit コミュニティコンセンサス
| カテゴリ | ベスト | 理由 |
|---------|--------|------|
| クローラー | Crawl4AI | 無料、ローカルLLM統合、58k Stars |
| Vision | Qwen2.5-VL 7B | GPT-4oに1pt差 |
| 文字起こし | mlx-whisper | Apple Siliconで10倍速 |

---

## Part 5: 最終推奨 - url-all v4 ベスト・オブ・ベスト

### 各カテゴリの最高品質ツール

| カテゴリ | ツール | 理由 |
|---------|--------|------|
| **画像理解** | `ollama pull qwen3-vl:8b` | 最新2026年、OCR 32言語、ローカル完結 |
| **動画理解** | `mlx-whisper-mcp` + `yt-dlp` | MCP直接統合、M4で10倍速、1000+サイト対応 |
| **認証** | Chrome DevTools MCP + storageState | 全認証方式対応、手動1回で以降自動 |
| **OCR補完** | OCR MCP (sandraschi) | 7エンジン統合、PDF/表/スキャン文書 |
| **クロール強化** | Crawl4AI Skill | LLM最適化抽出、認証セッション永続 |

### v4 統合アーキテクチャ

```
url-all v4 (100% ローカル)
│
├── データ取得層
│   ├── Playwright MCP (既存) ─── Scripts 00-12
│   ├── Chrome DevTools MCP (NEW) ── 認証ページアクセス
│   └── Crawl4AI Skill (NEW) ────── LLM最適化クロール
│
├── メディア理解層
│   ├── Ollama qwen3-vl:8b (NEW) ── 画像内容理解・OCR
│   ├── MLX Whisper MCP (NEW) ───── 動画文字起こし
│   ├── yt-dlp + FFmpeg (NEW) ───── 動画ダウンロード
│   └── OCR MCP (NEW) ─────────── ドキュメントOCR
│
├── 分析層 (既存v3)
│   ├── Ollama qwen2.5:32b ──────── コンテンツ要約
│   ├── Ollama qwen3-coder:30b ──── 技術分析
│   └── Ollama qwen3:8b ────────── 軽量要約
│
└── 出力層
    └── 統合Markdownレポート
```

### 導入優先順位

| 優先度 | アクション | 効果 | 所要時間 |
|--------|----------|------|---------|
| **1** | `ollama pull qwen3-vl:8b` | 画像の中身が即座に分かるようになる | 5分 |
| **2** | `brew install yt-dlp ffmpeg` + mlx-whisper-mcp | 動画の文字起こし→要約が可能に | 15分 |
| **3** | Chrome DevTools MCP 設定 | 認証ページにアクセス可能に | 10分 |
| **4** | OCR MCP 導入 | PDF/表/スキャン文書のテキスト抽出 | 10分 |
| **5** | Crawl4AI Skill 統合 | LLM最適化クローリング強化 | 30分 |

---

## Sources

### 画像分析
- [Qwen3-VL on Ollama](https://ollama.com/library/qwen3-vl)
- [Ollama Vision MCP](https://github.com/xkiranj/ollama-vision-mcp)
- [Vision MCP](https://github.com/arealicehole/vision-mcp)
- [OCR MCP](https://github.com/sandraschi/ocr-mcp)
- [MiniCPM-V Benchmarks](https://www.clarifai.com/blog/benchmarking-best-open-source-vision-language-models)

### 動画・文字起こし
- [MLX Whisper MCP](https://github.com/kachiO/mlx-whisper-mcp)
- [whisper-mcp](https://github.com/jwulff/whisper-mcp)
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### 認証
- [Playwright Authentication](https://playwright.dev/docs/auth)
- [Chrome DevTools MCP Setup](https://raf.dev/blog/chrome-debugging-profile-mcp/)
- [Browser MCP](https://browsermcp.io/)
- [Crawlee Session Management](https://crawlee.dev/python/docs/guides/session-management)
- [Apify Login Session Actor](https://apify.com/pocesar/login-session)

### マーケットプレイス
- [SkillsMP](https://skillsmp.com/)
- [MCPMarket](https://mcpmarket.com/)
- [Apify Store](https://console.apify.com/store-search?category=OPEN_SOURCE)
- [Crawl4AI Skill](https://github.com/brettdavies/crawl4ai-skill)
- [Ultimate MCP Server](https://github.com/Dicklesworthstone/ultimate_mcp_server)
