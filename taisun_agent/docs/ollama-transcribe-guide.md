# Ollama統合 - Udemy文字起こし完全ガイド

## 📚 概要

Ollamaを使用して、Udemy動画の文字起こし結果を:
1. **要約** - 動画内容の簡潔なサマリー
2. **学習ノート** - 構造化された学習資料
3. **キーワード抽出** - 重要な用語とトピック
4. **翻訳・改善** - 読みやすい形式に整形

すべてをローカルのAIモデル（Ollama）で処理します。

---

## ✅ セットアップ完了状況

### インストール済み

- ✅ **Ollama**: インストール済み・動作確認済み
- ✅ **qwen2.5:14b**: インストール済み（9.0GB）
- ✅ **統合スクリプト**: 実装完了

### 利用可能なモデル

| モデル | サイズ | 特徴 | 推奨用途 |
|--------|--------|------|----------|
| **qwen2.5:14b** ✅ | 9.0 GB | 日本語に強い | 要約・翻訳（推奨） |
| llama3.1:70b | 42 GB | 最高品質 | 高品質な分析 |
| gemma3:27b | 17 GB | バランス型 | 一般的な処理 |
| deepseek-r1:8b | 5.2 GB | 推論特化 | 論理的分析 |

---

## 🚀 使い方

### 基本: 文字起こし + Ollama処理

```bash
cd /Users/matsumototoshihiko/Desktop/テスト開発/池田リサーチしすてむ/taisun_agent

# 字幕ダウンロード + 要約・学習ノート・キーワード抽出
./scripts/udemy-transcribe.sh -p "https://www.udemy.com/course/autowebinar/learn/lecture/45461633"
```

**処理内容**:
1. 字幕をダウンロード
2. qwen2.5:14bで要約生成
3. 学習ノート作成
4. キーワード抽出
5. テキスト改善

### 音声認識 + Ollama処理

字幕がない動画の場合:

```bash
./scripts/udemy-transcribe.sh -a -p "https://www.udemy.com/course/xxx/learn/lecture/XXXXX"
```

### カスタムモデル使用

```bash
# llama3.1:70b を使用（最高品質）
./scripts/udemy-transcribe.sh -p -m llama3.1:70b "URL"

# gemma3:27b を使用（バランス型）
./scripts/udemy-transcribe.sh -p -m gemma3:27b "URL"
```

### コース全体を一括処理

```bash
./scripts/udemy-transcribe.sh -p "https://www.udemy.com/course/autowebinar/"
```

---

## 📁 出力ファイル

### 基本の文字起こし

```
udemy-transcripts/
├── 動画タイトル.ja.txt          # 日本語字幕（元データ）
└── 動画タイトル.en.txt          # 英語字幕
```

### Ollama処理後

```
udemy-transcripts/
├── 動画タイトル.ja.txt              # 元の文字起こし
├── 動画タイトル_summary.md         # 📝 要約
├── 動画タイトル_notes.md           # 📚 学習ノート
├── 動画タイトル_keywords.md        # 🏷️ キーワード
└── 動画タイトル_improved.txt       # 🌐 改善版テキスト
```

---

## 📄 各ファイルの内容

### 1. `_summary.md` - 要約

```markdown
# [動画タイトル]

## 概要
3-5行の簡潔な要約

## 主要なポイント
- ポイント1
- ポイント2
- ポイント3
...

## 結論
動画の結論と要点
```

### 2. `_notes.md` - 学習ノート

```markdown
# [動画タイトル]

## 📋 学習目標
- 目標1
- 目標2
...

## 🔑 重要な概念
### 概念1
- 説明
- 例

## 💡 実践的なヒント
- ヒント1
- ヒント2
...

## ❓ 重要な質問
- 質問1
- 質問2
...

## 📝 復習ポイント
- ポイント1
- ポイント2
...
```

### 3. `_keywords.md` - キーワード

```markdown
# キーワードとトピック

## 主要キーワード
- [キーワード1]: 説明
- [キーワード2]: 説明
...

## カテゴリ別分類
### [カテゴリ1]
- キーワード1
- キーワード2

## 関連トピック
- トピック1
- トピック2
```

### 4. `_improved.txt` - 改善版テキスト

元の文字起こしを読みやすく整形:
- 適切な段落分け
- 自然な表現に改善
- 見出しの追加

---

## 🎯 使用例

### 例1: 単一動画の完全処理

```bash
./scripts/udemy-transcribe.sh -p "https://www.udemy.com/course/autowebinar/learn/lecture/45461633"
```

**処理時間**: 約3-5分
- 字幕ダウンロード: 10秒
- Ollama処理: 2-4分

**結果**:
```
udemy-transcripts/
├── オートウェビナー入門.ja.txt
├── オートウェビナー入門_summary.md
├── オートウェビナー入門_notes.md
├── オートウェビナー入門_keywords.md
└── オートウェビナー入門_improved.txt
```

### 例2: 音声認識 + Ollama処理

```bash
./scripts/udemy-transcribe.sh -a -p "URL"
```

**処理時間**: 約10-15分（1時間の動画の場合）
- 音声ダウンロード: 1分
- Whisper文字起こし: 5-10分
- Ollama処理: 3-5分

### 例3: コース全体の一括処理

```bash
./scripts/udemy-transcribe.sh -p "https://www.udemy.com/course/autowebinar/"
```

**処理時間**: 動画数 × 3-5分

例: 20本の動画 = 約60-100分

---

## 🛠️ Ollamaスクリプト単体使用

既に文字起こしファイルがある場合、Ollama処理だけを実行できます:

```bash
# 基本
./scripts/ollama-process-transcript.sh transcript.txt

# 要約のみ
./scripts/ollama-process-transcript.sh -s transcript.txt

# 学習ノートのみ
./scripts/ollama-process-transcript.sh -n transcript.txt

# キーワードのみ
./scripts/ollama-process-transcript.sh -k transcript.txt

# カスタムモデル
./scripts/ollama-process-transcript.sh -m llama3.1:70b transcript.txt

# カスタム出力ディレクトリ
./scripts/ollama-process-transcript.sh -o ~/Documents/notes transcript.txt
```

---

## ⚙️ 詳細設定

### モデルの選択基準

#### qwen2.5:14b（推奨）
- **サイズ**: 9.0 GB
- **速度**: 高速
- **品質**: 高品質
- **日本語**: ✅ 優秀
- **推奨用途**: 一般的な要約・翻訳

#### llama3.1:70b（最高品質）
- **サイズ**: 42 GB
- **速度**: 低速
- **品質**: 最高
- **日本語**: ✅ 良好
- **推奨用途**: 重要な資料・論文レベル

#### gemma3:27b（バランス型）
- **サイズ**: 17 GB
- **速度**: 中速
- **品質**: 高品質
- **日本語**: ✅ 良好
- **推奨用途**: バランス重視

#### deepseek-r1:8b（高速）
- **サイズ**: 5.2 GB
- **速度**: 超高速
- **品質**: 中品質
- **日本語**: △ 可能
- **推奨用途**: 大量処理・速度優先

### 環境変数

```bash
# デフォルトモデルを変更
export OLLAMA_MODEL="llama3.1:70b"

# 出力ディレクトリ
export OUTPUT_DIR="~/Documents/udemy-notes"

# Temperature（創造性）
export TEMPERATURE="0.3"  # 低い=事実的、高い=創造的
```

---

## 🔧 トラブルシューティング

### エラー: Ollamaが起動していません

```bash
# Ollamaサーバーを起動
ollama serve
```

別のターミナルで実行してください。

### モデルが見つかりません

```bash
# モデルをインストール
ollama pull qwen2.5:14b

# 利用可能なモデルを確認
ollama list
```

### 処理が遅い

**対策1**: 軽量モデルを使用
```bash
./scripts/udemy-transcribe.sh -p -m deepseek-r1:8b "URL"
```

**対策2**: GPUを使用
- NVIDIA GPUがある場合、Ollamaが自動的に使用
- M1/M2/M3 Macの場合、Metal（GPU）を自動使用

### メモリ不足

**解決策**:
1. 軽量モデルを使用（deepseek-r1:8b など）
2. 他のアプリケーションを閉じる
3. 1つずつ処理（一括処理を避ける）

---

## 💡 ベストプラクティス

### 1. まず1動画でテスト

```bash
# 1つの動画で動作確認
./scripts/udemy-transcribe.sh -p "URL"

# 出力を確認
cat udemy-transcripts/*_summary.md
```

### 2. 用途別にモデルを選択

- **一般的な学習**: qwen2.5:14b
- **重要な資料**: llama3.1:70b
- **大量処理**: deepseek-r1:8b

### 3. バッチ処理スクリプト

```bash
#!/bin/bash
# 複数動画を順次処理

URLS=(
    "URL1"
    "URL2"
    "URL3"
)

for url in "${URLS[@]}"; do
    echo "処理中: $url"
    ./scripts/udemy-transcribe.sh -p "$url"
    sleep 10  # サーバー負荷軽減
done
```

### 4. 夜間バッチ処理

```bash
#!/bin/bash
# 夜間に自動処理

# コース全体を処理
./scripts/udemy-transcribe.sh -p "https://www.udemy.com/course/autowebinar/"

# 完了通知（macOS）
osascript -e 'display notification "Udemy処理完了" with title "Ollama"'
```

---

## 📊 パフォーマンス

### 処理時間（参考）

| 処理内容 | 時間 |
|---------|------|
| 字幕ダウンロード（1動画） | 10秒 |
| Ollama要約（qwen2.5:14b） | 1-2分 |
| Ollama学習ノート | 2-3分 |
| Ollamaキーワード抽出 | 30秒-1分 |
| Ollama改善版テキスト | 1-2分 |
| **合計（1動画）** | **5-8分** |

### メモリ使用量

| モデル | RAM | VRAM（GPU） |
|--------|-----|-------------|
| qwen2.5:14b | 9-12 GB | 9 GB |
| llama3.1:70b | 40-50 GB | 42 GB |
| gemma3:27b | 17-20 GB | 17 GB |
| deepseek-r1:8b | 5-8 GB | 5 GB |

---

## 🔗 関連リソース

- **Udemyセットアップ**: `docs/udemy-transcribe-guide.md`
- **クイックスタート**: `UDEMY_SETUP_CHECKLIST.md`
- **Ollamaスクリプト**: `scripts/ollama-process-transcript.sh`
- **統合スクリプト**: `scripts/udemy-transcribe.sh`

---

**作成日**: 2026-01-09
**更新日**: 2026-01-09
**作成者**: Claude Sonnet 4.5

**推奨環境**:
- macOS / Linux
- RAM: 16GB以上推奨
- ストレージ: 20GB以上の空き容量
