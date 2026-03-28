# TAISUN v2 API リファレンス

## 目次

1. [エージェント API](#エージェント-api)
2. [スキル API](#スキル-api)
3. [MCP ツール API](#mcp-ツール-api)
4. [コーディネーター API](#コーディネーター-api)

---

## エージェント API

### 基本的な呼び出し方

```javascript
Task(subagent_type="<agent-name>", prompt="<task-description>")
```

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| subagent_type | string | ✅ | エージェント名 |
| prompt | string | ✅ | タスクの説明 |
| model | string | ❌ | モデル指定（haiku/sonnet/opus） |
| run_in_background | boolean | ❌ | バックグラウンド実行 |

---

### Coordinators（コーディネーター）

#### ait42-coordinator

メインコーディネーター。タスクに最適なエージェントを自動選択。

```javascript
Task(
  subagent_type="ait42-coordinator",
  prompt="ユーザー認証機能を設計・実装して"
)
```

**入力**:
- 複合的なタスク説明

**出力**:
- 選択されたエージェントの実行結果
- タスク完了レポート

**使用場面**:
- どのエージェントを使うべきか不明な場合
- 複数のエージェントが必要な複合タスク

---

#### ait42-coordinator-fast

軽量版コーディネーター。O(1)でエージェントを選択。

```javascript
Task(
  subagent_type="ait42-coordinator-fast",
  prompt="簡単なバグを修正して"
)
```

**特徴**:
- メモリシステムを使用しない
- ルールベースの高速選択
- 単純なタスク向け

---

#### omega-aware-coordinator

Ω関数理論ベースのインテリジェントコーディネーター。

```javascript
Task(
  subagent_type="omega-aware-coordinator",
  prompt="最適な実装アプローチを選択して"
)
```

**特徴**:
- 性能下界保証
- 依存関係最適化
- 完了確率推定

---

### Architecture（設計系）

#### system-architect

システムアーキテクチャ設計の専門家。

```javascript
Task(
  subagent_type="system-architect",
  prompt="ECサイトのマイクロサービスアーキテクチャを設計して"
)
```

**入力**:
- システム要件
- 非機能要件（スケーラビリティ、可用性など）

**出力**:
- アーキテクチャ図
- コンポーネント設計
- 技術選定理由

---

#### api-designer

REST/GraphQL/gRPC API設計の専門家。

```javascript
Task(
  subagent_type="api-designer",
  prompt="ユーザー管理APIのOpenAPI仕様を設計して"
)
```

**入力**:
- API要件
- リソース定義

**出力**:
- OpenAPI仕様書（YAML/JSON）
- エンドポイント一覧
- リクエスト/レスポンス例

---

#### database-designer

データベース設計の専門家。

```javascript
Task(
  subagent_type="database-designer",
  prompt="ブログシステムのER図とスキーマを設計して"
)
```

**入力**:
- エンティティ要件
- リレーション要件

**出力**:
- ER図
- DDL（CREATE TABLE文）
- インデックス設計

---

#### security-architect

セキュリティアーキテクチャ設計の専門家。

```javascript
Task(
  subagent_type="security-architect",
  prompt="ゼロトラストアーキテクチャを設計して"
)
```

**入力**:
- セキュリティ要件
- コンプライアンス要件

**出力**:
- 脅威モデル
- セキュリティコントロール設計
- 認証・認可フロー

---

#### cloud-architect

マルチクラウドアーキテクチャ設計の専門家。

```javascript
Task(
  subagent_type="cloud-architect",
  prompt="AWS上にサーバーレスアーキテクチャを設計して"
)
```

**入力**:
- クラウド要件
- コスト制約

**出力**:
- インフラ構成図
- サービス選定
- コスト見積もり

---

#### ui-ux-designer

UI/UX設計の専門家。

```javascript
Task(
  subagent_type="ui-ux-designer",
  prompt="ダッシュボードのワイヤーフレームを設計して"
)
```

**入力**:
- ユーザー要件
- 画面要件

**出力**:
- ワイヤーフレーム
- ユーザーフロー
- アクセシビリティ考慮点

---

### Development（開発系）

#### backend-developer

バックエンド実装の専門家。

```javascript
Task(
  subagent_type="backend-developer",
  prompt="ユーザー認証APIをNode.jsで実装して"
)
```

**入力**:
- 実装要件
- 技術スタック

**出力**:
- ソースコード
- APIエンドポイント
- テストコード

---

#### frontend-developer

フロントエンド実装の専門家。

```javascript
Task(
  subagent_type="frontend-developer",
  prompt="Reactでログインフォームを実装して"
)
```

**入力**:
- UI/UX要件
- コンポーネント仕様

**出力**:
- Reactコンポーネント
- スタイリング
- ユニットテスト

---

#### api-developer

API実装の専門家。

```javascript
Task(
  subagent_type="api-developer",
  prompt="REST APIエンドポイントを実装して"
)
```

**入力**:
- API仕様
- 認証要件

**出力**:
- APIルート実装
- バリデーション
- エラーハンドリング

---

#### database-developer

データベース実装の専門家。

```javascript
Task(
  subagent_type="database-developer",
  prompt="マイグレーションとストアドプロシージャを実装して"
)
```

**入力**:
- スキーマ設計
- データ操作要件

**出力**:
- マイグレーションファイル
- ストアドプロシージャ
- クエリ最適化

---

### Quality Assurance（品質保証系）

#### code-reviewer

コードレビューの専門家。

```javascript
Task(
  subagent_type="code-reviewer",
  prompt="このPRをセキュリティ観点でレビューして"
)
```

**入力**:
- ソースコード
- 差分情報

**出力**:
- レビューコメント（0-100スコア）
- 改善提案
- セキュリティ指摘

**スコアリング**:
| スコア | 評価 |
|--------|------|
| 90-100 | Excellent |
| 75-89 | Good |
| 60-74 | Acceptable |
| 0-59 | Needs Improvement |

---

#### test-generator

テスト自動生成の専門家。

```javascript
Task(
  subagent_type="test-generator",
  prompt="src/services/user.ts のユニットテストを生成して"
)
```

**入力**:
- ソースコード
- テスト対象

**出力**:
- ユニットテスト
- モック定義
- カバレッジ目標

---

#### security-tester

セキュリティテストの専門家。

```javascript
Task(
  subagent_type="security-tester",
  prompt="OWASP Top 10に基づいたセキュリティテストを実行して"
)
```

**入力**:
- テスト対象
- セキュリティ基準

**出力**:
- 脆弱性レポート
- 修正提案
- リスク評価

---

#### performance-tester

パフォーマンステストの専門家。

```javascript
Task(
  subagent_type="performance-tester",
  prompt="APIの負荷テストを設計・実行して"
)
```

**入力**:
- テスト対象
- 性能要件

**出力**:
- テストシナリオ
- ベンチマーク結果
- ボトルネック分析

---

### Operations（運用系）

#### devops-engineer

DevOps実装の専門家。

```javascript
Task(
  subagent_type="devops-engineer",
  prompt="Terraformでインフラをコード化して"
)
```

**入力**:
- インフラ要件
- 環境情報

**出力**:
- IaCコード（Terraform/Pulumi）
- 設定ファイル
- デプロイスクリプト

---

#### cicd-manager

CI/CDパイプライン管理の専門家。

```javascript
Task(
  subagent_type="cicd-manager",
  prompt="GitHub Actionsのワークフローを最適化して"
)
```

**入力**:
- 現在のパイプライン
- 品質ゲート要件

**出力**:
- 最適化されたワークフロー
- 品質ゲート設定
- パフォーマンス改善

---

#### monitoring-specialist

監視・オブザーバビリティの専門家。

```javascript
Task(
  subagent_type="monitoring-specialist",
  prompt="Prometheus + Grafanaの監視設定を構築して"
)
```

**入力**:
- 監視要件
- SLO定義

**出力**:
- メトリクス設定
- ダッシュボード
- アラートルール

---

### Specialized（特化型）

#### bug-fixer

バグ修正の専門家。

```javascript
Task(
  subagent_type="bug-fixer",
  prompt="NullPointerExceptionの原因を特定して修正して"
)
```

**入力**:
- エラーログ
- 再現手順

**出力**:
- 根本原因分析
- 修正パッチ
- テストケース

---

#### refactor-specialist

リファクタリングの専門家。

```javascript
Task(
  subagent_type="refactor-specialist",
  prompt="このモジュールをSOLID原則に沿ってリファクタリングして"
)
```

**入力**:
- リファクタリング対象コード
- 改善目標

**出力**:
- リファクタリング計画
- 改善後コード
- テスト維持確認

---

### Multi-Agent Modes（マルチエージェント）

#### multi-agent-competition

複数エージェントが同じタスクに取り組み、最良の結果を選択。

```javascript
Task(
  subagent_type="multi-agent-competition",
  prompt="最適なアルゴリズムを競争モードで選定して"
)
```

**特徴**:
- 2-10の並列インスタンス
- Git worktree分離
- 最良解の自動選択

---

#### multi-agent-debate

複数の視点から議論し、コンセンサスを形成。

```javascript
Task(
  subagent_type="multi-agent-debate",
  prompt="このアーキテクチャ決定について議論して"
)
```

**特徴**:
- 3役割 × 3ラウンド
- コンテキスト蓄積
- コンセンサス形成

---

---

## スキル API

### 基本的な呼び出し方

```bash
/<skill-name> [arguments]
```

---

### Marketing & Content

#### /sales-letter

高額商品向けセールスレターを作成。

```bash
/sales-letter --product "オンライン英会話スクール" --target "30代ビジネスパーソン"
```

**パラメータ**:
| パラメータ | 説明 |
|-----------|------|
| --product | 商品名 |
| --target | ターゲット顧客 |
| --price | 価格帯（オプション） |

**出力**:
- ヘッドコピー
- ベネフィット
- 価格提示
- CTA

---

#### /step-mail

ステップメールシーケンスを作成。

```bash
/step-mail --theme "ダイエットプログラム" --days 7
```

**パラメータ**:
| パラメータ | 説明 |
|-----------|------|
| --theme | テーマ |
| --days | 日数 |

**出力**:
- 各日のメール内容
- 件名候補
- CTA設計

---

#### /vsl

ビデオセールスレター台本を作成。

```bash
/vsl --product "投資講座" --duration 30
```

**パラメータ**:
| パラメータ | 説明 |
|-----------|------|
| --product | 商品名 |
| --duration | 動画長（分） |

**出力**:
- 15章構成の台本
- シーン指示
- CTA

---

#### /lp-analysis

LPを分析し改善点を提案。

```bash
/lp-analysis https://example.com/lp
```

**パラメータ**:
- LP URL

**出力**:
- TOMYスタイル適合度スコア
- 改善点リスト
- 具体的な修正案

---

#### /customer-support

顧客問い合わせへの返信を作成。

```bash
/customer-support "商品が届かないというクレーム"
```

**パラメータ**:
- 問い合わせ内容

**出力**:
- 2000文字以上の返信
- 6つの教育要素を自然に組み込み

---

### Creative & Media

#### /nanobanana-prompts

画像生成用プロンプトを最適化。

```bash
/nanobanana-prompts "YouTubeサムネイル、テーマ：AI副業"
```

**パラメータ**:
- 画像の説明

**出力**:
- 基本プロンプト（100-200語）
- 詳細プロンプト
- JSON形式（高精度版）

---

#### /gemini-image-generator

画像を生成（NanoBanana統合）。

```bash
/gemini-image-generator "モダンなオフィスで働くビジネスマン"
```

**パラメータ**:
- 画像プロンプト

**出力**:
- 生成された画像

---

### Infrastructure

#### /security-scan-trivy

セキュリティスキャンを実行。

```bash
/security-scan-trivy
```

**出力**:
- 脆弱性レポート（Critical/High/Medium/Low）
- 修正推奨事項
- npm audit結果

---

#### /workflow-automation-n8n

n8nワークフローを設計。

```bash
/workflow-automation-n8n "新規リード → Slack通知 → CRM登録"
```

**パラメータ**:
- ワークフロー説明

**出力**:
- n8nワークフロー定義
- トリガー設定
- エラーハンドリング

---

#### /postgres-mcp-analyst

PostgreSQLデータを分析。

```bash
/postgres-mcp-analyst "月次売上集計をSQLで"
```

**パラメータ**:
- 分析クエリ

**出力**:
- SQLクエリ
- 結果の可視化
- インサイト

---

### Research

#### /research-cited-report

出典付きリサーチレポートを作成。

```bash
/research-cited-report "2024年のAI市場動向"
```

**パラメータ**:
- リサーチテーマ

**出力**:
- エグゼクティブサマリー
- キーファインディングス（出典付き）
- リスク・トレードオフ
- 推奨事項
- 参考文献リスト

---

## MCP ツール API

### PostgreSQL MCP

```javascript
// スキーマ確認
MCPSearch(query="select:mcp__postgres__list_tables")

// クエリ実行
mcp__postgres__query({ sql: "SELECT * FROM users LIMIT 10" })
```

**利用可能な操作**:
| 操作 | 説明 |
|------|------|
| list_tables | テーブル一覧取得 |
| describe_table | テーブル構造確認 |
| query | SQLクエリ実行（read-only） |

---

### Notion MCP

```javascript
// ページ検索
mcp__notion__search({ query: "プロジェクト計画" })

// ページ作成
mcp__notion__create_page({
  parent: "database_id",
  properties: { ... }
})
```

**利用可能な操作**:
| 操作 | 説明 |
|------|------|
| search | コンテンツ検索 |
| get_page | ページ取得 |
| create_page | ページ作成 |
| update_page | ページ更新 |

---

### IDE MCP

```javascript
// 診断情報取得
mcp__ide__getDiagnostics({ uri: "file:///path/to/file.ts" })

// コード実行
mcp__ide__executeCode({ code: "console.log('test')" })
```

**利用可能な操作**:
| 操作 | 説明 |
|------|------|
| getDiagnostics | Lint/型エラー取得 |
| executeCode | コード実行 |

---

## コーディネーター API

### エージェント選択アルゴリズム

#### ait42-coordinator（メモリベース）

```
選択スコア = 成功率 × 0.4 + 品質スコア × 0.3 + タスク適合度 × 0.3
```

#### ait42-coordinator-fast（ルールベース）

```
if (task.includes("設計")) → system-architect
if (task.includes("実装")) → backend-developer
if (task.includes("テスト")) → test-generator
...
```

#### omega-aware-coordinator（確率的最適化）

```
Ω(agent) = P(success) × E(quality) × (1 - dependency_risk)
```

---

## エラーコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| AGENT_NOT_FOUND | エージェントが見つからない | エージェント名を確認 |
| SKILL_NOT_FOUND | スキルが見つからない | スキル名を確認 |
| MCP_CONNECTION_ERROR | MCP接続エラー | 環境変数・認証を確認 |
| QUALITY_GATE_FAILED | 品質ゲート失敗 | 指摘事項を修正 |
| TIMEOUT | タイムアウト | タスクを分割 |

---

## 次のステップ

- [開発者ガイド](DEVELOPER_GUIDE.md) - 開発環境のセットアップ
- [運用ガイド](OPERATIONS.md) - デプロイ・監視
- [アーキテクチャ](ARCHITECTURE.md) - システム構成

---

Built with Claude Code
