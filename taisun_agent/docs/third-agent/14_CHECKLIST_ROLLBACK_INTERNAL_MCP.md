# 14. Checklist: Rollback Internal MCP

## A. 問題検知

- [ ] 失敗率が閾値を超えた
- [ ] レイテンシが異常に高い
- [ ] Circuit openが発生
- [ ] ユーザーから障害報告

## B. 即時ロールバック（5分以内目標）

### 方法1: CLIで無効化

```bash
npm run internal-mcp:rollout -- --overlay <path> --mcp <name> --mode off
```

### 方法2: バックアップから復元

```bash
cp <overlay>.bak <overlay>
```

### 方法3: overlayファイル削除

```bash
mv <overlay> <overlay>.disabled
```

## C. Proxy再起動

```bash
# systemd
systemctl restart taisun-proxy

# pm2
pm2 restart proxy

# Docker
docker-compose restart proxy
```

## D. 復旧確認

- [ ] smoke testが通る
- [ ] system_healthが"healthy"
- [ ] 対象MCPがdisabledになっている
- [ ] エラーが止まった

## E. 事後対応

- [ ] RUNLOGに障害記録
- [ ] 原因調査
- [ ] 再発防止策検討
- [ ] 日次レポートで安定確認

## 緊急連絡先

- Proxy担当: TBD
- インフラ担当: TBD
