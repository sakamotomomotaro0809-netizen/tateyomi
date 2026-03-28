# 内部MCP追加チェックリスト

このチェックリストは、内部MCPを安全に追加するための標準手順です。
詳細は [27_INTERNAL_MCP_ADD_STANDARD.md](./27_INTERNAL_MCP_ADD_STANDARD.md) を参照。

## A. 追加前の確認（出所確認）

- [ ] MCPの出所を確認した（公式/OSS/作者/ライセンス）
- [ ] 既存のMCP/スキルで代替できないか検討した
- [ ] 追加する理由が1文で説明できる

## B. バージョン固定（供給網対策）

- [ ] 可能なら `@x.y.z` でバージョン固定した
- [ ] `npx -y package@latest` は避けた（supply chain risk）
- [ ] lockfile 経由でバージョン管理されている

## C. 環境変数（秘密情報）

- [ ] `requiredEnv` に必要な環境変数名を列挙した（値は書かない）
- [ ] `.env.example` に環境変数名を追記した
- [ ] 秘密情報はリポジトリにコミットしていない

## D. 危険操作の定義

- [ ] `dangerousOperations` を定義した
- [ ] 以下のカテゴリを確認した：
  - `delete` - 削除操作
  - `drop` / `truncate` - DB破壊操作
  - `force-push` / `archive` - Git破壊操作
  - `admin` / `billing` / `deploy` / `secret` - 権限/課金/本番操作
- [ ] Deny カテゴリ（captcha/bypass/spam）は含めていない

## E. 設定ファイルへの追加

- [ ] `config/proxy-mcp/internal-mcps.json` に定義を追加した
- [ ] repo上では `enabled: false` にした
- [ ] ローカルでは `internal-mcps.local.json` で `enabled: true` にした
- [ ] `tags` と `shortDescription` を設定した（Router判定用）

## F. 動作確認

- [ ] `npm run proxy:smoke` が通る
- [ ] tools/list で追加したMCPのツールが見える（enabled時）
- [ ] 簡単な read-only 操作で動作確認した
- [ ] 危険操作で Supervisor が承認を要求することを確認した

## G. 観測の確認

- [ ] 呼び出し時にイベントが記録される
- [ ] 失敗時にエラー種別が分類される

## H. 失敗時の切り分け

エラーが出た場合、以下を確認：

| エラー種別 | 確認項目 |
|-----------|---------|
| 起動不可 | command/args が正しいか、パッケージがインストールされているか |
| 認証不可 | requiredEnv が設定されているか、値が正しいか |
| 権限不足 | トークンの権限スコープを確認 |
| レート制限 | API制限に達していないか、リトライポリシーを確認 |
| タイムアウト | ネットワーク接続、タイムアウト設定を確認 |

## I. ログ・運用

- [ ] Issue を作って作業を開始した
- [ ] PR に Issue 番号をリンクした
- [ ] マージ後、Issue に結果を追記した
