# RUNBOOK: TAISUN v2 Sub-Agent Suite

## 概要

TAISUN v2には、システム開発とビジネス/マーケティングをカバーする**69の専門エージェント**と**24のスキル**が配置されています。

## クイックスタート

### 1. 個別エージェントの実行

```bash
# システム設計
Task(subagent_type="system-architect", prompt="マイクロサービス設計...")

# バックエンド実装
Task(subagent_type="backend-developer", prompt="認証API実装...")

# フロントエンド実装
Task(subagent_type="frontend-developer", prompt="ダッシュボードUI...")

# コードレビュー
Task(subagent_type="code-reviewer", prompt="PRレビュー...")

# テスト生成
Task(subagent_type="test-generator", prompt="ユニットテスト作成...")
```

### 2. スキル実行

```bash
# 画像生成
/gemini-image-generator thumbnail "YouTube動画タイトル"

# LP作成
/lp-generator normal --product "オンライン講座"

# ファネル構築
/funnel-builder kindle --product "電子書籍"

# セールスレター
/sales-letter --product "コーチングプログラム"
```

### 3. 統合ワークフロー

```bash
# コードレビュー＋品質チェック
/review-code

# セキュリティスキャン
/scan-security

# ドキュメント生成
/write-docs

# テスト実行
/generate-tests
```

## エージェント一覧

### Coordinators（オーケストレーション）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| ait42-coordinator | メインコーディネーター | No |
| ait42-coordinator-fast | 軽量O(1)選択 | No |
| omega-aware-coordinator | Ω関数理論ベース | No |
| self-healing-coordinator | 自己修復システム | No |

### Architecture & Design（設計）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| system-architect | システムアーキテクチャ | Yes |
| api-designer | API設計 | Yes |
| database-designer | データベース設計 | Yes |
| security-architect | セキュリティ設計 | Yes |
| cloud-architect | クラウドアーキテクチャ | Yes |
| ui-ux-designer | UI/UX設計 | Yes |

### Development（開発）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| backend-developer | バックエンド実装 | Yes |
| frontend-developer | フロントエンド実装 | Yes |
| api-developer | API実装 | Yes |
| database-developer | データベース実装 | Yes |
| integration-developer | 統合実装 | Yes |
| migration-developer | マイグレーション | Yes |

### Quality Assurance（品質保証）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| code-reviewer | コードレビュー | No |
| test-generator | テスト生成 | Yes |
| qa-validator | 品質検証 | No |
| integration-tester | 統合テスト | Yes |
| security-tester | セキュリティテスト | No |
| performance-tester | パフォーマンステスト | No |
| mutation-tester | ミューテーションテスト | Yes |
| chaos-engineer | カオスエンジニアリング | Yes |

### Operations（運用）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| devops-engineer | DevOps | Yes |
| cicd-manager | CI/CDパイプライン | Yes |
| monitoring-specialist | 監視・オブザーバビリティ | Yes |
| incident-responder | インシデント対応 | Yes |
| backup-manager | バックアップ管理 | Yes |
| container-specialist | コンテナ最適化 | Yes |
| config-manager | 設定管理 | Yes |
| release-manager | リリース管理 | Yes |

### Documentation（ドキュメント）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| tech-writer | 技術文書 | Yes |
| doc-reviewer | ドキュメントレビュー | No |
| knowledge-manager | ナレッジ管理 | Yes |

### Analysis（分析）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| complexity-analyzer | 複雑度分析 | No |
| feedback-analyzer | フィードバック分析 | Yes |
| innovation-scout | 技術トレンド分析 | No |
| learning-agent | 学習キャプチャ | Yes |

### Specialized（特化型）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| bug-fixer | バグ修正 | Yes |
| refactor-specialist | リファクタリング | Yes |
| feature-builder | 新機能実装 | Yes |
| script-writer | スクリプト作成 | Yes |
| implementation-assistant | 実装支援 | Yes |

### Multi-Agent Modes（マルチエージェント）

| エージェント | 役割 | 書込可 |
|------------|------|--------|
| multi-agent-competition | 競争モード | Yes |
| multi-agent-debate | 討論モード | No |
| multi-agent-ensemble | アンサンブルモード | Yes |
| reflection-agent | 品質ゲーティング | No |

## スキル一覧

### Marketing & Content

| スキル | 役割 |
|--------|------|
| copywriting-helper | コピーライティング支援 |
| sales-letter | セールスレター作成 |
| step-mail | ステップメール作成 |
| vsl | ビデオセールスレター |
| launch-video | ローンチ動画 |
| lp-generator | LP作成（統合） |
| funnel-builder | ファネル構築（統合） |
| mendan-lp | 面談LP作成 |
| lp-analysis | LP分析 |
| customer-support | カスタマーサポート |
| tommy-style | トミースタイル |

### Creative & Media

| スキル | 役割 |
|--------|------|
| gemini-image-generator | 画像生成（統合） |
| japanese-tts-reading | 日本語TTS |
| nanobanana-prompts | プロンプト生成 |

### Infrastructure & Automation

| スキル | 役割 |
|--------|------|
| workflow-automation-n8n | n8nワークフロー |
| docker-mcp-ops | Dockerオペレーション |
| security-scan-trivy | セキュリティスキャン |
| pdf-automation-gotenberg | PDF自動化 |
| doc-convert-pandoc | ドキュメント変換 |
| unified-notifications-apprise | 通知統合 |
| postgres-mcp-analyst | PostgreSQL分析 |
| notion-knowledge-mcp | Notionナレッジ |
| nlq-bi-wrenai | 自然言語BI |

### Research

| スキル | 役割 |
|--------|------|
| research-cited-report | 出典付きリサーチ |

## セキュリティ注意事項

### 破壊的操作は承認必須

以下の操作は必ずユーザー承認を得てから実行：

- `git commit` / `git push`
- `deploy` (本番環境)
- データベース書き込み
- クラウドリソース変更
- 決済システム変更

### 機密情報の管理

- APIキー/トークンは `.env` と環境変数で管理
- `.env` は **Git管理しない**（.gitignoreに含まれる）
- チャット出力に機密情報を含めない

### 書込制限

Write/Edit を持つエージェントは以下のパスのみ書き込み可能：

- ソースコード: `src/`, `lib/`, `app/`
- テスト: `tests/`, `test/`
- ドキュメント: `docs/`
- 設定: `config/`
- メモリバンク: `.claude/memory/`

## 品質ゲート

| 項目 | 基準 |
|------|------|
| コードレビュースコア | 80点以上 |
| テストカバレッジ | 80%以上 |
| セキュリティスキャン | Critical/Highゼロ |

## トラブルシューティング

### テストが失敗する場合

1. `test-generator` でテストを再生成
2. `bug-fixer` で自動修復を試行
3. `reflection-agent` で品質チェック
4. 修復不可の場合は原因を整理してユーザーに報告

### エージェントが動かない場合

1. ツール権限を確認（Read-only エージェントは書き込み不可）
2. MCP連携を確認（`.mcp.json` の設定）
3. 環境変数を確認（`.env` の設定）
4. メモリシステムを確認（`.claude/memory/config.yaml`）

### パフォーマンスが遅い場合

1. `ait42-coordinator-fast` を使用（軽量版）
2. 並列実行を活用（独立タスクは同時実行）
3. 不要なエージェント呼び出しを削減

## ファイル構成

```
taisun_v2/
├── .claude/
│   ├── CLAUDE.md             # プロジェクト指示書
│   ├── settings.json         # 設定
│   ├── agents/               # 69エージェント定義
│   ├── commands/             # 46コマンド定義
│   ├── skills/               # 24スキル定義
│   └── memory/               # 学習・統計システム
│       ├── config.yaml       # メモリ設定
│       ├── agents/           # エージェント統計
│       └── tasks/            # タスク履歴
├── .mcp.json                 # MCP設定
├── .env                      # 環境変数（Git管理外）
├── .env.example              # 環境変数テンプレート
├── docs/
│   └── RUNBOOK.md            # 本ファイル
├── src/                      # ソースコード
├── scripts/                  # ユーティリティ
└── config/                   # 設定ファイル
```

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v2.0.0 | 2024-12-22 | TAISUN v2統合版リリース |
