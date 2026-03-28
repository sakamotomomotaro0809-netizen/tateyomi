# Checklist: Chrome拡張（専用プロファイル）運用

Chrome拡張機能を使ったリンク収集→TAISUN投入のチェックリスト。

詳細手順: [30_CHROME_EXTENSIONS_OPS.md](./30_CHROME_EXTENSIONS_OPS.md)

## セットアップ

- [ ] 専用プロファイルでChromeを起動できる（`chrome://version` で Profile Path 確認済み）
- [ ] Umbrella / Linkclump / Link Grabber を専用プロファイルにインストール
- [ ] `chrome://extensions` で 3つとも有効
- [ ] ツールバーにピン留め
- [ ] 普段使いのプロファイルと混同していない

## 収集 → TAISUN投入

- [ ] URLが多い場合（50件以上）は本文に貼らず `memory_add → refId` を使う
- [ ] refId を使って重複除去・ドメイン別分類を実施
- [ ] URL→Skillize は `dry-run` をデフォルトにする（必要なら `confirmWrite`）
- [ ] チャット本文には「重要URL数件 + refId + 目的」のみ記載

## 安全

- [ ] CAPTCHA/ログイン要求は自動突破しない（手動対応→再実行）
- [ ] デバッグポートは localhost（127.0.0.1）限定
- [ ] 重要アカウントは専用プロファイルで運用（混線させない）
- [ ] 機密情報を含むページでの拡張使用は慎重に
- [ ] トークン・認証情報は env / gitignored config に保管

## トラブル時

- [ ] 拡張が見えない → `chrome://version` で Profile Path 確認
- [ ] クリップボードに入らない → OS/ブラウザ/拡張の権限確認
- [ ] Chromeロック → 他プロセス終了後に再起動
