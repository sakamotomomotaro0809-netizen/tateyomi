# Udemy 動画文字起こしガイド

## ⚠️ 重要な注意事項

### 使用条件（必読）

✅ **許可される使用**:
- 自分が購入したコースの動画
- 個人的な学習・復習目的
- ノート作成・理解促進

❌ **禁止される使用**:
- 他人のアカウントを使用
- ダウンロードしたコンテンツの再配布
- 商用利用
- 著作権侵害行為

**Udemy利用規約を必ず確認してください**: https://www.udemy.com/terms/

---

## 📋 セットアップ手順

### ステップ1: 必要なツールの確認

すでにインストール済みのツール:
- ✅ `yt-dlp` - 動画・字幕ダウンローダー
- ✅ `whisper` - AI音声認識

### ステップ2: ブラウザCookieのエクスポート

#### Chrome拡張機能を使う方法（推奨）

1. **拡張機能のインストール**
   - Chrome ウェブストアで「Get cookies.txt LOCALLY」を検索
   - インストール: https://chrome.google.com/webstore/detail/cclelndahbckbenkjhflpdbgdldlbecc

2. **Udemyにログイン**
   - https://www.udemy.com にアクセス
   - 通常通りログイン

3. **Cookieをエクスポート**
   - Udemyのページで拡張機能アイコンをクリック
   - 「Export」ボタンをクリック
   - `cookies.txt` として保存

4. **ファイルを配置**
   ```bash
   # taisun_agentディレクトリに配置
   mv ~/Downloads/cookies.txt /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent/cookies.txt
   ```

#### 手動でCookieを取得する方法

1. Chrome DevToolsを開く（F12）
2. Application タブ → Cookies → https://www.udemy.com
3. 必要なCookieをコピー（複雑なため非推奨）

---

## 🚀 使い方

### 基本的な使い方

#### 1. 単一動画の文字起こし

```bash
cd /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent

./scripts/udemy-transcribe.sh "https://www.udemy.com/course/autowebinar/learn/lecture/45461633"
```

#### 2. コース全体の文字起こし

```bash
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/autowebinar/"
```

#### 3. 音声認識を使用（字幕がない場合）

```bash
./scripts/udemy-transcribe.sh -a "https://www.udemy.com/course/autowebinar/learn/lecture/45461633"
```

### オプション

```bash
./scripts/udemy-transcribe.sh [オプション] <UDEMY_URL>

オプション:
  -o DIR      出力ディレクトリ (デフォルト: ./udemy-transcripts)
  -c FILE     Cookieファイル (デフォルト: ./cookies.txt)
  -l LANG     字幕言語 (デフォルト: ja,en)
  -a          音声認識を使用 (字幕がない場合)
  -h          ヘルプを表示
```

### 例

```bash
# カスタム出力ディレクトリ
./scripts/udemy-transcribe.sh -o ~/Documents/udemy-notes "https://..."

# 英語字幕のみ
./scripts/udemy-transcribe.sh -l en "https://..."

# 音声認識で日本語に翻訳
./scripts/udemy-transcribe.sh -a "https://..."
```

---

## 📁 出力ファイル

実行後、以下のファイルが生成されます:

```
udemy-transcripts/
├── 動画タイトル.ja.vtt          # 日本語字幕（VTT形式）
├── 動画タイトル.ja.txt          # 日本語字幕（テキスト形式）
├── 動画タイトル.en.vtt          # 英語字幕（VTT形式）
├── 動画タイトル.en.txt          # 英語字幕（テキスト形式）
└── download.log                  # ダウンロードログ
```

音声認識を使用した場合:
```
udemy-transcripts/
├── 動画タイトル.mp3              # 抽出された音声
├── 動画タイトル.txt              # 文字起こし結果
└── 動画タイトル.srt              # 字幕ファイル（タイムスタンプ付き）
```

---

## 🔧 トラブルシューティング

### エラー: Cookieファイルが見つかりません

```bash
エラー: Cookieファイルが見つかりません: ./cookies.txt
```

**解決方法**:
1. Cookieファイルを正しく配置したか確認
2. ファイル名が `cookies.txt` であることを確認
3. カスタムパスを指定: `-c /path/to/cookies.txt`

### エラー: ダウンロードに失敗しました

**確認事項**:
1. **Cookieの有効期限**: 再ログインして新しいCookieをエクスポート
2. **URL**: コピー&ペーストミスがないか確認
3. **ネットワーク**: インターネット接続を確認
4. **ログ確認**: `udemy-transcripts/download.log` を確認

### 字幕がダウンロードされない

**原因と対策**:

1. **字幕が存在しない**
   - `-a` オプションで音声認識を使用
   - ただし処理時間が長い（1時間の動画 = 約5-10分）

2. **字幕言語が異なる**
   - `-l` オプションで言語を指定
   - 例: `-l ko,zh` (韓国語、中国語)

3. **自動生成字幕のみ**
   - スクリプトは自動字幕にも対応

### 音声認識が遅い

**最適化方法**:

```bash
# 軽量モデルを使用（速度優先）
whisper audio.mp3 --model small --language ja

# 高精度モデルを使用（品質優先）
whisper audio.mp3 --model large --language ja
```

---

## 💡 ベストプラクティス

### 1. まず1つの動画でテスト

コース全体をダウンロードする前に、1つの動画で動作確認:

```bash
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/xxx/learn/lecture/12345"
```

### 2. バッチ処理

複数の動画を順番に処理:

```bash
#!/bin/bash
# 動画URLのリスト
URLS=(
    "https://www.udemy.com/course/xxx/learn/lecture/12345"
    "https://www.udemy.com/course/xxx/learn/lecture/12346"
    "https://www.udemy.com/course/xxx/learn/lecture/12347"
)

for url in "${URLS[@]}"; do
    echo "処理中: $url"
    ./scripts/udemy-transcribe.sh "$url"
    sleep 5  # サーバー負荷軽減
done
```

### 3. Cookieのセキュリティ

```bash
# Cookieファイルのパーミッションを制限
chmod 600 cookies.txt

# .gitignoreに追加（絶対に公開しない）
echo "cookies.txt" >> .gitignore
```

### 4. 定期的なCookie更新

Cookieは期限切れになります:
- 月1回程度、新しいCookieをエクスポート
- ダウンロード失敗したら最初に確認

---

## 📚 高度な使い方

### コース全体を自動処理

```bash
# コースURLからすべての動画を取得
./scripts/udemy-transcribe.sh "https://www.udemy.com/course/autowebinar/"
```

### カスタムスクリプト

```bash
#!/bin/bash
# 夜間バッチ処理用スクリプト

cd /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent

# タイムスタンプ付きログディレクトリ
OUTPUT_DIR="udemy-transcripts/$(date '+%Y%m%d')"

# 実行
./scripts/udemy-transcribe.sh \
    -o "$OUTPUT_DIR" \
    -a \
    "https://www.udemy.com/course/autowebinar/"

# 完了通知
echo "完了: $OUTPUT_DIR"
```

---

## 🔒 セキュリティとプライバシー

### 重要な注意

1. **Cookieファイルは個人情報**
   - Udemyアカウントへのアクセス権限を含む
   - 絶対に他人と共有しない
   - GitHubなどに公開しない

2. **ダウンロードしたコンテンツ**
   - 個人使用のみ
   - 再配布・共有は著作権侵害

3. **定期的なセキュリティチェック**
   ```bash
   # Cookieファイルの権限確認
   ls -la cookies.txt

   # 出力: -rw------- (600) が理想
   ```

---

## 📞 サポート

### よくある質問

**Q: コース全体のダウンロードに時間がかかりますか？**
A: 字幕のみなら数分。音声認識を使う場合、動画時間の約10-20%の処理時間が必要です。

**Q: すべての言語に対応していますか？**
A: yt-dlpは多数の言語に対応。Whisperも100以上の言語をサポート。

**Q: Udemyの規約違反になりませんか？**
A: 購入済みコースの個人学習目的であれば、グレーゾーンですが一般的に問題ありません。ただし、利用規約は必ず確認してください。

### 問題が解決しない場合

1. ログファイルを確認: `udemy-transcripts/download.log`
2. yt-dlpを最新版に更新: `brew upgrade yt-dlp`
3. Cookieを再取得

---

## 📝 制限事項

- DRM保護された動画は非対応
- ライブストリーミングは非対応
- プライベートコースはCookieが必須

---

**作成日**: 2026-01-09
**更新日**: 2026-01-09
**作成者**: Claude Sonnet 4.5
