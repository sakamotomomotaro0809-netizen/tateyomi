# 28. Production Enablement & Rollback

## Overview

内部MCPの本番有効化とロールバックの標準手順。

## 原則

1. **Repo上はenabled=false** - 安全デフォルト維持
2. **Overlayで有効化** - 環境ごとの設定ファイル（gitignore）
3. **Canaryで段階展開** - 5% → 25% → 100%
4. **即ロールバック** - overlay変更 + Proxy再起動

## Overlay構成

```
config/proxy-mcp/
├── internal-mcps.json           # base（repo管理、全てdisabled）
├── internal-mcps.local.json     # ローカル開発用（gitignore）
├── internal-mcps.staging.json   # ステージング用（gitignore）
└── internal-mcps.prod.json      # 本番用（gitignore）
```

### Overlay優先度

1. `TAISUN_INTERNAL_MCPS_OVERLAY_PATH` 環境変数で指定されたファイル
2. `internal-mcps.local.json`（存在すれば）
3. `internal-mcps.json`（base）

## Rollout設定

```json
{
  "mcps": [
    {
      "name": "github",
      "enabled": true,
      "rollout": {
        "mode": "canary",
        "canaryPercent": 5,
        "allowlist": {
          "runIds": ["run-xxx-123"]
        }
      }
    }
  ]
}
```

### Rollout Modes

| Mode | 説明 |
|------|------|
| `off` | 完全無効（enabled=trueでも無効） |
| `canary` | canaryPercent%のrunIdに対して有効 |
| `full` | 全runIdに対して有効 |

### Canary判定ロジック

```typescript
// runId + mcpName をsha256ハッシュして0-99に変換
// canaryPercent未満なら有効
const hash = sha256(`${runId}:${mcpName}`);
const bucket = parseInt(hash.slice(0, 8), 16) % 100;
return bucket < canaryPercent;
```

同じrunIdなら毎回同じ判定（再現可能）。

## 本番有効化手順

### 1. Overlayファイル作成

```bash
# 本番サーバー上で
cp config/proxy-mcp/internal-mcps.prod.example.json /etc/taisun/internal-mcps.prod.json
# 編集して必要なMCPを設定
```

### 2. 環境変数設定

```bash
export TAISUN_INTERNAL_MCPS_OVERLAY_PATH=/etc/taisun/internal-mcps.prod.json
```

### 3. Canary 5%で開始

```bash
npm run internal-mcp:rollout -- --overlay /etc/taisun/internal-mcps.prod.json --mcp github --mode canary --percent 5
```

### 4. 観測確認

- 失敗率
- レイテンシ（p95）
- Circuit open回数

### 5. 段階拡大

```bash
# 25%
npm run internal-mcp:rollout -- --overlay /etc/taisun/internal-mcps.prod.json --mcp github --mode canary --percent 25

# 100%
npm run internal-mcp:rollout -- --overlay /etc/taisun/internal-mcps.prod.json --mcp github --mode full
```

## ロールバック手順

### 即時ロールバック

```bash
# 方法1: mode=offに戻す
npm run internal-mcp:rollout -- --overlay /etc/taisun/internal-mcps.prod.json --mcp github --mode off

# 方法2: バックアップから復元
cp /etc/taisun/internal-mcps.prod.json.bak /etc/taisun/internal-mcps.prod.json

# Proxy再起動
systemctl restart taisun-proxy  # または pm2 restart proxy
```

### CLIバックアップ

rollout CLIは変更前に自動で `.bak` ファイルを作成する。

## 注意事項

- overlayファイルは絶対にgitにコミットしない
- GITHUB_TOKEN等の秘密情報は.envで管理
- 本番変更は必ずcanaryから開始
- 問題発生時は即ロールバック優先
