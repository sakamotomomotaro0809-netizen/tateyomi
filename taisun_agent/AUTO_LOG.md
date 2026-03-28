# 自動ログシステム

## 概要

このプロジェクトには、作業ログを自動的にGitHub Issueに記録するシステムが組み込まれています。

## 機能

### 1. 手動ログ作成

スクリプトを直接実行して、任意のタイミングでログをIssueに作成できます。

```bash
# デフォルトのログを作成
./scripts/log-to-issue.sh

# カスタムタイトルとメッセージでログを作成
./scripts/log-to-issue.sh "カスタムタイトル" "カスタムメッセージ"
```

### 2. 自動ログ作成（GitHub Actions）

以下のタイミングで自動的にログがIssueとして作成されます：

- **毎日**: 日本時間 18:00（UTC 09:00）に自動実行
- **プッシュ時**: mainブランチにプッシュされたとき
- **手動実行**: GitHub Actionsから手動でトリガー可能

### 3. ログに含まれる情報

自動生成されるログには以下の情報が含まれます：

- 実行日時
- 最近のコミット（過去24時間）
- 現在のgit status
- テスト結果（利用可能な場合）

## GitHub Actionsでの手動実行

1. GitHubリポジトリの「Actions」タブを開く
2. 「Auto Log to Issue」ワークフローを選択
3. 「Run workflow」をクリック
4. 必要に応じてタイトルとメッセージをカスタマイズ
5. 「Run workflow」で実行

## ログの保存場所

- **GitHub Issue**: https://github.com/taiyousan15/testikeda/issues
- **ローカルファイル**: `logs/log-YYYY-MM-DD.md`

## 環境変数

スクリプトでは以下の環境変数をカスタマイズ可能です：

- `LOG_DIR`: ログファイルの保存ディレクトリ（デフォルト: `./logs`）

```bash
# カスタムログディレクトリを使用
LOG_DIR=/path/to/logs ./scripts/log-to-issue.sh
```

## 必要な権限

- GitHub CLI (`gh`)がインストールされていること
- リポジトリへの書き込み権限
- GitHub Issueへの作成権限

## トラブルシューティング

### GitHub CLI認証エラー

```bash
gh auth login
```

### 権限エラー

スクリプトに実行権限がない場合：

```bash
chmod +x scripts/log-to-issue.sh
```

## カスタマイズ

`scripts/log-to-issue.sh`を編集することで、ログの内容やフォーマットをカスタマイズできます。

## 例

### シンプルな実行例

```bash
./scripts/log-to-issue.sh
```

出力:
```
ログを保存しました: ./logs/log-2026-01-08.md
GitHub Issueを作成中...
✅ Issue作成完了: https://github.com/taiyousan15/testikeda/issues/2
```
