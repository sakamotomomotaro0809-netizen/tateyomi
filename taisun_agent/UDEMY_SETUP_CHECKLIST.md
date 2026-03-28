# Udemy文字起こし - セットアップチェックリスト

## ✅ セットアップ手順（5分で完了）

### □ ステップ1: Chrome拡張機能のインストール

1. Chrome ウェブストアにアクセス
2. 「Get cookies.txt LOCALLY」を検索
3. 「Chromeに追加」をクリック

**直リンク**: https://chrome.google.com/webstore/detail/cclelndahbckbenkjhflpdbgdldlbecc

---

### □ ステップ2: Udemyにログイン

1. https://www.udemy.com にアクセス
2. 自分のアカウントでログイン
3. ログイン状態を確認（右上にプロフィールアイコン）

---

### □ ステップ3: Cookieをエクスポート

1. Udemyのページで拡張機能アイコンをクリック
   - ブラウザ右上のパズルアイコン → 「Get cookies.txt LOCALLY」
2. 「Export」ボタンをクリック
3. `cookies.txt` ファイルがダウンロードされます

---

### □ ステップ4: Cookieファイルを配置

```bash
# ダウンロードフォルダから移動
mv ~/Downloads/cookies.txt /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent/cookies.txt

# 権限を設定（セキュリティ）
chmod 600 /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent/cookies.txt
```

または、Finderでファイルを直接移動してもOK

---

### □ ステップ5: 動作テスト

```bash
# taisun_agentディレクトリに移動
cd /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent

# 1つの動画でテスト
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/autowebinar/learn/lecture/45461633"
```

---

## 🎯 次のステップ

### オプションA: 単一動画の文字起こし

```bash
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/xxx/learn/lecture/XXXXX"
```

### オプションB: コース全体の文字起こし

```bash
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/autowebinar/"
```

### オプションC: 音声認識を使用（字幕がない場合）

```bash
./scripts/udemy-transcribe.sh -a "https://www.udemy.com/course/xxx/learn/lecture/XXXXX"
```

---

## ⚠️ トラブルシューティング

### エラー: Cookieファイルが見つかりません

- [ ] `cookies.txt` が正しいディレクトリにあるか確認
- [ ] ファイル名が正確に `cookies.txt` か確認（拡張子に注意）

### エラー: ダウンロードに失敗しました

- [ ] Udemyに正しくログインしているか確認
- [ ] Cookieを再エクスポート（有効期限切れの可能性）
- [ ] URLが正しいか確認

---

## 📚 詳細ドキュメント

完全なガイド: `docs/udemy-transcribe-guide.md`

---

**所要時間**: 初回セットアップ 5分 + 各動画 1-5分（字幕ダウンロード）
**作成日**: 2026-01-09
