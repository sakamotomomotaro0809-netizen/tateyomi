# TAISUN v2 アーキテクチャ

## システム概要図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TAISUN v2                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Coordinator Layer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ait42-coord  │  │ait42-fast   │  │omega-aware-coordinator  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │   │
│  └─────────┼────────────────┼─────────────────────┼────────────────┘   │
│            │                │                     │                     │
│  ┌─────────▼────────────────▼─────────────────────▼────────────────┐   │
│  │                        Agent Pool (69 Agents)                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │Architect │  │Developer │  │   QA     │  │    Operations    │ │   │
│  │  │  (6種)   │  │  (6種)   │  │  (8種)   │  │      (8種)       │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Skill Library (24 Skills)                  │  │
│  │  ┌───────────────┐  ┌────────────┐  ┌─────────────────────────┐  │  │
│  │  │Marketing (11) │  │Creative(3) │  │   Infrastructure (9)    │  │  │
│  │  └───────────────┘  └────────────┘  └─────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         MCP Integration                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │PostgreSQL│  │  Notion  │  │   IDE    │  │     GitHub       │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Memory System                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │  │
│  │  │   Agent Stats    │  │   Task History   │  │ Quality Metrics│  │  │
│  │  └──────────────────┘  └──────────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## レイヤー構成

### 1. Coordinator Layer（オーケストレーション層）

ユーザーからのリクエストを受け取り、最適なエージェントを選択・実行する。

| コンポーネント | 役割 | 選択アルゴリズム |
|--------------|------|-----------------|
| ait42-coordinator | メインコーディネーター | メモリ統計ベース |
| ait42-coordinator-fast | 軽量版（O(1)選択） | ルールベース |
| omega-aware-coordinator | Ω関数理論ベース | 確率的最適化 |
| self-healing-coordinator | 自己修復システム | エラーパターン分析 |

### 2. Agent Pool（エージェント層）

69種類の専門エージェントが格納されている。

```
Agent Pool
├── Coordinators (4)
│   └── タスク振り分け、エラーリカバリ
├── Architecture (6)
│   └── システム設計、API設計、DB設計
├── Development (6)
│   └── バックエンド、フロントエンド実装
├── Quality Assurance (8)
│   └── テスト、レビュー、セキュリティ
├── Operations (8)
│   └── DevOps、CI/CD、監視
├── Documentation (3)
│   └── 技術文書、ナレッジ管理
├── Analysis (4)
│   └── 複雑度分析、フィードバック分析
├── Specialized (5)
│   └── バグ修正、リファクタリング
├── Multi-Agent (4)
│   └── 競争、討論、アンサンブル
└── Process (5)
    └── ワークフロー、要件管理
```

### 3. Skill Library（スキル層）

24種類のスキルが格納されている。

```
Skill Library
├── Marketing & Content (11)
│   ├── copywriting-helper
│   ├── sales-letter
│   ├── step-mail
│   ├── vsl
│   ├── launch-video
│   ├── lp-generator
│   ├── funnel-builder
│   ├── mendan-lp
│   ├── lp-analysis
│   ├── customer-support
│   └── tommy-style
├── Creative & Media (3)
│   ├── gemini-image-generator
│   ├── nanobanana-prompts
│   └── japanese-tts-reading
├── Infrastructure (9)
│   ├── workflow-automation-n8n
│   ├── docker-mcp-ops
│   ├── security-scan-trivy
│   ├── pdf-automation-gotenberg
│   ├── doc-convert-pandoc
│   ├── unified-notifications-apprise
│   ├── postgres-mcp-analyst
│   ├── notion-knowledge-mcp
│   └── nlq-bi-wrenai
└── Research (1)
    └── research-cited-report
```

### 4. MCP Integration（MCP統合層）

外部サービスとの連携を担当。

| MCP Server | 接続先 | 用途 |
|------------|--------|------|
| postgres-ro | PostgreSQL | データ分析（read-only） |
| notion | Notion API | ナレッジ管理 |
| ide | VS Code等 | コード操作 |
| filesystem | ローカルFS | ファイル操作 |

### 5. Memory System（メモリ層）

エージェントの学習・統計情報を管理。

```yaml
# .claude/memory/config.yaml
version: "1.0"
max_tasks: 1000
retention_days: 90
quality_threshold:
  excellent: 90
  good: 75
  acceptable: 60
success_rate_threshold:
  preferred: 0.85
  acceptable: 0.70
  warning: 0.50
```

## データフロー

### 1. リクエスト処理フロー

```
User Request
     │
     ▼
┌──────────────────┐
│   Coordinator    │ ← エージェント選択
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Agent Pool     │ ← タスク実行
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Skill │ │  MCP  │ ← 外部連携
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌──────────────────┐
│  Memory System   │ ← 結果記録
└────────┬─────────┘
         │
         ▼
    Response
```

### 2. マルチエージェントモード

```
                    Request
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │Agent A  │  │Agent B  │  │Agent C  │
     └────┬────┘  └────┬────┘  └────┬────┘
          │            │            │
          ▼            ▼            ▼
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │Result A │  │Result B │  │Result C │
     └────┬────┘  └────┬────┘  └────┬────┘
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Aggregation   │
              │ (Competition/  │
              │ Debate/        │
              │ Ensemble)      │
              └───────┬────────┘
                      │
                      ▼
                Final Result
```

## ディレクトリ構造

```
taisun_v2/
├── .claude/
│   ├── CLAUDE.md              # プロジェクト指示書
│   ├── settings.json          # パーミッション設定
│   ├── agents/                # エージェント定義
│   │   ├── coordinators/
│   │   ├── architecture/
│   │   ├── development/
│   │   ├── quality/
│   │   ├── operations/
│   │   └── ...
│   ├── commands/              # コマンド定義
│   ├── skills/                # スキル定義
│   │   ├── marketing/
│   │   ├── creative/
│   │   ├── infrastructure/
│   │   └── research/
│   └── memory/                # メモリシステム
│       ├── config.yaml        # 設定
│       ├── agents/            # エージェント統計
│       └── tasks/             # タスク履歴
├── .github/
│   ├── workflows/             # CI/CDワークフロー
│   ├── ISSUE_TEMPLATE/        # Issueテンプレート
│   └── dependabot.yml         # 依存関係更新
├── .mcp.json                  # MCP設定
├── src/                       # ソースコード
├── docs/                      # ドキュメント
├── scripts/                   # ユーティリティ
└── config/                    # 環境設定
```

## セキュリティアーキテクチャ

### 認証・認可

```
┌─────────────────────────────────────────────────────┐
│                   Security Layer                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ API Key Auth │  │ MCP Auth     │  │ Role-Based│ │
│  │ (Anthropic)  │  │ (各サービス) │  │ Permissions│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │              Allowed Operations                  ││
│  │  ・Read: src/, docs/, config/                   ││
│  │  ・Write: src/, tests/, docs/, .claude/memory/  ││
│  │  ・Execute: npm, git, test commands             ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │              Denied Operations                   ││
│  │  ・System files modification                    ││
│  │  ・Credential exposure                          ││
│  │  ・Network access (unauthorized)                ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 品質ゲート

```
Code Change
     │
     ▼
┌─────────────┐
│   Lint      │ → ESLint
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│ Type Check  │ → TypeScript
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│    Test     │ → Jest (Coverage ≥ 80%)
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│  Security   │ → Trivy, npm audit
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│   Build     │
└──────┬──────┘
       │ Pass
       ▼
    Deploy
```

## スケーラビリティ

### 水平スケーリング

- エージェントは並列実行可能（`maxParallelAgents: 5`）
- 独立したタスクは同時実行
- 依存関係のあるタスクは順次実行

### 垂直スケーリング

- モデル選択による負荷調整
  - `haiku`: 軽量タスク
  - `sonnet`: 標準タスク
  - `opus`: 複雑なタスク

## 拡張ポイント

### 新規エージェント追加

1. `.claude/agents/` にYAMLファイル作成
2. `CLAUDE.md` にエージェント登録
3. テスト実行

### 新規スキル追加

1. `.claude/skills/` にディレクトリ作成
2. `SKILL.md` 定義ファイル作成
3. テスト実行

### 新規MCP追加

1. `.mcp.json` に設定追加
2. 環境変数設定
3. 接続テスト

---

Built with Claude Code
