# TAISUN v2 変更履歴

このファイルでは、TAISUN v2の全ての主要な変更を記録しています。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいています。

---

## [Unreleased]

### Added
- 新規ユーザー向けドキュメント
  - `QUICK_START.md` - 5分クイックスタート
  - `CONFIG.md` - 設定ガイド
  - `TROUBLESHOOTING.md` - トラブルシューティング
  - `CONTRIBUTING.md` - コントリビューションガイド
  - `SECURITY.md` - セキュリティポリシー

### Fixed
- CLAUDE.md/README.md の統計数値を修正
- Mac 重複ファイル ("* 2.*") を削除
- `.gitignore` に重複ファイルパターンを追加

---

## [2.0.0] - 2026-01-06

### Phase 20: Japanese i18n + Onboarding
- Issue ログの日本語国際化 (i18n)
- `TAISUN_LOCALE` 環境変数による言語切り替え
- 初心者向けセットアップガイド (`getting-started-ja.md`)
- `npm run doctor` 環境診断コマンド

### Phase 18: Scheduled Ops Jobs
- 日次/週次 Observability レポートの自動生成
- `ops-schedule.json` によるジョブ設定
- GitHub Issue へのレポート自動投稿
- `npm run ops:schedule:loop` スケジューラー常駐

### Phase 7.3: URL Bundle Pipeline
- Chrome タブからの一括スキル生成
- `web_skillize_from_tabs` ワンコマンドパイプライン
- URL 正規化とバッチ処理

### Phase 7: Chrome CDP Integration
- Playwright-core による既存 Chrome セッション再利用
- CDP (Chrome DevTools Protocol) バックエンド
- `list_tabs_urls` スキル

### Phase 6: Ops Hardening
- 本番環境有効化
- レジリエンス強化
- Observability レポート生成

### Phase 5: Internal MCP Standard
- 内部 MCP 標準化
- セッション再開機能
- イベントトラッキング

---

## [1.0.0] - 2025-12-XX

### Core Features

#### M1: Proxy MCP MVP
- 単一 MCP エントリーポイント実装
- 5 つのパブリックツール
  - `system_health` - ヘルスチェック
  - `skill_search` - スキル検索
  - `skill_run` - スキル実行
  - `memory_add` - コンテンツ保存
  - `memory_search` - コンテンツ検索

#### M2: Hybrid Router
- ルールベース + セマンティック検索のハイブリッドルーター
- 危険操作の自動検出・ブロック
- MCP サーバーの自動選択

#### M3: Memory System
- 短期/長期メモリ名前空間
- JSONL ストレージバックエンド
- 類似度検索

#### M4: Chrome Integration
- 最小限の Chrome 統合
- 3 つの Web スキル

#### M5: URL→Skillize
- URL からスキル自動生成
- テンプレート駆動生成

#### M6: Supervisor
- 人間承認フロー
- RUNLOG による操作ログ

### Infrastructure

#### Phase 1: Execution Foundation
- Gotenberg (HTML/PDF 変換)
- Stirling-PDF (PDF 操作)
- Makefile によるタスク実行

#### Monitoring Stack
- Prometheus メトリクス収集
- Grafana ダッシュボード
- Loki ログ集約
- Alertmanager アラート管理

### Agent System
- 75 専門エージェント
  - Coordinators (4)
  - Architecture & Design (6)
  - Development (6)
  - Quality Assurance (8)
  - Operations (8)
  - Documentation (3)
  - Analysis (4)
  - Specialized (5)
  - Multi-Agent (4)
  - Process (5)
  - Taiyou (6)
  - Others (16+)

### Skill System
- 56 スキル
  - Marketing & Sales (15)
  - Content Creation (10)
  - AI Image & Video (5)
  - Video Agent System (10)
  - Infrastructure (11)
  - Others (5+)

### MCP Integration
- 32 外部 MCP サーバー
- 227 MCP ツール
- Circuit Breaker パターン

### Testing
- 524 テスト (ユニット + 統合)
- 80%+ テストカバレッジ
- CI/CD パイプライン

---

## バージョニング

このプロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に従います:

- **MAJOR**: 後方互換性のない変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

---

## リリースプロセス

1. `CHANGELOG.md` を更新
2. バージョンをバンプ (`package.json`)
3. タグを作成 (`git tag v2.x.x`)
4. GitHub Release を作成

---

## 関連リンク

- [README](../README.md)
- [GitHub Releases](https://github.com/taiyousan15/taisun_agent/releases)
- [GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues)

---

*このファイルは各リリース時に更新されます。*
