# TAISUN Agent Plugin

Claude Code Plugin marketplace形式での配布設定。

## インストール方法

### 方法1: Pluginコマンド（推奨）

Claude Codeで以下を実行：

```bash
/plugin marketplace add taiyousan15/taisun_agent
/plugin install taisun-agent@taisun-agent
```

### 方法2: settings.jsonに追加

`~/.claude/settings.json`に以下を追加：

```json
{
  "extraKnownMarketplaces": {
    "taisun-agent": {
      "source": {
        "source": "github",
        "repo": "taiyousan15/taisun_agent"
      }
    }
  },
  "enabledPlugins": {
    "taisun-agent@taisun-agent": true
  }
}
```

## アップデート

```bash
/plugin update taisun-agent
```

## 含まれるコンポーネント

- **68 Skills**: マーケティング・コピーライティング・動画制作
- **85 Agents**: 開発・品質管理・運用
- **227 MCP Tools**: 外部サービス連携
- **13層防御システム**: AIの暴走防止

## 要件

- Claude Code v2.1.0以降

## 注意事項

- Rulesはプラグイン配布の制限により、手動インストールが必要な場合があります
- MCPサーバーのAPIキーは別途設定が必要です
