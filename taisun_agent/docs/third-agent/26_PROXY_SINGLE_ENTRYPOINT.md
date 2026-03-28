# Phase 4: Proxy Single Entrypoint

## 概要

Claude Code が接続する MCP サーバーを **taisun-proxy 1本のみ** に統一する設計。
これにより、Claude 側のコンテキスト圧迫を大幅に軽減する。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│                         │                                    │
│                         ▼                                    │
│              ┌─────────────────────┐                         │
│              │   taisun-proxy      │  ← 唯一の MCP 接続      │
│              │   (5 tools)         │                         │
│              └─────────────────────┘                         │
│                         │                                    │
│         ┌───────────────┼───────────────┐                    │
│         ▼               ▼               ▼                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Router    │ │   Memory    │ │  Skillize   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             Internal MCP Registry                    │    │
│  │  (filesystem, postgres, docker, github, etc.)        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 設定ファイル

### `.mcp.json` (Claude が読み込む)

```json
{
  "mcpServers": {
    "taisun-proxy": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/proxy-mcp/server.js"],
      "disabled": false,
      "description": "TAISUN Proxy MCP (single entrypoint)"
    }
  }
}
```

### `.mcp.full.json` (バックアップ/参照用)

元の32サーバー設定を保持。内部テストやデバッグ時に参照可能。

## 公開ツール (5個のみ)

| Tool | 説明 |
|------|------|
| `system_health` | Proxy の動作確認 |
| `skill_search` | スキル検索 |
| `skill_run` | スキル実行 |
| `memory_add` | 大きなコンテンツを保存し refId を返す |
| `memory_search` | refId またはキーワードで検索 |

## セキュリティ

- 危険操作（デプロイ、削除、課金、秘密情報）は Supervisor の human approval 経由
- CAPTCHA回避・不正アクセス・スパム等の自動化濫用は deny のまま維持

## 内部 MCP の追加方法

新しい MCP を追加する場合は `.mcp.json` ではなく、内部レジストリに登録する。

詳細: [10_CHECKLIST_ADD_MCP.md](./10_CHECKLIST_ADD_MCP.md)

## スキルの追加方法

スキルは `.claude/skills/` に配置し、Proxy の skill registry 経由で運用。

詳細: [11_CHECKLIST_ADD_SKILL.md](./11_CHECKLIST_ADD_SKILL.md)

## ビルド・テスト

```bash
# Proxy ビルド
npm run proxy:build

# スモークテスト
npm run proxy:smoke

# 開発モード
npm run proxy:start
```

## FAQ

### Q: 元の MCP 設定に戻したい場合は？

`.mcp.full.json` の内容を `.mcp.json` にコピーする。
ただし、コンテキスト圧迫が再発するため非推奨。

### Q: 特定の MCP だけ追加したい場合は？

内部レジストリ経由で追加する。Claude 側の露出は増やさない。

### Q: Proxy が起動しない場合は？

```bash
# ビルド確認
npm run proxy:build

# dist/proxy-mcp/server.js が存在するか確認
ls dist/proxy-mcp/server.js

# スモークテスト
npm run proxy:smoke
```
