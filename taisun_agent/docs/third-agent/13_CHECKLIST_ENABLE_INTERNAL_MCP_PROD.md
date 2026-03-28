# 13. Checklist: Enable Internal MCP in Production

## A. 事前確認

- [ ] 対象MCPがステージングで十分テスト済み
- [ ] requiredEnvが本番環境に設定済み
- [ ] 本番overlayファイルが準備済み（gitignore対象）
- [ ] ロールバック手順を確認済み
- [ ] 監視ダッシュボード/アラートが準備済み

## B. Overlay準備

- [ ] overlayファイルをコピー
  ```bash
  cp internal-mcps.prod.example.json /etc/taisun/internal-mcps.prod.json
  ```
- [ ] 対象MCPの設定を編集
- [ ] rollout.mode = "canary", canaryPercent = 5 で開始

## C. 環境変数設定

- [ ] TAISUN_INTERNAL_MCPS_OVERLAY_PATH を設定
- [ ] Proxy再起動

## D. Canary 5%

- [ ] CLIで有効化
  ```bash
  npm run internal-mcp:rollout -- --overlay <path> --mcp <name> --mode canary --percent 5
  ```
- [ ] 15分間観測
  - [ ] 失敗率 < 1%
  - [ ] p95レイテンシ正常範囲
  - [ ] Circuit open = 0

## E. Canary 25%

- [ ] 問題なければ拡大
- [ ] 30分間観測

## F. Full (100%)

- [ ] 問題なければfullに
- [ ] 1時間観測

## G. 完了確認

- [ ] 日次レポートで安定確認
- [ ] RUNLOGに結果記録
- [ ] チームに通知
