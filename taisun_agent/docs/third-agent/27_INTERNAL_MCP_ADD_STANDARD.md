# Phase 5: Internal MCP Add Standard

## 概要

内部MCPの追加は、Claude Code 側の露出を増やさずに機能を拡張するための標準手順です。
すべての内部MCPは `skill.run` 経由でのみ利用され、危険操作は Supervisor で承認を要求します。

## 原則

1. **Claude側のMCP露出は増やさない** - 入口は Proxy 1本のまま
2. **内部MCPは internal-mcps.json に追加** - skill.run 経由でのみ利用
3. **危険操作は Supervisor で必ず止める** - 承認なしで実行しない
4. **Minimal Output** - summary + refId を基本、全文は memory に退避
5. **CI を壊さない** - 秘密情報必須のMCPはデフォルト無効 (enabled=false)
6. **バージョン固定** - npx latest は供給網リスクがあるため避ける

## 設定ファイル構造

### config/proxy-mcp/internal-mcps.json

リポジトリにコミットされる設定。デフォルトで全て `enabled: false`。

```json
{
  "version": "1.0.0",
  "mcps": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@1.2.0"],
      "enabled": false,
      "versionPin": "1.2.0",
      "requiredEnv": ["GITHUB_TOKEN"],
      "tags": ["vcs", "issues", "pr", "repository"],
      "shortDescription": "GitHub issues, PRs, repository management",
      "dangerousOperations": ["delete", "force-push", "archive", "admin"],
      "allowlist": ["get_*", "list_*", "search_*", "create_issue", "create_pr"]
    }
  ],
  "routerConfig": {
    "ruleFirst": true,
    "semanticThreshold": 0.7,
    "topK": 5,
    "fallback": "require_clarify"
  }
}
```

### config/proxy-mcp/internal-mcps.local.json

ローカル/本番でのみ使用。**gitignore に追加**。

```json
{
  "mcps": [
    {
      "name": "github",
      "enabled": true
    }
  ]
}
```

## MCP定義フィールド

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | ✓ | MCP識別子（一意） |
| `transport` | ✓ | `stdio`, `sse`, `http` |
| `command` | stdio時 | 実行コマンド |
| `args` | stdio時 | コマンド引数 |
| `endpoint` | sse/http時 | 接続URL |
| `enabled` | ✓ | 有効/無効（repoでは常にfalse） |
| `versionPin` | 推奨 | バージョン固定（supply chain対策） |
| `requiredEnv` | 推奨 | 必要な環境変数（名前のみ） |
| `tags` | ✓ | セマンティックルーティング用タグ |
| `shortDescription` | ✓ | 短い説明（ルーティング判断用） |
| `dangerousOperations` | ✓ | 危険操作リスト（Supervisor判定用） |
| `allowlist` | 推奨 | 許可するツール名パターン |

## 危険操作カテゴリ

以下の操作は Supervisor で必ず承認を要求：

| カテゴリ | 例 |
|---------|-----|
| `delete` | ファイル削除、Issue削除、PR削除 |
| `drop` | テーブル削除、データベース削除 |
| `truncate` | テーブル全削除 |
| `force-push` | Git強制プッシュ |
| `archive` | リポジトリアーカイブ |
| `admin` | 管理者権限操作 |
| `billing` | 課金関連操作 |
| `deploy` | 本番デプロイ |
| `secret` | 秘密情報操作 |

## Deny カテゴリ（実行禁止）

以下は Supervisor でも承認できない（自動化濫用防止）：

- `captcha` - CAPTCHA回避
- `bypass` - セキュリティ回避
- `spam` - スパム送信
- `scrape_private` - 非公開データスクレイピング

## 観測項目

すべての内部MCP呼び出しは自動的に記録：

- `timestamp` - 呼び出し日時
- `runId` - 実行ID
- `mcpName` - MCP名
- `toolName` - ツール名
- `status` - ok/fail
- `durationMs` - 実行時間
- `errorType` - エラー種別

## 関連ドキュメント

- [12_CHECKLIST_ADD_INTERNAL_MCP.md](./12_CHECKLIST_ADD_INTERNAL_MCP.md) - チェックリスト
- [26_PROXY_SINGLE_ENTRYPOINT.md](./26_PROXY_SINGLE_ENTRYPOINT.md) - Proxy 1本化設計
- [25_SUPERVISOR.md](./25_SUPERVISOR.md) - Supervisor設計
