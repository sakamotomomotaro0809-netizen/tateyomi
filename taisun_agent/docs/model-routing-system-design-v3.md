# LLMモデル自動切替システム設計書 v3.0

**作成日**: 2026-02-10
**環境**: MacBook Pro M4 Max 128GB RAM / Ollama v0.15.6
**プラン**: Claude Max $200/月 + ChatGPT Pro

---

## 1. あなたの環境

| 項目 | 現状 |
|------|------|
| Mac | MacBook Pro M4 Max 128GB RAM |
| Ollama | v0.15.6（最新、Anthropic Messages API互換） |
| インストール済みモデル | qwen3:8b, qwen2.5:32b, qwen3-coder:30b, nomic-embed-text |
| Claude | Max $200/月プラン（Max 20x = Proの20倍トークン） |
| ChatGPT | Proプラン（GPT-5.3 Codex利用可能） |
| OpenRouter | APIキー設定済み |

---

## 2. モデル一覧と役割分担

### 2.1 使用モデル全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                   モデル自動切替システム                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ■ Tier 0: 最高品質（複雑な設計・判断）                          │
│    Claude Opus 4.6     ... 建築設計、重要判断、深い推論           │
│    GPT-5.3 Codex       ... 大規模エージェント型コーディング       │
│                                                                  │
│  ■ Tier 1: 高品質（日常コーディング）                            │
│    Claude Sonnet 4.5   ... メインの実装作業、コードレビュー       │
│                                                                  │
│  ■ Tier 2: 効率型（軽作業）                                     │
│    Claude Haiku 4.5    ... ドキュメント、簡単な修正、ルーティング │
│    Gemini 2.5 Flash    ... 無料枠利用、長文コンテキスト           │
│                                                                  │
│  ■ Tier 3: ローカルモデル（コスト$0）                            │
│    Qwen2.5-Coder:32B   ... ローカル最高品質コーディング           │
│    Qwen3-Coder:30B     ... MoE高速、バランス型                   │
│    GLM-4.7             ... 超高速、Tool Calling優秀              │
│                                                                  │
│  ■ Tier 4: 無料クラウド（OpenRouter）                            │
│    gpt-oss-120b        ... 無料、Tool Calling対応                │
│    Qwen3-Coder-480B    ... 無料、Agenticコーディング              │
│    DeepSeek V3.2       ... $0.28/M、圧倒的コスパ                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 各モデルの詳細スペック

#### Tier 0: 最高品質モデル

| モデル | SWE-bench | コンテキスト | 価格 (in/out per 1M) | 用途 |
|--------|-----------|-------------|---------------------|------|
| **Claude Opus 4.6** | 80.8% | 1M | Max $200プランで追加料金なし | アーキテクチャ設計、重要判断 |
| **GPT-5.3 Codex** | 77.3% (Terminal-Bench) | 400K | ChatGPT Proで追加料金なし | 大規模エージェント型コーディング |

**使い分け**:
- Opus 4.6 → Claude Code内での深い推論、複雑なリファクタリング
- GPT-5.3 Codex → ChatGPT上で大規模なプロジェクト生成、競合検証

#### Tier 1: 高品質モデル

| モデル | SWE-bench | コンテキスト | 価格 | 用途 |
|--------|-----------|-------------|------|------|
| **Claude Sonnet 4.5** | 77.2% | 200K | Max $200プランで追加料金なし | 日常のコーディング、テスト生成 |

**使い分け**:
- コード生成、バグ修正、テスト作成 → **全体作業の80%をこれで処理**
- Claude Max $200プランのメイン消費先

#### Tier 2: 効率型モデル

| モデル | SWE-bench | コンテキスト | 価格 | 用途 |
|--------|-----------|-------------|------|------|
| **Claude Haiku 4.5** | - | 200K | Max $200プランで追加料金なし | ドキュメント生成、簡単修正 |
| **Gemini 2.5 Flash** | - | 1M | 無料枠あり / $0.15/$0.60 | 長文解析、無料枠で軽作業 |

**使い分け**:
- READMEやコメント生成 → Haiku
- 1Mトークン超の長文ファイル解析 → Gemini Flash（無料枠あり）

#### Tier 3: ローカルモデル（コスト$0、128GB RAM活用）

| モデル | パラメータ | メモリ(Q4) | 速度(tok/s) | HumanEval | Tool Calling | 状態 |
|--------|----------|-----------|------------|-----------|-------------|------|
| **Qwen2.5-Coder:32B** | 32.5B | 18GB | 10 tok/s | 92.7% | ✅ | インストール済み(qwen2.5:32b) |
| **Qwen3-Coder:30B** | 30B MoE (3.3B active) | 18GB | 100+ tok/s | - | ✅ | インストール済み |
| **GLM-4.7** | 4.7B | 3GB | 60-85 tok/s | - | ✅ | **新規追加推奨** |
| **Codestral 25.01** | 22B | 15GB | 12-15 tok/s | 86.6% | ✅ | **新規追加推奨** |

**使い分け**:
- 高品質コード生成 → Qwen2.5-Coder:32B（HumanEval 92.7%）
- 高速応答 → GLM-4.7（60-85 tok/s、超軽量3GB）
- バランス型 → Qwen3-Coder:30B（MoEで高速かつ高品質）
- 長文コンテキスト → Codestral 25.01（256K対応）

**128GBでの同時稼働計画**:
```
Qwen2.5-Coder:32B (Q8)  = 33GB
Qwen3-Coder:30B (Q4)    = 18GB
GLM-4.7 (Q4)             =  3GB
Codestral 25.01 (Q4)    = 15GB
nomic-embed-text         =  0.3GB
───────────────────────────────
合計                      = 69.3GB
残りシステム用            = 58.7GB  ← 余裕あり
```

#### Tier 4: 無料/低コストクラウド（OpenRouter経由）

| モデル | パラメータ | 価格 | Tool Calling | 用途 |
|--------|----------|------|-------------|------|
| **gpt-oss-120b** | 117B MoE | 無料 | ✅ | 非クリティカルなコーディング |
| **Qwen3-Coder-480B** | 480B (35B active) | 無料 | ✅ | Agenticコーディング |
| **DeepSeek V3.2** | MoE | $0.28/$0.42 | ✅ | SWE-bench 73%、コスパ最強 |
| **Kimi K2.5** | 1T (32B active) | $0.60/$2.50 | ✅ | SWE-bench 76.8% |

---

## 3. 自動切替ロジック（どの場面でどのモデルを使うか）

### 3.1 タスクタイプ別ルーティング

```
ユーザーのリクエスト
        │
        ▼
  ┌─────────────┐
  │ タスク分類器  │ ← Claude Haiku or GLM-4.7で分類
  └──────┬──────┘
         │
    ┌────┼────┬──────────┬──────────┬──────────┐
    ▼    ▼    ▼          ▼          ▼          ▼
  設計  実装  テスト    ドキュメント  簡単修正  リサーチ
    │    │    │          │          │          │
    ▼    ▼    ▼          ▼          ▼          ▼
  Opus  Sonnet Sonnet   Haiku     ローカル   DeepSeek
  4.6   4.5   4.5       4.5      GLM-4.7    V3.2
```

### 3.2 具体的なルーティングルール

| 場面 | 使用モデル | 理由 |
|------|----------|------|
| **アーキテクチャ設計・重要判断** | Claude Opus 4.6 | 最高品質の推論（SWE-bench 80.8%） |
| **複雑なリファクタリング** | Claude Opus 4.6 | 大規模なコード理解が必要 |
| **日常のコード生成** | Claude Sonnet 4.5 | 品質とコストのバランス（作業の80%） |
| **バグ修正** | Claude Sonnet 4.5 | 十分な品質、Haiku以上の精度が必要 |
| **テスト生成** | Claude Sonnet 4.5 or ローカル | 複雑なテストはSonnet、単純なのはローカル |
| **コードレビュー** | Qwen2.5-Coder:32B (ローカル) | HumanEval 92.7%、無料 |
| **ドキュメント・コメント生成** | Claude Haiku 4.5 or GLM-4.7 | 軽量タスク、コスト最小化 |
| **簡単な修正（typo、import等）** | GLM-4.7 (ローカル) | 60-85 tok/s、即応答、無料 |
| **ディープリサーチ** | DeepSeek V3.2 + ローカル | Claude比 6.6倍安価でSWE-bench 73% |
| **大規模エージェント型タスク** | GPT-5.3 Codex (ChatGPT Pro) | 400Kコンテキスト、追加料金なし |
| **Claude Maxレート制限時** | Qwen3-Coder:30B → OpenRouter無料 | フォールバックチェーン |
| **長文ファイル全体解析** | Gemini 2.5 Flash | 1Mコンテキスト、無料枠あり |
| **セマンティックキャッシュ用** | nomic-embed-text (ローカル) | 埋め込みベクトル生成、無料 |

### 3.3 フォールバックチェーン

```
Claude Max制限到達時のフォールバック順序:

1. Claude Sonnet 4.5 (Max $200 メイン) ← 通常はここ
      │ レート制限到達
      ▼
2. Qwen2.5-Coder:32B (ローカル) ← 無料、高品質
      │ 複雑すぎる場合
      ▼
3. OpenRouter DeepSeek V3.2 ← $0.28/M、SWE-bench 73%
      │ DeepSeek障害時
      ▼
4. OpenRouter gpt-oss-120b (無料) ← 最終フォールバック
      │ 全障害時
      ▼
5. GLM-4.7 (ローカル、軽量) ← 最後の砦、常時稼働可能
```

### 3.4 ディープリサーチの場面でのモデル使い分け

**従来（コスト大）**: 全てClaude Opus 4.6 → 高品質だが$200制限を圧迫

**新システム（コスト最適化）**:
```
ディープリサーチ・フロー:

1. 情報収集（Web検索、ページ読み取り）
   → GLM-4.7 or Qwen3-Coder:30B (ローカル、$0)
   → 理由: 検索クエリ生成や情報抽出は軽量タスク

2. 情報の統合・分析
   → DeepSeek V3.2 (OpenRouter、$0.28/M)
   → 理由: 十分な品質でClaude比6.6倍安価

3. 最終判断・提案書作成
   → Claude Sonnet 4.5 (Max $200プラン)
   → 理由: 最終成果物のみ高品質モデルで仕上げ

4. アーキテクチャ設計の最終レビュー
   → Claude Opus 4.6 (Max $200プラン)
   → 理由: 重要判断のみOpusに任せる
```

**コスト効果**:
- 従来: リサーチ全工程をOpus → Max制限の30-50%消費
- 新方式: ローカル+DeepSeek → Max制限の5%未満

---

## 4. システムアーキテクチャ

### 4.1 全体構成図

```
┌──────────────────────────────────────────────────────────────────┐
│                        ユーザー (Claude Code CLI)                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              claude-code-router (ルーティングレイヤー)             │
│                                                                   │
│  タスク分類:                                                      │
│    default  → Claude Sonnet 4.5 (Max $200)                       │
│    think    → Claude Opus 4.6 (Max $200)                         │
│    bg       → Qwen2.5-Coder:32B (ローカル)                       │
│    quick    → GLM-4.7 (ローカル)                                  │
│    research → DeepSeek V3.2 (OpenRouter)                         │
│    fallback → gpt-oss-120b (OpenRouter無料)                      │
│                                                                   │
│  セマンティックキャッシュ: Redis + nomic-embed-text               │
└──────────┬───────────────┬──────────────────┬────────────────────┘
           │               │                  │
     ┌─────┘         ┌─────┘            ┌─────┘
     ▼               ▼                  ▼
┌──────────┐  ┌────────────┐  ┌──────────────────┐
│ Anthropic │  │   Ollama   │  │   OpenRouter     │
│  API      │  │ localhost  │  │   API            │
│           │  │  :11434    │  │                  │
│ Opus 4.6  │  │            │  │ DeepSeek V3.2    │
│ Sonnet4.5 │  │ Qwen2.5:32B│  │ gpt-oss-120b    │
│ Haiku 4.5 │  │ Qwen3:30B  │  │ Qwen3-Coder-480B│
│           │  │ GLM-4.7    │  │ Kimi K2.5        │
│           │  │ Codestral  │  │                  │
└──────────┘  └────────────┘  └──────────────────┘
```

### 4.2 claude-code-router設定

```json
{
  "mcpServers": {},
  "routerConfig": {
    "default": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929"
    },
    "think": {
      "provider": "anthropic",
      "model": "claude-opus-4-6"
    },
    "background": {
      "provider": "ollama",
      "model": "qwen2.5-coder:32b",
      "baseUrl": "http://localhost:11434"
    },
    "quick": {
      "provider": "ollama",
      "model": "glm-4.7",
      "baseUrl": "http://localhost:11434"
    },
    "research": {
      "provider": "openrouter",
      "model": "deepseek/deepseek-chat-v3-0324",
      "apiKey": "${OPENROUTER_API_KEY}"
    },
    "fallback": {
      "provider": "openrouter",
      "model": "openai/gpt-oss-120b:free",
      "apiKey": "${OPENROUTER_API_KEY}"
    }
  },
  "fallbackChain": [
    "anthropic/claude-sonnet-4-5",
    "ollama/qwen2.5-coder:32b",
    "openrouter/deepseek-v3.2",
    "openrouter/gpt-oss-120b:free",
    "ollama/glm-4.7"
  ],
  "cache": {
    "enabled": true,
    "type": "redis-semantic",
    "embeddingModel": "ollama/nomic-embed-text",
    "similarityThreshold": 0.85,
    "ttl": 86400
  }
}
```

---

## 5. 月額コスト試算

### 5.1 固定費

| 項目 | 月額 |
|------|------|
| Claude Max $200プラン | $200 |
| ChatGPT Pro | $200 |
| Ollamaローカルモデル | $0（電気代のみ） |
| Redis（Docker） | $0（ローカル） |
| **固定費合計** | **$400** |

### 5.2 変動費（OpenRouter利用分）

| 利用場面 | モデル | 月間推定トークン | 月額 |
|---------|-------|----------------|------|
| ディープリサーチ | DeepSeek V3.2 | 5M tokens | $2-3 |
| フォールバック | gpt-oss-120b | 2M tokens | $0（無料） |
| 長文解析 | Gemini Flash | 3M tokens | $0-1 |
| **変動費合計** | | | **$2-4** |

### 5.3 総コスト

| 項目 | 月額 |
|------|------|
| **合計** | **$402-404** |
| (Claude Max + ChatGPT Pro + わずかなAPI) | |

### 5.4 コスト削減効果

| 比較対象 | 月額 | 削減率 |
|---------|------|--------|
| 全てOpus API利用 | $3,650+ | **89%削減** |
| Claude Max + API混合 (v2提案) | $200-250 | 固定費は同等、GPT-5.3追加 |
| 今回の提案 | $402-404 | Claude+ChatGPT両方を最大活用 |

**ポイント**: 月$400で**世界最高レベルの2大AI (Opus 4.6 + GPT-5.3 Codex)**と**ローカルモデル4-5種**を自由に使える。API従量課金($3,650+/月)と比べ**89%のコスト削減**。

---

## 6. 追加インストールが必要なモデル

### 6.1 新規追加推奨モデル

```bash
# 1. GLM-4.7 (超高速ローカルモデル、3GB)
ollama pull glm-4.7

# 2. Codestral 25.01 (256Kコンテキスト、長文対応)
ollama pull codestral:22b

# 3. Qwen2.5-Coder:32B Q8版 (128GBあるので最高品質版へアップグレード)
ollama pull qwen2.5-coder:32b-instruct-q8_0
```

### 6.2 追加後のモデル一覧

```
既存:
  ✅ nomic-embed-text     (274MB)  - 埋め込みベクトル用
  ✅ qwen3:8b             (5.2GB)  - 軽量汎用
  ✅ qwen2.5:32b          (19GB)   - メインコーディング
  ✅ qwen3-coder:30b      (18GB)   - MoEコーディング

新規追加:
  🆕 glm-4.7             (~3GB)   - 超高速Tool Calling
  🆕 codestral:22b       (~15GB)  - 256K長文コンテキスト
  🆕 qwen2.5-coder:32b-q8 (~33GB) - 最高品質コーディング

合計メモリ使用量: ~93GB / 128GB（余裕あり）
```

---

## 7. 実装ステップ（承認後に実行）

### Phase 1: ローカルモデル追加（5分）
- GLM-4.7、Codestral 25.01のpull
- Qwen2.5-Coder Q8版へのアップグレード

### Phase 2: Redis + セマンティックキャッシュ構築（15分）
- Docker ComposeでRedis起動
- nomic-embed-textを使ったキャッシュ層の実装

### Phase 3: claude-code-router設定（10分）
- npmインストール
- タスクベースルーティング設定
- フォールバックチェーン設定

### Phase 4: .env更新 + 統合テスト（10分）
- 環境変数の更新
- 各モデルの疎通確認
- ルーティングの動作テスト

---

## 8. 質問への直接回答

### Q: ディープリサーチでOpus全部使わずにコスト抑えるには？

**A**: ディープリサーチの3段階に分割:
1. **情報収集** → GLM-4.7 (ローカル、$0、60-85 tok/s)
2. **分析・統合** → DeepSeek V3.2 (OpenRouter、$0.28/M)
3. **最終仕上げのみ** → Claude Sonnet/Opus (Max $200プラン)

これでリサーチのMax消費を**95%削減**できます。

### Q: GPT-5.3 Codexはどう使う？

**A**: ChatGPT Pro上で:
- 大規模プロジェクトの一括生成（400Kコンテキスト活用）
- Claude Codeの出力をChatGPTで「セカンドオピニオン」レビュー
- コーディングエージェントとしての並列活用

### Q: ローカルモデルの品質は大丈夫？

**A**: 128GB M4 Maxなら:
- Qwen2.5-Coder:32B → HumanEval **92.7%**（GPT-4oと同等）
- GLM-4.7 → Tool Callingで**Qwen3-30Bを上回る**評価
- 日常の軽作業には十分な品質

---

## 9. ベンチマーク比較（一目でわかる）

```
SWE-bench Verified 2026年2月:

Claude Opus 4.6    ████████████████████████████████████████  80.8%
Claude Sonnet 4.5  ██████████████████████████████████████    77.2%
GPT-5.3 Codex      ████████████████████████████████████      77.3% (Terminal-Bench)
Gemini 3 Flash     ███████████████████████████████████       78.0%
Kimi K2.5          ██████████████████████████████████        76.8%
DeepSeek V3.2      █████████████████████████████████         73.0%
Qwen3-Coder-Next   ████████████████████████████████          70.6%
GLM-4.7            ██████████████████████████                60.0%

HumanEval (コード生成):

Qwen2.5-Coder:32B ██████████████████████████████████████████ 92.7%
Codestral 25.01    ████████████████████████████████████████   86.6%

ローカルモデル速度 (M4 Max 128GB):

GLM-4.7            ████████████████████████████████████████  60-85 tok/s
Qwen3-Coder:30B    ████████████████████████████████████████  100+ tok/s (prompt)
Codestral 25.01    ████████████████                          12-15 tok/s
Qwen2.5-Coder:32B  ████████████                              10 tok/s
```

---

## 10. まとめ

| 項目 | 内容 |
|------|------|
| **コスト** | $402/月（API従量比89%削減） |
| **最高品質モデル** | Opus 4.6 + GPT-5.3 Codex（両方サブスク内） |
| **ローカルモデル** | 4-5種同時稼働（128GB活用、$0） |
| **自動切替** | claude-code-router + フォールバックチェーン |
| **キャッシュ** | Redis Semantic Cache（73%コスト削減） |
| **リサーチ最適化** | ローカル→DeepSeek→Claude の3段階で95%削減 |
| **実装時間** | 約40分 |
