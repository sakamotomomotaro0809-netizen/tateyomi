# Claude Code パフォーマンスモード

## 概要

Claude Codeの「Cooking...」が長時間続く問題を解決するためのパフォーマンス最適化システムです。

## 問題の原因

通常設定では、各ツール使用時に多数のフックが順次実行されます：

| 状態 | フック数 | 最大タイムアウト |
|------|---------|----------------|
| 通常モード | 31 | 283秒 |
| **高速モード** | 5 | 21秒 |

**改善率: 93%のタイムアウト削減**

## 使い方

### モード切り替えコマンド

```bash
# 高速モード（推奨）- フック最小化
npm run perf:fast

# 通常モード - 全フック有効
npm run perf:normal

# 厳格モード - 全ガード有効（本番ワークフロー用）
npm run perf:strict

# 現在の状態を確認
npm run perf:status
```

### 各モードの特徴

| モード | フック数 | 用途 |
|--------|---------|------|
| `fast` | 5 | 日常の開発作業、高速な応答が必要な場合 |
| `normal` | 31 | バランスの取れた開発、中程度の保護 |
| `strict` | 31+ | 本番デプロイ、重要なワークフロー |

## 技術詳細

### 高速モードの最適化

1. **統合ガード（unified-guard.js）**
   - 複数のガードを1つに統合
   - 正規表現パターンを事前コンパイル
   - ファイルI/Oを最小化

2. **削除されたフック**
   - tmux-reminder.js
   - copy-safety-guard.js（統合ガードに含む）
   - workflow-guard-bash.sh
   - deviation-approval-guard.js
   - auto-memory-saver.js
   - session-issue-logger.js

3. **保持されたフック**
   - workflow-sessionstart-injector.js（セッション初期化）
   - unified-guard.js（統合ガード）
   - definition-lint-gate.js（定義検証）
   - session-handoff-generator.js（セッション引き継ぎ）

### 安全性の維持

高速モードでも以下の保護は維持されます：

- 危険なコマンドパターンの検出（rm -rf 等）
- 文字化け（U+FFFD）の検出
- 保護されたパスへの書き込み防止（.env, .git/ 等）
- コマンドインジェクションの警告

## 設定ファイル

| ファイル | 説明 |
|---------|------|
| `.claude/settings.json` | 現在アクティブな設定 |
| `.claude/settings.normal.json` | 通常モードのバックアップ |
| `.claude/settings.performance.json` | 高速モードの設定 |
| `.claude/settings.backup.json` | 直前の設定バックアップ |

## トラブルシューティング

### 高速モードで問題が発生した場合

```bash
# 通常モードに戻す
npm run perf:normal

# または手動で復元
cp .claude/settings.normal.json .claude/settings.json
```

### フック実行時間のデバッグ

```bash
# 環境変数を設定してデバッグ情報を表示
export TAISUN_HOOK_DEBUG=1
```

## 関連ドキュメント

- [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md) - コンテキスト管理
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - その他のトラブルシューティング
