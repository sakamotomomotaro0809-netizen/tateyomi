# MCP (Model Context Protocol) 設定ガイド

TAISUN v2 で使用する MCP サーバーの設定・運用ガイド。

## 概要

MCP (Model Context Protocol) は、Claude が外部サービスと連携するためのプロトコルです。
TAISUN v2 では以下のカテゴリの MCP サーバーを統合しています。

| カテゴリ | サーバー | 用途 |
|---------|---------|------|
| Database | postgres-ro, postgres-rw | データ分析、CRUD操作 |
| Development | github | Issue/PR管理、コード操作 |
| Productivity | notion | ナレッジ管理、ドキュメント |
| Communication | slack | 通知、チーム連携 |
| Infrastructure | docker | コンテナ管理 |
| Search | brave-search | Web検索 |
| Memory | memory | 永続的な知識グラフ |
| Reasoning | sequential-thinking | 複雑な問題解決 |

## クイックスタート

### 1. 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env

# 必要な認証情報を設定
vim .env
```

### 2. ヘルスチェックの実行

```bash
./scripts/mcp-health-check.sh
```

### 3. 動作確認

Claude Code で以下のように使用できます：

```
# GitHub Issue の一覧
「GitHubのオープンなIssueを表示して」

# PostgreSQL クエリ
「usersテーブルの件数を教えて」

# Notion 検索
「Notionでプロジェクト計画を検索して」
```

## サーバー別設定

### PostgreSQL

**Read-Only (推奨)**
```bash
POSTGRES_MCP_DSN=postgresql://readonly_user:password@localhost:5432/dbname
```

**Read-Write (注意: 変更操作が可能)**
```bash
POSTGRES_MCP_DSN_RW=postgresql://admin_user:password@localhost:5432/dbname
```

**関連スキル**: `postgres-mcp-analyst`

```
# 使用例
「先月の売上を集計して」
「ユーザー数の推移をクエリして」
```

### GitHub

**トークン作成手順**:
1. https://github.com/settings/tokens にアクセス
2. "Generate new token (classic)" をクリック
3. 必要なスコープを選択:
   - `repo` - リポジトリ操作
   - `read:org` - Organization読み取り
   - `write:discussion` - Discussion操作

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**使用例**:
```
「Issue #123 の詳細を表示」
「最近のPRをリストして」
「新しいIssueを作成: タイトル『バグ修正』」
```

### Notion

**インテグレーション作成手順**:
1. https://www.notion.so/my-integrations にアクセス
2. "New integration" をクリック
3. 名前とワークスペースを設定
4. 必要なページ/データベースに接続を許可

```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxx
```

**関連スキル**: `notion-knowledge-mcp`

**使用例**:
```
「プロジェクト計画のページを検索」
「議事録データベースに新しいエントリを追加」
```

### Slack

**アプリ作成手順**:
1. https://api.slack.com/apps にアクセス
2. "Create New App" → "From scratch"
3. Bot Token Scopes を設定:
   - `channels:read` - チャンネル読み取り
   - `chat:write` - メッセージ送信
   - `users:read` - ユーザー情報
4. ワークスペースにインストール

```bash
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx
SLACK_TEAM_ID=T0XXXXXXXXX
```

**使用例**:
```
「#general チャンネルにデプロイ完了を通知」
「最近のメンションを確認」
```

### Docker

**前提条件**: Docker Desktop または Docker Engine が起動していること

```bash
# Docker デーモンの確認
docker info
```

**関連スキル**: `docker-mcp-ops`

**使用例**:
```
「実行中のコンテナを一覧」
「nginx コンテナのログを表示」
「開発環境を docker-compose で起動」
```

### Brave Search

**APIキー取得**:
1. https://brave.com/search/api/ にアクセス
2. API プランを選択（Free tier あり）
3. APIキーを取得

```bash
BRAVE_API_KEY=BSAxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**使用例**:
```
「最新のReact 19の変更点を検索」
「競合他社のプレスリリースを調べて」
```

### Memory

外部設定不要。Claude の会話を超えて知識を保持します。

**使用例**:
```
「このプロジェクトの技術スタックを記憶して」
「以前話したアーキテクチャ決定を思い出して」
```

### Sequential Thinking

外部設定不要。複雑な問題を段階的に解決します。

**使用例**:
```
「このシステム設計の問題を段階的に分析して」
「デバッグ手順を論理的に整理して」
```

## トラブルシューティング

### 接続エラー

```bash
# 環境変数の確認
./scripts/mcp-health-check.sh

# 個別サーバーのテスト
npx -y @modelcontextprotocol/server-github --version
```

### 認証エラー

1. トークン/APIキーの有効期限を確認
2. 必要なスコープ/権限が付与されているか確認
3. .env ファイルの形式が正しいか確認

### パフォーマンス問題

- PostgreSQL: インデックスの確認、クエリ最適化
- Notion: 検索範囲の絞り込み
- Docker: 未使用コンテナの削除

## セキュリティ考慮事項

1. **トークンの管理**
   - `.env` は `.gitignore` に追加済み
   - 本番環境ではシークレット管理サービスを使用

2. **最小権限の原則**
   - PostgreSQL: 可能な限り read-only を使用
   - GitHub: 必要最小限のスコープ
   - Slack: 必要なチャンネルのみアクセス許可

3. **監査ログ**
   - MCP 操作はログに記録
   - 重要な操作は確認プロンプトを表示

## 関連リソース

- [MCP 公式ドキュメント](https://modelcontextprotocol.io/)
- [MCP サーバー一覧](https://github.com/modelcontextprotocol/servers)
- [Claude Code MCP 設定](https://docs.anthropic.com/claude-code/mcp)
