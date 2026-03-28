#!/bin/bash
# Ollama を使用した文字起こし結果の処理スクリプト
#
# 機能:
# 1. 要約生成
# 2. 翻訳・改善
# 3. 学習ノート作成
# 4. キーワード抽出

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト設定
MODEL="${OLLAMA_MODEL:-qwen2.5:14b}"
OUTPUT_DIR="${OUTPUT_DIR:-.}"
TEMPERATURE="0.7"

# 使い方
usage() {
    cat <<EOF
使い方: $0 [オプション] <入力ファイル>

オプション:
  -m MODEL    使用するOllamaモデル (デフォルト: qwen2.5:14b)
  -o DIR      出力ディレクトリ (デフォルト: カレントディレクトリ)
  -t TEMP     Temperature (0.0-1.0, デフォルト: 0.7)
  -s          要約のみ生成
  -n          学習ノートのみ生成
  -k          キーワードのみ抽出
  -h          ヘルプを表示

例:
  # 完全処理（要約・学習ノート・キーワード）
  $0 transcript.txt

  # 要約のみ
  $0 -s transcript.txt

  # カスタムモデル使用
  $0 -m llama3.1:70b transcript.txt

利用可能なモデル:
  $(ollama list | tail -n +2 | awk '{print "  - " $1}')

EOF
    exit 1
}

# オプション解析
SUMMARY_ONLY=false
NOTES_ONLY=false
KEYWORDS_ONLY=false

while getopts "m:o:t:snkh" opt; do
    case $opt in
        m) MODEL="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        t) TEMPERATURE="$OPTARG" ;;
        s) SUMMARY_ONLY=true ;;
        n) NOTES_ONLY=true ;;
        k) KEYWORDS_ONLY=true ;;
        h) usage ;;
        *) usage ;;
    esac
done
shift $((OPTIND-1))

# 入力ファイルチェック
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: 入力ファイルを指定してください${NC}"
    usage
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}エラー: ファイルが見つかりません: $INPUT_FILE${NC}"
    exit 1
fi

# 出力ディレクトリの作成
mkdir -p "$OUTPUT_DIR"

# ベースファイル名
BASENAME=$(basename "$INPUT_FILE" .txt)

echo -e "${GREEN}=== Ollama 文字起こし処理 ===${NC}"
echo "入力: $INPUT_FILE"
echo "モデル: $MODEL"
echo "出力先: $OUTPUT_DIR"
echo ""

# Ollamaサーバーの確認
if ! ollama list >/dev/null 2>&1; then
    echo -e "${RED}エラー: Ollamaが起動していません${NC}"
    echo "Ollamaを起動してください: ollama serve"
    exit 1
fi

# モデルの確認
if ! ollama list | grep -q "^$MODEL"; then
    echo -e "${YELLOW}警告: モデル $MODEL が見つかりません。ダウンロード中...${NC}"
    ollama pull "$MODEL"
fi

# 文字起こし内容を読み込む
TRANSCRIPT=$(cat "$INPUT_FILE")

# 処理関数
process_summary() {
    echo -e "${BLUE}📝 要約を生成中...${NC}"

    SUMMARY_OUTPUT="$OUTPUT_DIR/${BASENAME}_summary.md"

    ollama run "$MODEL" <<EOF > "$SUMMARY_OUTPUT"
以下は動画の文字起こしです。この内容を日本語で要約してください。

要約の形式:
1. タイトル（動画の主題）
2. 概要（3-5行）
3. 主要なポイント（箇条書き5-10項目）
4. 結論

文字起こし:
---
$TRANSCRIPT
---

要約を作成してください:
EOF

    echo -e "${GREEN}✅ 要約完了: $SUMMARY_OUTPUT${NC}"
}

process_learning_notes() {
    echo -e "${BLUE}📚 学習ノートを作成中...${NC}"

    NOTES_OUTPUT="$OUTPUT_DIR/${BASENAME}_notes.md"

    ollama run "$MODEL" <<EOF > "$NOTES_OUTPUT"
以下は教育動画の文字起こしです。効果的な学習ノートを作成してください。

ノートの形式:
# [動画タイトル]

## 📋 学習目標
- 箇条書きで3-5項目

## 🔑 重要な概念
### 概念1
- 説明
- 例

### 概念2
- 説明
- 例

## 💡 実践的なヒント
- 実務で使えるヒントを箇条書き

## ❓ 重要な質問
- 理解を深める質問を3-5個

## 📝 復習ポイント
- 重要なポイントを箇条書き

文字起こし:
---
$TRANSCRIPT
---

学習ノートを作成してください:
EOF

    echo -e "${GREEN}✅ 学習ノート完了: $NOTES_OUTPUT${NC}"
}

process_keywords() {
    echo -e "${BLUE}🏷️  キーワードを抽出中...${NC}"

    KEYWORDS_OUTPUT="$OUTPUT_DIR/${BASENAME}_keywords.md"

    ollama run "$MODEL" <<EOF > "$KEYWORDS_OUTPUT"
以下は動画の文字起こしです。重要なキーワードとトピックを抽出してください。

出力形式:
# キーワードとトピック

## 主要キーワード
- [キーワード1]: 簡単な説明
- [キーワード2]: 簡単な説明
（10-15個）

## カテゴリ別分類
### [カテゴリ1]
- キーワード1
- キーワード2

### [カテゴリ2]
- キーワード3
- キーワード4

## 関連トピック
- トピック1
- トピック2

文字起こし:
---
$TRANSCRIPT
---

キーワードを抽出してください:
EOF

    echo -e "${GREEN}✅ キーワード抽出完了: $KEYWORDS_OUTPUT${NC}"
}

process_translation() {
    echo -e "${BLUE}🌐 翻訳・改善中...${NC}"

    TRANSLATION_OUTPUT="$OUTPUT_DIR/${BASENAME}_improved.txt"

    ollama run "$MODEL" <<EOF > "$TRANSLATION_OUTPUT"
以下は動画の文字起こしです。このテキストを:
1. 読みやすく整形
2. 不自然な表現を改善
3. 段落を適切に分割
4. 必要に応じて見出しを追加

元のテキスト:
---
$TRANSCRIPT
---

改善版を出力してください:
EOF

    echo -e "${GREEN}✅ 翻訳・改善完了: $TRANSLATION_OUTPUT${NC}"
}

# 処理実行
if [ "$SUMMARY_ONLY" = true ]; then
    process_summary
elif [ "$NOTES_ONLY" = true ]; then
    process_learning_notes
elif [ "$KEYWORDS_ONLY" = true ]; then
    process_keywords
else
    # 完全処理
    process_summary
    echo ""
    process_learning_notes
    echo ""
    process_keywords
    echo ""
    process_translation
fi

echo ""
echo -e "${GREEN}=== 処理完了 ===${NC}"
echo "出力先: $OUTPUT_DIR"
echo ""

# 生成されたファイル一覧
echo "生成されたファイル:"
find "$OUTPUT_DIR" -name "${BASENAME}_*" -type f | while read -r file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  📄 $(basename "$file") ($SIZE)"
done

echo ""
echo "次のステップ:"
echo "1. 要約を確認: cat $OUTPUT_DIR/${BASENAME}_summary.md"
echo "2. 学習ノートを確認: cat $OUTPUT_DIR/${BASENAME}_notes.md"
echo "3. キーワードを確認: cat $OUTPUT_DIR/${BASENAME}_keywords.md"
