# コスト最適化モデルルーティングシステム 第1回提案書

**作成日**: 2026-02-10
**バージョン**: v1.0（第1回ディープリサーチに基づく初版）
**対象**: X記事配信システム / Claude Code開発環境

---

## エグゼクティブサマリー

Claude Opus 4.6を全面的に使用する現行運用（推定月額$400-480）から、**ローカルモデル（Ollama）+ マルチモデルルーティング**によるハイブリッドシステムに移行し、**品質95%以上を維持しつつ60-75%のコスト削減**を実現する。

---

## 1. 現状分析

### 1.1 現在の環境

| 項目 | 詳細 |
|------|------|
| メインモデル | Claude Opus 4.6 ($5/$25 per 1M tokens) |
| OpenRouter | APIキー設定済み、344モデル利用可能（32無料モデル含む） |
| Ollama | ローカル稼働中、4モデルインストール済み |
| ローカルモデル | qwen3:8b (4.9GB), qwen2.5:32b (18.5GB), qwen3-coder:30b (17.3GB), nomic-embed-text (0.3GB) |

### 1.2 月額コスト試算（現行: 全Opus 4.6使用）

| 項目 | 数値 |
|------|------|
| 1日の推定入力トークン | 1.8M |
| 1日の推定出力トークン | 0.6M |
| 月間営業日 | 20日 |
| 月額入力コスト | 1.8M × 20 × $5/1M = $180 |
| 月額出力コスト | 0.6M × 20 × $25/1M = $300 |
| **月額合計** | **$480** |

---

## 2. 提案アーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────┐
│                 Claude Code CLI                  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           Claude Code Router (musistudio)        │
│  タスク分類: default/background/think/           │
│            longContext/webSearch                  │
│  /model コマンドで動的切替                        │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              LiteLLM Proxy (Port 4000)           │
│  ・コスト追跡 & 予算制限                          │
│  ・セマンティックキャッシュ (GPTCache)             │
│  ・自動リトライ & フォールバック                   │
│  ・ロギング & ダッシュボード                      │
└──────────┬───────┬───────┬───────┬──────────────┘
           │       │       │       │
           ▼       ▼       ▼       ▼
     ┌─────┐ ┌────────┐ ┌──────┐ ┌──────────┐
     │Ollama│ │Haiku   │ │Sonnet│ │Opus 4.6  │
     │(無料)│ │4.5     │ │4.5   │ │          │
     │      │ │$1/$5   │ │$3/$15│ │$5/$25    │
     └─────┘ └────────┘ └──────┘ └──────────┘
       20%      30%       35%       15%
```

### 2.2 タスクルーティングマッピング

| タスク種別 | モデル | コスト | 使用割合 |
|-----------|--------|--------|---------|
| バックグラウンド処理（lint, format, 簡単な補完） | Ollama qwen3-coder:30b | $0（電気代のみ） | 20% |
| 単純タスク（分類、要約、翻訳、コメント生成） | Haiku 4.5 | $1/$5 per 1M | 30% |
| 標準コーディング（実装、リファクタリング、テスト） | Sonnet 4.5 | $3/$15 per 1M | 35% |
| 複雑推論（アーキテクチャ設計、デバッグ、プランニング） | Opus 4.6 | $5/$25 per 1M | 15% |

### 2.3 カスケードパターン（品質ゲート付き）

品質が不十分な場合のみ、上位モデルにエスカレーション:

```
ユーザークエリ
    │
    ▼
[タスク複雑度分類器] ← RouteLLM BERT Classifier
    │
    ├── 複雑度: 低 → Ollama (qwen3-coder:30b)
    │   └── 品質チェック → 不合格なら → Haiku 4.5
    │
    ├── 複雑度: 中 → Haiku 4.5
    │   └── 品質チェック → 不合格なら → Sonnet 4.5
    │
    ├── 複雑度: 高 → Sonnet 4.5
    │   └── 品質チェック → 不合格なら → Opus 4.6
    │
    └── 複雑度: 最高 → Opus 4.6（直接）
```

---

## 3. コスト削減試算

### 3.1 ハイブリッドモデル月額コスト

| モデル | 使用割合 | 月間入力 | 月間出力 | 入力コスト | 出力コスト | 合計 |
|--------|---------|---------|---------|-----------|-----------|------|
| Ollama (ローカル) | 20% | 7.2M | 2.4M | $0 | $0 | $0 |
| Haiku 4.5 | 30% | 10.8M | 3.6M | $10.80 | $18.00 | $28.80 |
| Sonnet 4.5 | 35% | 12.6M | 4.2M | $37.80 | $63.00 | $100.80 |
| Opus 4.6 | 15% | 5.4M | 1.8M | $27.00 | $45.00 | $72.00 |
| **合計** | 100% | 36M | 12M | $75.60 | $126.00 | **$201.60** |

### 3.2 セマンティックキャッシュ導入効果

GPTCacheの実績（61-68%ヒット率）から:
- 反復クエリの約31%を削減
- 追加コスト削減: 約20-30%
- **キャッシュ適用後**: 約$140-170/月

### 3.3 プロンプトキャッシング効果（Anthropic公式）

- キャッシュヒット時: 入力コスト90%削減
- 長いシステムプロンプトで特に効果大
- **追加削減**: 約10-15%

### 3.4 総合コスト比較

| シナリオ | 月額コスト | 削減率 | 品質維持率 |
|---------|-----------|--------|-----------|
| 現行（全Opus 4.6） | $480 | - | 100% |
| ハイブリッドルーティングのみ | $201 | 58% | 95%+ |
| + セマンティックキャッシュ | $150 | 69% | 95%+ |
| + プロンプトキャッシュ | $120-140 | 71-75% | 95%+ |
| **目標** | **$120-150** | **69-75%** | **95%+** |

---

## 4. 主要コンポーネント詳細

### 4.1 Claude Code Router (musistudio)

**役割**: タスクベースの一次ルーティング

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
      "models": ["qwen3-coder:30b"]
    },
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1",
      "api_key": "$OPENROUTER_API_KEY",
      "models": ["deepseek/deepseek-chat", "google/gemini-2.5-pro"]
    }
  ],
  "Router": {
    "default": "anthropic,claude-sonnet-4-5",
    "background": "ollama,qwen3-coder:30b",
    "think": "anthropic,claude-opus-4-6",
    "longContext": "openrouter,google/gemini-2.5-pro",
    "longContextThreshold": 60000,
    "webSearch": "anthropic,claude-haiku-4-5"
  }
}
```

### 4.2 LiteLLM Proxy

**役割**: ゲートウェイ、コスト追跡、フォールバック管理

```yaml
# litellm_config.yaml
model_list:
  - model_name: ollama-qwen3-coder
    litellm_params:
      model: ollama/qwen3-coder:30b
      api_base: http://localhost:11434

  - model_name: claude-haiku
    litellm_params:
      model: anthropic/claude-haiku-4-5
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-5
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-opus
    litellm_params:
      model: anthropic/claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: deepseek-chat
    litellm_params:
      model: openrouter/deepseek/deepseek-chat
      api_key: os.environ/OPENROUTER_API_KEY

litellm_settings:
  fallbacks:
    - ollama-qwen3-coder: ["claude-haiku"]
    - claude-haiku: ["claude-sonnet"]
    - claude-sonnet: ["claude-opus"]

  default_fallbacks: ["claude-haiku"]

  # 予算制限
  max_budget: 200  # 月額$200上限
  budget_duration: 30d

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
```

### 4.3 GPTCache（セマンティックキャッシュ）

**役割**: 意味的に類似したクエリのキャッシュ応答返却

- キャッシュヒット率: 61-68%
- 正確性: 97%+
- レスポンス速度: 2-10倍向上

### 4.4 RouteLLM BERT Classifier

**役割**: タスク複雑度の自動分類

- 4つのルーターアーキテクチャから BERT Classifier を採用（精度と速度のバランス最良）
- MT Benchで85%コスト削減、品質95%維持の実績
- 未知のモデルペアにも汎化可能

---

## 5. SkillsMP/MCPMarket調査結果（追加ツール候補）

### 5.1 推奨スキル（SkillsMP）

| スキル名 | リポジトリ | 用途 | 優先度 |
|---------|-----------|------|--------|
| llmrouter | openclaw/skills | 複雑度ベースのインテリジェントルーティング | 高 |
| token-optimizer | openclaw/skills | コスト97%削減、Haiku/Ollamaルーティング | 高 |
| freeride | openclaw/skills | OpenRouter無料モデル活用 | 中 |
| llm-supervisor | openclaw/skills | レートリミット処理＋Ollamaフォールバック | 中 |
| ollama-local | openclaw/skills | ローカルOllama管理 | 中 |
| cost-verification-auditor | erichowens/some_claude_skills | トークンコスト監査 | 低 |
| performance-monitor | 404kidwiz/claude-supercode-skills | トークン使用量追跡 | 低 |
| prompt-compression | a5c-ai/babysitter | プロンプト圧縮（50-80%削減） | 中 |

### 5.2 推奨MCPサーバー（MCPMarket）

| サーバー名 | Stars | 用途 | 優先度 |
|-----------|-------|------|--------|
| Ollama MCP Bridge | 965 | ローカルLLM ↔ MCP接続 | 高 |
| Ollama MCP Client | 531 | ローカルLLMでMCPツール使用 | 高 |
| LocaLLama | 41 | ローカル/無料/有料API動的ルーティング | 高 |
| LLM Gateway | 17 | インテリジェントなタスク委任 | 中 |
| Claude Code OpenRouter | 37 | Claude CodeでOpenRouter使用 | 中 |
| Aider | 292 | コーディングタスク委任でコスト削減 | 中 |
| Claudette | - | マルチプロバイダルーティング | 中 |

---

## 6. 実装ロードマップ

### フェーズ1: 即時導入（1-2日）

1. **Claude Code Routerのインストールと設定**
   - `npm install -g @musistudio/claude-code-router`
   - config.json設定（Ollama + Anthropic + OpenRouter）
   - 推定効果: 30-50%コスト削減

2. **Ollama最新モデルの追加**
   - `ollama pull qwen3-coder:30b`（既にインストール済み）
   - 動作確認テスト

3. **.env更新**
   - Claude Code Router用の環境変数追加

### フェーズ2: ゲートウェイ導入（3-5日）

4. **LiteLLMプロキシのセットアップ**
   - Docker Composeによるデプロイ
   - config.yaml設定
   - コスト追跡ダッシュボードの確認

5. **フォールバックチェーンの設定**
   - Ollama → Haiku → Sonnet → Opus
   - エラーハンドリングテスト

### フェーズ3: キャッシュ最適化（1週間）

6. **GPTCacheの導入**
   - セマンティックキャッシュ設定
   - 埋め込みモデル: nomic-embed-text（Ollamaローカル）
   - ヒット率モニタリング

7. **Anthropicプロンプトキャッシングの最適化**
   - システムプロンプトの最適化
   - キャッシュヒット率の監視

### フェーズ4: インテリジェントルーティング（2週間）

8. **RouteLLM BERT Classifierの統合**
   - タスク複雑度自動分類
   - カスケードパターンの品質ゲート実装

9. **モニタリング&チューニング**
   - コスト/品質のA/Bテスト
   - ルーティングルールの最適化

---

## 7. リスクと緩和策

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| ローカルモデルの品質不足 | コード品質低下 | フォールバックチェーンで自動エスカレーション |
| Claude Code Router互換性 | 動作不安定 | OpenRouter公式統合をバックアップとして維持 |
| LiteLLMプロキシ障害 | API呼び出し不能 | 直接API接続のフォールバック設定 |
| キャッシュ精度問題 | 不正確な応答 | キャッシュ閾値の調整、品質モニタリング |
| 月額予算超過 | コスト制御不能 | LiteLLMの予算制限機能で$200上限設定 |

---

## 8. KPI（成功指標）

| 指標 | 現行値 | 目標値 | 測定方法 |
|------|--------|--------|---------|
| 月額API費用 | $480 | $120-150 | LiteLLMダッシュボード |
| コスト削減率 | 0% | 69-75% | 月次レポート |
| コード品質スコア | 100% | 95%+ | コードレビュー通過率 |
| レスポンス時間 | ベースライン | ±20% | LiteLLMメトリクス |
| ローカルモデル使用率 | 0% | 20%+ | ルーティングログ |
| キャッシュヒット率 | 0% | 60%+ | GPTCacheメトリクス |

---

## 9. 次のステップ

この第1回提案に対して、以下の観点で第2回ディープリサーチを実施:

1. **Claude Code Router vs OpenRouter直接統合**の詳細比較
2. **Ollama v0.14.0+のAnthropic Messages API互換性**の実証テスト
3. **RouteLLM BERT Classifierの実際のClaude Code統合方法**の調査
4. **GPTCacheとLiteLLMの統合設定**の詳細調査
5. **SWE-bench上位のオープンソースモデル**（GLM-4.7, DeepSeek V3.2等）のローカル動作検証
6. **実際のコスト削減事例**（Reddit/GitHub/ブログからの実体験レポート）
