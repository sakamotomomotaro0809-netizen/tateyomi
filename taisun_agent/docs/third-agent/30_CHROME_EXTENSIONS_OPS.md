# Chrome拡張運用（専用プロファイル）

このドキュメントは、**専用Chromeプロファイル（TAISUN用のデバッグ/自動化用プロファイル）**に
拡張機能（Umbrella / Linkclump / Link Grabber）を入れた前提で、
**リンク収集 → TAISUN（Proxy）に渡す**運用を標準化するための手順書です。

## 0. 前提（絶対に守る）

- **普段使いのChromeプロファイルは使わない**（ロック/破損/混線リスク）
- リモートデバッグや自動化を行う場合、デバッグポートは **localhost（127.0.0.1）に限定**
- **CAPTCHAやログインの強制突破はしない**
  検知したら止めて、人間が手動で解決してから再開する
- 大量URLをそのままチャットに貼り付けない
  **Proxy memory_add で保存し、refIdで参照**する

## 1. 対象拡張機能（役割）

### Umbrella - Copy All URLs
- **開いているタブのURLをまとめてコピー**する用途（タブ集合の収集に強い）

### Linkclump
- ページ内のリンクを**ドラッグで範囲選択**してまとめてコピー/オープンできる用途（狙った範囲だけ欲しいとき）

### Link Grabber
- ページ上のリンクを**一覧として抽出**する用途（ページ単位の収集に強い）

## 2. 専用プロファイルでChromeを起動する

TAISUNの運用では、拡張機能・ログイン状態を保持するために、**同じプロファイルディレクトリ**を使い続ける。

推奨:
- プロファイル: `~/.chrome-debug-profile`（例）
- デバッグポート: `9222`（例）

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=$HOME/.chrome-debug-profile \
  --remote-debugging-port=9222

# Linux
google-chrome \
  --user-data-dir=$HOME/.chrome-debug-profile \
  --remote-debugging-port=9222
```

## 3. 拡張機能のインストール（専用プロファイル側）

1. 専用プロファイルのChromeを起動
2. Chrome Web Store で以下を開く（手動でOK）
   - Umbrella - Copy All URLs V3
   - Linkclump Plus
   - Link Grabber
3. 「Chromeに追加」→ 権限を確認して追加
4. `chrome://extensions` を開き、3つが **有効**になっていることを確認
5. ツールバーに **ピン留め**（毎回探さないため）

### よくあるミス
- 普段のChromeで入れてしまう（プロファイルが違う）
- 専用プロファイルで起動したつもりが、別プロファイルだった

対策:
- 起動時の `--user-data-dir` を固定
- `chrome://version` で Profile Path を確認

## 4. 標準ワークフロー（リンク収集 → TAISUNへ投入）

### A) 「開いているタブ全部」を収集したい（Umbrella）

1. Umbrella で「全タブURLコピー」
2. URL一覧をそのままチャットに貼らず、まずTAISUNにこう依頼する：

**プロンプト例**
```
このURL一覧を memory_add で保存して refId を返して。
次に refId を使って重複除去・カテゴリ分けして。

[URL一覧をここに貼る]
```

3. 次に「URL→Skillize（dry-run）」を依頼する：
```
refId のURL一覧をもとに、テンプレ駆動でスキル候補を dry-run 生成して。
```

### B) 「ページ内のリンク」をまとめて収集したい（Link Grabber）

1. 対象ページを開く
2. Link Grabber でリンク一覧を抽出 → Copy
3. TAISUNへ依頼：
```
このリンク一覧を memory_add で保存→refId。
ドメイン別に整理して、重要ページだけ抽出して。

[リンク一覧]
```

### C) 「この範囲だけ」のリンクが欲しい（Linkclump）

1. Linkclump の設定で "Copy URLs" をアクションに設定（推奨）
2. 範囲選択でURLコピー
3. TAISUNへ依頼：
```
このリンク群を refId 化して、関連度で上位だけ残して。
残りは長期メモリに退避して。

[URL群]
```

## 5. コンテキスト圧迫を防ぐ運用ルール（重要）

- URLが多い場合（目安: 50〜100以上）は必ず **memory_add → refId** にする
- チャット本文には
  - 重要URL（数件）
  - refId
  - 目的（何をしたいか）
  だけを書く

## 6. CAPTCHA/ログインが出た場合

- 自動突破しない
- TAISUNは `require_human`（承認/手動対応が必要）で止める
- 人間がChromeで解決
- その後 "resume/再実行" で続行

## 7. トラブルシューティング

| 症状 | 原因 | 対策 |
|------|------|------|
| 拡張が見えない | 専用プロファイルで起動できていない | `chrome://version` の Profile Path を確認 |
| クリップボードに入らない | OS/ブラウザ/拡張の権限不足 | 各権限を確認 |
| 収集リンクが多すぎる | チャットに直接貼っている | memory_add を使う |
| Chromeがロックされる | 別プロセスが使用中 | プロセスを終了してから起動 |

## 8. セキュリティ注意

- 拡張はページ内容にアクセスできる場合がある
  → **信頼できるものだけ使う**
- デバッグポートを外部へ公開しない（**localhost限定**）
- トークン・DSN等は必ず **env / gitignored config** に置く
- 機密情報を含むページでの拡張使用は慎重に

## 関連ドキュメント

- [23_CHROME_INTEGRATION.md](./23_CHROME_INTEGRATION.md) - Chrome統合の技術詳細
- [22_MEMORY_SYSTEM.md](./22_MEMORY_SYSTEM.md) - memory_add/refId の仕組み
- [24_SKILLIZE.md](./24_SKILLIZE.md) - URL→Skill変換
