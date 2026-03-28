# コスト最適化モデルルーティングシステム 最終提案書 v2.0

**作成日**: 2026-02-10
**バージョン**: v2.0（3ラウンドのディープリサーチに基づく最終版）
**対象**: X記事配信システム / Claude Code開発環境
**リサーチ範囲**: GitHub, Reddit, Medium, Ollama公式, LiteLLM公式, OpenRouter, Anthropic公式, Apify, SkillsMP, MCPMarket, SWE-bench, 学術論文(RouteLLM/UC Berkeley)

---

## エグゼクティブサマリー

3ラウンドの世界規模ディープリサーチの結果、**v1提案から大幅に改訂**した最終アーキテクチャを提案する。

### v1からの重要な変更点

| 項目 | v1提案 | v2最終提案 | 変更理由 |
|------|--------|-----------|---------|
| 主要コスト戦略 | API課金のみ | **Claude Max $200 + APIフォールバック** | Max $200は同等API利用の18倍安い |
| セマンティックキャッシュ | GPTCache（外部ツール） | **LiteLLM内蔵Redis Semantic Cache** | GPTCacheは不要、LiteLLMがネイティブ対応 |
| ベクトルDB | Qdrant | **Redis（Qdrantは非推奨）** | Qdrantは埋め込み次元1536ハードコード問題あり |
| ルーティングツール | claude-code-router (musistudio) | **同左（推奨維持）+ 0xrdan/claude-router併記** | 712 open issuesだが最も成熟、代替も紹介 |
| ローカルモデルセットアップ | 手動環境変数設定 | **`ollama launch claude`（v0.15+）** | ゼロコンフィグ、環境変数自動設定 |
| コスト目標 | $120-150/月 | **$200-250/月（Max + overflow）** | 現実的かつ安定した運用コスト |
| 品質目標 | 95%+ | **98%+（Max中心のため）** | Maxなら本物のClaudeを使えるため高品質 |

### 最終推奨コスト構造

| 構成 | 月額 | 品質 | 安定性 |
|------|------|------|--------|
| **推奨: Claude Max $200 + ローカルフォールバック** | **$200-250** | 98%+ | 高 |
| 代替: API課金 + ルーティング最適化 | $100-200 | 95%+ | 中 |
| 最小: ローカル + 無料モデルのみ | $0 | 60-70% | 低 |

---

## 1. 現状分析（v1から更新）

### 1.1 現在の環境

| 項目 | 詳細 |
|------|------|
| メインモデル | Claude Opus 4.6 ($5/$25 per 1M tokens) |
| OpenRouter | APIキー設定済み、344モデル利用可能（32無料モデル含む） |
| Ollama | ローカル稼働中（v0.14.0+でAnthropic Messages API互換） |
| ローカルモデル | qwen3:8b, qwen2.5:32b, qwen3-coder:30b, nomic-embed-text |
| Mac環境 | Apple Silicon（統一メモリアーキテクチャ） |

### 1.2 2026年のClaude API価格（最新）

| モデル | 入力 (per 1M) | 出力 (per 1M) | SWE-bench |
|--------|--------------|--------------|-----------|
| **Opus 4.6** | $5 | $25 | 80.8% |
| **Sonnet 4.5** | $3 | $15 | 75.2% |
| **Haiku 4.5** | $1 | $5 | 62.1% |

**重要**: Opus 4.5は旧Opus 4/4.1の$15/$75から**$5/$25に66%値下げ済み**。

### 1.3 実際の開発者コストデータ（リサーチで判明）

| 利用パターン | 日額 | 月額 |
|-------------|------|------|
| 軽量利用（Sonnet中心） | ~$0.30 | ~$9 |
| **平均的開発者** | **~$6** | **~$180** |
| 開発者の90% | <$12 | <$360 |
| ヘビーコーディング（Opus中心） | ~$120+ | ~$3,650+ |

---

## 2. コスト戦略の比較分析

### 2.1 戦略A: Claude Max サブスクリプション（推奨）

| プラン | 月額 | トークン制限 (5時間窓) | 週間制限 |
|--------|------|----------------------|---------|
| Max 5x | $100 | 88,000 tokens/5hr | 140-280時間 |
| **Max 20x** | **$200** | **220,000 tokens/5hr** | **240-480時間** |

**損益分岐点**: 1日あたり約133K入力 + 44K出力トークン（中程度の利用2-3時間相当）

**Claude Max $200 vs 同等API使用**:
- ヘビー利用時のAPI月額: **$3,650+**
- Max 20x月額: **$200**
- **→ 18倍のコスト効率**

**注意点**: 2026年1月にトークン制限の削減報告あり（年末ホリデーボーナス終了による通常復帰とAnthropicは説明）。一部ユーザーが1週間ブロックされた事例も報告。

### 2.2 戦略B: API課金 + インテリジェントルーティング

v1で提案した方式。モデル振り分けで$120-200/月を目指す。

**メリット**: 制限なし、柔軟なモデル選択
**デメリット**: ヘビー利用時にコスト急増

### 2.3 戦略C: ハイブリッド（最終推奨）

**Claude Max $200 をベースに、制限ヒット時のみAPIにフォールバック。バックグラウンドタスクはローカルモデル。**

```
[通常時]
  Claude Code → Claude Max ($200/月固定)
    ├── Sonnet 4.5: 標準コーディング（80%）
    └── Opus 4.6: 複雑推論（20%）

[Max制限ヒット時]
  Claude Code → claude-code-router → LiteLLM Proxy
    ├── Ollama qwen3-coder:30b（無料、バックグラウンド）
    ├── Haiku 4.5 via API（$1/$5、単純タスク）
    └── Sonnet 4.5 via API（$3/$15、標準タスク）

[緊急フォールバック]
  Claude Code → OpenRouter Free Models
    ├── qwen/qwen3-coder:free
    ├── openai/gpt-oss-20b:free
    └── openai/gpt-oss-120b:free
```

---

## 3. 最終推奨アーキテクチャ

### 3.1 全体構成図

```
┌──────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                          │
│  (ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN で接続先制御)      │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐  ┌──────────┐  ┌───────────────┐
    │ Claude Max  │  │ claude-  │  │  OpenRouter   │
    │ $200/月     │  │ code-    │  │  Free Models  │
    │ (メイン)    │  │ router   │  │  (緊急用)     │
    │             │  │          │  │               │
    │ Sonnet 4.5  │  │ ┌──────┐│  │ qwen3-coder   │
    │ Opus 4.6    │  │ │Router││  │ :free         │
    │             │  │ │Rules ││  │ gpt-oss-20b   │
    └─────────────┘  │ └──┬───┘│  │ :free         │
                     │    │    │  └───────────────┘
                     └────┼────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  LiteLLM Proxy      │
              │  (Port 4000)        │
              │                     │
              │  ・コスト追跡        │
              │  ・Redis Semantic    │
              │    Cache            │
              │  ・予算制限 ($50上限)│
              │  ・フォールバック     │
              └──┬───┬───┬───┬──────┘
                 │   │   │   │
                 ▼   ▼   ▼   ▼
           ┌────┐┌────┐┌────┐┌──────┐
           │Olla││Hai ││Son ││Opus  │
           │ma  ││ku  ││net ││4.6   │
           │$0  ││$1/ ││$3/ ││$5/   │
           │    ││$5  ││$15 ││$25   │
           └────┘└────┘└────┘└──────┘
```

### 3.2 claude-code-router ルーティング設定

```json
{
  "Providers": [
    {
      "name": "anthropic",
      "api_base_url": "https://api.anthropic.com/v1/messages",
      "api_key": "$ANTHROPIC_API_KEY",
      "models": ["claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5"]
    },
    {
      "name": "ollama",
      "api_base_url": "http://localhost:11434/v1/chat/completions",
      "api_key": "ollama",
      "models": ["qwen3-coder:30b", "glm-4.7-flash"]
    },
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1",
      "api_key": "$OPENROUTER_API_KEY",
      "models": ["qwen/qwen3-coder:free", "openai/gpt-oss-20b:free"]
    }
  ],
  "Router": {
    "default": "anthropic,claude-sonnet-4-5",
    "background": "ollama,qwen3-coder:30b",
    "think": "anthropic,claude-opus-4-6",
    "longContext": "openrouter,qwen/qwen3-coder:free",
    "longContextThreshold": 60000,
    "webSearch": "anthropic,claude-haiku-4-5"
  }
}
```

**claude-code-router詳細** (musistudio):
- GitHub Stars: 27,500
- Open Issues: 712（活発に開発中）
- ライセンス: MIT
- 対応: OpenRouter, DeepSeek, Ollama, Gemini, Volcengine等
- 機能: `/model`コマンドでリアルタイム切替、トランスフォーマーシステム

### 3.3 代替ルーター: 0xrdan/claude-router

musistudio版に問題がある場合の代替:

```bash
# インストール（3コマンド）
/plugin marketplace add 0xrdan/claude-plugins
/plugin install claude-router
# Claude Codeを再起動
```

**特徴**:
- ゼロコンフィグレーション（インストール後即動作）
- 複雑度ベースの自動振り分け: Simple→Haiku, Moderate→Sonnet, Complex→Opus
- ルールベース分類（0ms） + LLMフォールバック分類（~100ms）
- `/orchestrate`コマンドでタスク分割実行
- コスト削減: 50-80%

---

## 4. ローカルモデル: Qwen3-Coder 30B

### 4.1 アーキテクチャの重要事実

| 項目 | 値 |
|------|-----|
| 総パラメータ | 30.5B |
| **アクティブパラメータ** | **3.3B**（MoE: 128エキスパート中8つ） |
| ネイティブコンテキスト | 256,000トークン（YaRNで1Mまで拡張可能） |
| SWE-bench | 70.6% (Qwen3-Coder-Next) |

30Bモデルでありながら**実質3.3Bの計算コスト**。

### 4.2 Apple Silicon パフォーマンス（実測値）

| チップ | トークン/秒 (Q4) | メモリ使用量 |
|--------|-----------------|------------|
| **M4 Max (48GB)** | **100-172 tok/s** | ~18.6GB |
| M2 Max | ~68 tok/s | ~18.6GB |
| M3/M4 Pro (推定) | 50-80 tok/s | ~18.6GB |

### 4.3 メモリ要件

| 量子化レベル | メモリ使用量 | 推奨Mac |
|-------------|------------|---------|
| **Q4 (4-bit GGUF)** | **~18.6GB** | **32GB以上** |
| Q6 (6-bit MLX) | ~24.8GB | 32GB以上 |
| Q8 (8-bit MLX) | ~32.5GB | 48GB以上 |

### 4.4 セットアップ方法

**方法1: `ollama launch`（推奨、v0.15+）**
```bash
ollama launch claude
# インタラクティブUIでモデル選択:
# - glm-4.7-flash（速度重視）
# - qwen3-coder（品質重視）
# - gpt-oss:20b（バランス型）
```

**方法2: 手動設定（v0.14.0+）**
```bash
export ANTHROPIC_AUTH_TOKEN="ollama"
export ANTHROPIC_BASE_URL="http://localhost:11434"
claude --model qwen3-coder:30b
```

### 4.5 ローカルモデルの制限事項

- Claude本体と比較して品質は大幅に劣る（特に複雑タスク）
- **最低64Kトークンのコンテキスト**が必要（不足するとツール呼び出し失敗）
- トークンカウント非対応（コスト追跡不正確）
- tool_choice強制非対応
- プロンプトキャッシング非対応
- バッチ処理非対応

---

## 5. セマンティックキャッシュ（v1から大幅改訂）

### 5.1 v1からの変更: GPTCache → LiteLLM内蔵キャッシュ

**GPTCacheは不要。** LiteLLMがネイティブでセマンティックキャッシュを内蔵している。

### 5.2 Qdrant Semantic Cache の問題（重要）

LiteLLMのQdrant Semantic Cacheには**致命的な制限**がある:
- ベクトル次元が`QDRANT_VECTOR_SIZE = 1536`に**ハードコード**されている
- Ollamaの`nomic-embed-text`は768次元 → **非互換**
- GitHub Issue [#6262](https://github.com/BerriAI/litellm/issues/6262) で報告済みだが**"not planned"として未修正**

### 5.3 推奨: Redis Semantic Cache

```yaml
# litellm_config.yaml
litellm_settings:
  cache: True
  cache_params:
    type: redis
    host: localhost
    port: 6379
    password: "your-redis-password"

    # セマンティックキャッシュ設定
    supported_call_types:
      - acompletion
      - completion

    # TTL: 1時間
    ttl: 3600
```

**Redis Semantic Cacheのメリット**:
- 埋め込み次元の制約なし
- LiteLLM完全サポート
- 軽量（Docker: redis:7-alpine）
- 堅牢で実績豊富

### 5.4 代替: Qdrant + OpenAI Embedding

完全ローカルを諦めてOpenAI Embeddingを使う場合:

```yaml
model_list:
  - model_name: openai-embedding
    litellm_params:
      model: openai/text-embedding-3-small
      api_key: os.environ/OPENAI_API_KEY

litellm_settings:
  cache: True
  cache_params:
    type: qdrant-semantic
    qdrant_semantic_cache_embedding_model: openai-embedding
    qdrant_collection_name: litellm_cache
    similarity_threshold: 0.8
```

---

## 6. LiteLLM Proxy 設定（APIフォールバック用）

### 6.1 config.yaml

```yaml
model_list:
  - model_name: claude-sonnet-4-5-20250929
    litellm_params:
      model: anthropic/claude-sonnet-4-5-20250929
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-haiku-4-5-20251001
    litellm_params:
      model: anthropic/claude-haiku-4-5-20251001
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-opus-4-6
    litellm_params:
      model: anthropic/claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: ollama-qwen3-coder
    litellm_params:
      model: ollama/qwen3-coder:30b
      api_base: http://localhost:11434

  - model_name: deepseek-chat
    litellm_params:
      model: openrouter/deepseek/deepseek-chat
      api_key: os.environ/OPENROUTER_API_KEY

litellm_settings:
  fallbacks:
    - ollama-qwen3-coder: ["claude-haiku-4-5-20251001"]
    - claude-haiku-4-5-20251001: ["claude-sonnet-4-5-20250929"]
    - claude-sonnet-4-5-20250929: ["claude-opus-4-6"]
  default_fallbacks: ["claude-haiku-4-5-20251001"]

  cache: True
  cache_params:
    type: redis
    host: redis
    port: 6379
    password: "your-redis-password"
    ttl: 3600

  max_budget: 50
  budget_duration: 30d

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
```

### 6.2 Claude Codeからの接続

```bash
# LiteLLM Proxy経由でClaude Codeを使用
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000"
export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"
export ANTHROPIC_API_KEY=""
```

### 6.3 Docker Compose（フルスタック）

```yaml
version: "3.9"
services:
  litellm:
    image: docker.litellm.ai/berriai/litellm:main-stable
    ports:
      - "4000:4000"
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    environment:
      DATABASE_URL: "postgresql://llmproxy:dbpassword9090@db:5432/litellm"
      STORE_MODEL_IN_DB: "True"
      LITELLM_MASTER_KEY: "sk-litellm-master-key-change-me"
      LITELLM_SALT_KEY: "your-salt-key-never-change"
      ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
      OPENROUTER_API_KEY: "${OPENROUTER_API_KEY}"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:4000/health/liveliness || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: llmproxy
      POSTGRES_PASSWORD: dbpassword9090
      POSTGRES_DB: litellm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d litellm -U llmproxy"]
      interval: 1s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass your-redis-password
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your-redis-password", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## 7. OpenRouter 無料モデル（緊急フォールバック）

### 7.1 ツール呼び出し対応の無料モデル

| モデルID | パラメータ | アーキテクチャ | ツール呼び出し |
|---------|-----------|--------------|--------------|
| `qwen/qwen3-coder:free` | 480B (35Bアクティブ) | MoE | 対応 |
| `openai/gpt-oss-20b:free` | 21B | Dense | 対応 |
| `openai/gpt-oss-120b:free` | 117B | MoE | 対応 |

### 7.2 設定方法

```bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="your-openrouter-api-key"
export ANTHROPIC_API_KEY=""
```

### 7.3 制限事項

- OpenRouter公式: 「Claude Code with OpenRouterはAnthropicファーストパーティプロバイダでのみ動作保証」
- 無料モデルでのClaude Code動作は**非保証**
- **緊急時のフォールバック用途に限定すべき**

---

## 8. コスト削減テクニック（実証済み）

### 8.1 即効性のあるテクニック

| テクニック | 削減率 | 詳細 |
|-----------|-------|------|
| `/compact`コマンド | **82%** | 45,000→8,000トークン（コンテキスト圧縮） |
| Sonnet主体運用 | **30-40%** | Sonnetで80%の作業を処理、Opusは複雑タスクのみ |
| 仕様駆動開発 | **60-80%** | 明確なスペックで一発成功、やり直し防止 |
| プロンプトキャッシング | **90%** | CLAUDE.md等のシステムプロンプトをキャッシュ |
| バッチAPI | **50%** | 非即時処理のコード分析に使用 |

### 8.2 運用プラクティス

1. **タスクを細分化**: 1つの大きなタスクより、複数の小さなタスクに分割
2. **新しいセッション**: コンテキストが膨らんだら新セッション開始
3. **CLAUDE.mdの最適化**: 必要な情報のみ記載、不要な情報を削除
4. **`/compact`の積極的活用**: 論理的な区切りごとにコンパクト実行

---

## 9. 実装ロードマップ（改訂版）

### フェーズ0: 即時実行（0日）--- コスト効果: 最大

**Claude Max 20x ($200/月) への移行**
- claude.ai でMax 20xプランに加入
- Claude Codeを公式サブスクリプションで使用
- これだけでAPI利用の18倍のコスト効率

### フェーズ1: ローカルモデル導入（1日）--- コスト効果: 高

```bash
# Ollama v0.15+ にアップデート
ollama --version  # 確認
# ローカルモデルのセットアップ
ollama launch claude
# qwen3-coder を選択
```

- Max制限ヒット時の無料フォールバック確保
- バックグラウンドタスク（lint, format, 簡単な補完）をローカルに委任

### フェーズ2: claude-code-router導入（1-2日）--- コスト効果: 中

```bash
npm install -g @musistudio/claude-code-router
```

- タスクベースの自動ルーティング設定
- default/background/think/longContext のルール設定
- `/model`コマンドで手動切替も可能

### フェーズ3: LiteLLM + Redis キャッシュ（3-5日）--- コスト効果: 中

- Docker Composeでフルスタック起動
- Redis Semantic Cache設定
- コスト追跡ダッシュボード確認
- 予算制限（$50/月）設定

### フェーズ4: モニタリング＆最適化（継続）

- コスト/品質のA/Bテスト
- ルーティングルールの最適化
- 使用パターンに基づくモデル配分調整

---

## 10. コスト試算（最終版）

### 10.1 推奨構成（Claude Max + ローカルフォールバック）

| 項目 | 月額コスト |
|------|-----------|
| Claude Max 20x | $200 (固定) |
| API overflow（制限ヒット時、月10-20%程度） | $0-50 |
| Ollama ローカル（電気代のみ） | ~$5 |
| **合計** | **$200-255** |

### 10.2 API課金のみ構成（代替）

| モデル | 使用割合 | 月間入力 | 月間出力 | 合計 |
|--------|---------|---------|---------|------|
| Ollama (ローカル) | 25% | 9M | 3M | $0 |
| Haiku 4.5 | 30% | 10.8M | 3.6M | $28.80 |
| Sonnet 4.5 | 35% | 12.6M | 4.2M | $100.80 |
| Opus 4.6 | 10% | 3.6M | 1.2M | $48.00 |
| **合計** | 100% | 36M | 12M | **$177.60** |

Redis Semantic Cache適用後（推定30%削減）: **$124-140/月**

### 10.3 コスト比較サマリー

| 構成 | 月額 | v1比 | 品質 | 導入難易度 |
|------|------|------|------|-----------|
| 現行（全Opus 4.6 API） | $480 | - | 100% | - |
| v1提案（ルーティング+GPTCache） | $120-150 | - | 95% | 高 |
| **v2推奨（Max+ローカル）** | **$200-255** | - | **98%+** | **低** |
| v2代替（API+ルーティング+Redis） | $124-177 | - | 95% | 中 |
| 最小構成（ローカル+無料のみ） | $0-5 | - | 60-70% | 低 |

---

## 11. SWE-bench 2026 モデルランキング（参考）

| 順位 | モデル | SWE-bench | 用途 |
|------|--------|-----------|------|
| 1 | **Claude Opus 4.6** | **80.8%** | 複雑推論 |
| 2 | GPT-5.1 | 77.9% | - |
| 3 | Claude Sonnet 4.5 | 75.2% | 標準コーディング |
| 4 | Gemini 3 Pro | 76.2% | 長コンテキスト |
| 5 | GLM-4.7 | 73.8% | ローカル候補 |
| 6 | **Qwen3-Coder-Next** | **70.6%** | **ローカル推奨** |
| 7 | DeepSeek V3.2 | 68.5% | コスパ最良 |

---

## 12. リスクと緩和策（改訂版）

| リスク | 影響 | 確率 | 緩和策 |
|--------|------|------|--------|
| Claude Max のトークン制限削減 | 利用時間制限 | 中 | APIフォールバック構成で対応 |
| claude-code-router の不安定性 | ルーティング失敗 | 中 | 直接API接続のフォールバック、0xrdan/claude-router を代替に |
| ローカルモデルの品質不足 | コード品質低下 | 高 | フォールバックチェーンで自動エスカレーション |
| Qdrant埋め込み次元問題 | キャッシュ使用不可 | 確実 | Redis Semantic Cache使用で回避 |
| OpenRouter無料モデル非互換 | ツール呼び出し失敗 | 中 | 緊急用途に限定、有料APIを主体に |
| LiteLLMプロキシ障害 | API呼び出し不能 | 低 | 直接API接続のフォールバック設定 |

---

## 13. KPI（成功指標）

| 指標 | 現行値 | 目標値 | 測定方法 |
|------|--------|--------|---------|
| 月額API費用 | $480 | $200-255 | Claude Max + LiteLLMダッシュボード |
| コスト削減率 | 0% | 47-58% | 月次レポート |
| コード品質スコア | 100% | 98%+ | コードレビュー通過率 |
| Max制限ヒット頻度 | N/A | <月5回 | 手動記録 |
| ローカルモデル使用率 | 0% | 15-25% | ルーティングログ |
| キャッシュヒット率 | 0% | 50%+ | Redis メトリクス |

---

## 14. 情報源（3ラウンドのリサーチで参照）

### 公式ドキュメント
- [Claude Code Pricing](https://code.claude.com/docs/en/costs)
- [Claude Code LLM Gateway](https://code.claude.com/docs/en/llm-gateway)
- [LiteLLM Proxy Documentation](https://docs.litellm.ai/docs/proxy)
- [LiteLLM Claude Code Tutorial](https://docs.litellm.ai/docs/tutorials/claude_responses_api)
- [Ollama Claude Code Integration](https://docs.ollama.com/integrations/claude-code)
- [Ollama Launch Command](https://ollama.com/blog/launch)
- [OpenRouter Claude Code Guide](https://openrouter.ai/docs/guides/guides/claude-code-integration)

### GitHub リポジトリ
- [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) (27.5K stars)
- [0xrdan/claude-router](https://github.com/0xrdan/claude-router)
- [BerriAI/litellm](https://github.com/BerriAI/litellm)
- [LiteLLM Issue #6262 - Qdrant Embedding Dimension](https://github.com/BerriAI/litellm/issues/6262)
- [RouteLLM (UC Berkeley)](https://github.com/lm-sys/RouteLLM)

### リサーチ記事・ブログ
- [Claude AI Pricing 2026 Ultimate Guide](https://www.glbgpt.com/hub/claude-ai-pricing-2026-the-ultimate-guide-to-plans-api-costs-and-limits/)
- [How to Reduce Claude Code Costs 2026](https://www.thecaio.ai/blog/reduce-claude-code-costs)
- [Qwen3-Coder 30B Hardware Requirements & Performance](https://www.arsturn.com/blog/running-qwen3-coder-30b-at-full-context-memory-requirements-performance-tips)
- [Running Claude Code with Local & Cloud Models](https://medium.com/@luongnv89/run-claude-code-on-local-cloud-models-in-5-minutes-ollama-openrouter-llama-cpp-6dfeaee03cda)
- [DataCamp: Claude Code with Ollama](https://www.datacamp.com/tutorial/using-claude-code-with-ollama-local-models)
- [Towards Data Science: Run Claude Code for Free with Ollama](https://towardsdatascience.com/run-claude-code-for-free-with-local-and-cloud-models-from-ollama/)

### コミュニティ・フォーラム
- Reddit r/ClaudeAI, r/LocalLLaMA
- Hacker News discussions on Claude Code cost optimization
- Medium articles on API vs subscription cost analysis

---

**本提案書は3ラウンドの世界規模ディープリサーチに基づく最終版です。**
**v1提案からの主要な改訂は、実践的な検証とコミュニティの実体験データに基づいています。**
