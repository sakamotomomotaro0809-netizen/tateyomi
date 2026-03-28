# TAISUN Agent はじめてガイド

このガイドでは、TAISUN Agentを初めて使用する方向けに、環境構築から基本的な使い方までを説明します。

## 目次

- [前提条件](#前提条件)
- [インストール](#インストール)
- [GitHub認証](#github認証)
- [GitHub CLI導入](#github-cli導入)
- [基本的な使い方](#基本的な使い方)
- [ロケール設定](#ロケール設定)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

### 必須ソフトウェア

| ソフトウェア | 必要バージョン | 確認コマンド |
|-------------|--------------|-------------|
| Node.js | 18.0.0 以上 | `node --version` |
| npm | 8.0.0 以上 | `npm --version` |
| Git | 2.0.0 以上 | `git --version` |

### 推奨ソフトウェア

| ソフトウェア | 用途 | インストール |
|-------------|-----|-------------|
| GitHub CLI (gh) | Issue/PR操作 | `brew install gh` |
| pnpm | 高速パッケージ管理 | `npm install -g pnpm` |

## インストール

### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/taisun_agent.git
cd taisun_agent
```

### 2. 依存関係をインストール

```bash
npm install
# または
pnpm install
```

### 3. 環境変数を設定

```bash
# .envファイルを作成
cp .env.example .env
```

`.env` ファイルを編集して必要な値を設定します：

```bash
# 必須
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx

# オプション（日本語でIssueログを出力する場合）
TAISUN_LOCALE=ja
```

### 4. ビルド

```bash
npm run build
```

## GitHub認証

TAISUN AgentはGitHubと連携して動作します。以下の手順でGitHub認証を設定してください。

### Personal Access Token (PAT) の作成

1. [GitHub Settings](https://github.com/settings/tokens) にアクセス
2. 「Generate new token (classic)」をクリック
3. 以下のスコープを選択：
   - `repo` - プライベートリポジトリへのアクセス
   - `workflow` - GitHub Actionsの操作
   - `read:org` - 組織情報の読み取り（組織リポジトリを使用する場合）
4. トークンを生成してコピー
5. `.env` ファイルに追加：

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```

### 確認方法

```bash
# トークンが設定されているか確認
echo $GITHUB_TOKEN

# GitHubへの接続テスト
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

## GitHub CLI導入

GitHub CLI (`gh`) を使用すると、コマンドラインからIssueやPRを操作できます。

### インストール

#### macOS

```bash
brew install gh
```

#### Windows

```bash
winget install GitHub.cli
# または
choco install gh
```

#### Linux (Debian/Ubuntu)

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### ログイン

```bash
gh auth login
```

対話形式で以下を選択：
1. GitHub.com
2. HTTPS
3. Login with a web browser（推奨）またはPaste an authentication token

### 確認方法

```bash
# ログイン状態を確認
gh auth status

# 正常な出力例：
# github.com
#   ✓ Logged in to github.com as your-username
#   ✓ Git operations for github.com configured to use https protocol.
```

## 基本的な使い方

### TAISUN Proxyの起動

```bash
# 開発モード
npm run proxy:dev

# 本番モード
npm run proxy:start
```

### スキルの実行

```bash
# PDF解析
/pdf-inspect /path/to/document.pdf

# セキュリティスキャン
/security-scan

# コードレビュー
/review-code
```

### エージェントの実行

```bash
# Issueの自動処理
/taiyou-agent

# ステータス確認
/taiyou-status
```

## ロケール設定

TAISUN AgentはIssueログやシステムメッセージを日本語または英語で出力できます。

### 設定方法

#### 方法1: 環境変数で設定（推奨）

```bash
# .envファイルに追加
TAISUN_LOCALE=ja  # 日本語
# または
TAISUN_LOCALE=en  # 英語
```

#### 方法2: 設定ファイルで設定

`config/proxy-mcp/logging.json` を作成：

```json
{
  "issueLogLocale": "ja"
}
```

### サポートされているロケール

| 値 | 説明 |
|----|-----|
| `ja` | 日本語（デフォルト） |
| `ja-JP` | 日本語 |
| `en` | 英語 |
| `en-US` | 英語 |

## トラブルシューティング

### GITHUB_TOKEN が未設定

**症状:**
```
⚠️ GITHUB_TOKEN が未設定です
```

**解決方法:**
1. [GitHub認証](#github認証) の手順に従ってトークンを作成
2. `.env` ファイルに `GITHUB_TOKEN=ghp_xxx` を追加
3. ターミナルを再起動するか、`source .env` を実行

### GitHub CLI がログインされていない

**症状:**
```
⚠️ GitHub CLI がログインされていません
```

**解決方法:**
```bash
gh auth login
```

### Node.js バージョンが不足

**症状:**
```
⚠️ Node.js バージョンが不足しています
現在のバージョン: v16.x.x
必要なバージョン: v18.0.0 以上
```

**解決方法:**

#### nvm を使用する場合
```bash
nvm install 18
nvm use 18
```

#### nodenv を使用する場合
```bash
nodenv install 18.0.0
nodenv global 18.0.0
```

#### 直接インストールする場合
[Node.js公式サイト](https://nodejs.org/) から最新のLTSバージョンをダウンロード

### ビルドエラー

**症状:**
```
error TS2xxx: ...
```

**解決方法:**
```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# ビルドキャッシュをクリア
rm -rf dist
npm run build
```

### MCP接続エラー

**症状:**
```
[proxy-mcp] Failed to connect to MCP server
```

**解決方法:**
1. MCPサーバーが起動しているか確認
2. `config/proxy-mcp/internal-mcps.json` の設定を確認
3. 必要な依存関係がインストールされているか確認

## 次のステップ

- [アーキテクチャドキュメント](./architecture.md) - システム設計の詳細
- [スキル一覧](../.claude/skills/) - 利用可能なスキル
- [エージェント一覧](../.claude/agents/) - 利用可能なエージェント
- [FAQ](./faq.md) - よくある質問

## サポート

問題が解決しない場合は、以下の方法でサポートを受けられます：

1. [GitHub Issues](https://github.com/your-org/taisun_agent/issues) で新しいIssueを作成
2. Slackの `#taisun-support` チャンネルで質問

---

*このドキュメントは TAISUN Agent P20 で追加されました。*
