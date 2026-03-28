#!/bin/bash
# Udemy動画の文字起こしスクリプト
#
# 使用条件:
# - 購入済みのコースのみ
# - 個人学習目的のみ
# - 再配布・商用利用禁止

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定
OUTPUT_DIR="${OUTPUT_DIR:-./udemy-transcripts}"
COOKIES_FILE="${COOKIES_FILE:-./cookies.txt}"
SUBTITLE_LANG="${SUBTITLE_LANG:-ja,en}"

# 使い方
usage() {
    cat <<EOF
使い方: $0 [オプション] <UDEMY_URL>

オプション:
  -o DIR      出力ディレクトリ (デフォルト: ./udemy-transcripts)
  -c FILE     Cookieファイル (デフォルト: ./cookies.txt)
  -l LANG     字幕言語 (デフォルト: ja,en)
  -a          音声認識を使用 (字幕がない場合)
  -p          Ollama処理を実行 (要約・学習ノート・キーワード抽出)
  -m MODEL    Ollamaモデル (デフォルト: qwen2.5:14b)
  -h          ヘルプを表示

例:
  # 単一動画の字幕をダウンロード
  $0 "https://www.udemy.com/course/xxx/learn/lecture/12345"

  # コース全体の字幕をダウンロード
  $0 "https://www.udemy.com/course/xxx/"

  # 音声認識を使用
  $0 -a "https://www.udemy.com/course/xxx/learn/lecture/12345"

  # 文字起こし + Ollama処理（要約・学習ノート・キーワード）
  $0 -p "https://www.udemy.com/course/xxx/learn/lecture/12345"

  # 音声認識 + Ollama処理
  $0 -a -p "https://www.udemy.com/course/xxx/learn/lecture/12345"

  # カスタムモデル使用
  $0 -p -m llama3.1:70b "https://www.udemy.com/course/xxx/learn/lecture/12345"

前提条件:
  1. Udemyアカウントでログイン済み
  2. ブラウザのCookieをエクスポート (cookies.txt)
  3. yt-dlp がインストール済み
  4. whisper がインストール済み (音声認識を使う場合)

Cookieのエクスポート方法:
  1. Chrome拡張機能 "Get cookies.txt LOCALLY" をインストール
  2. Udemyにログインした状態で拡張機能を実行
  3. cookies.txt を保存

EOF
    exit 1
}

# オプション解析
USE_AUDIO=false
USE_OLLAMA=false
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:14b}"
while getopts "o:c:l:apm:h" opt; do
    case $opt in
        o) OUTPUT_DIR="$OPTARG" ;;
        c) COOKIES_FILE="$OPTARG" ;;
        l) SUBTITLE_LANG="$OPTARG" ;;
        a) USE_AUDIO=true ;;
        p) USE_OLLAMA=true ;;
        m) OLLAMA_MODEL="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done
shift $((OPTIND-1))

# URLチェック
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: URLを指定してください${NC}"
    usage
fi

URL="$1"

# Cookieファイルのチェック
if [ ! -f "$COOKIES_FILE" ]; then
    echo -e "${RED}エラー: Cookieファイルが見つかりません: $COOKIES_FILE${NC}"
    echo ""
    echo "Cookieファイルの作成方法:"
    echo "1. Chrome拡張機能 'Get cookies.txt LOCALLY' をインストール"
    echo "2. Udemyにログインした状態で拡張機能を実行"
    echo "3. ダウンロードした cookies.txt をこのディレクトリに配置"
    echo ""
    exit 1
fi

# 出力ディレクトリの作成
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}=== Udemy 文字起こしツール ===${NC}"
echo "URL: $URL"
echo "出力先: $OUTPUT_DIR"
echo "Cookie: $COOKIES_FILE"
echo "字幕言語: $SUBTITLE_LANG"
echo ""

# 字幕のダウンロードを試行
echo -e "${YELLOW}字幕をダウンロード中...${NC}"

if yt-dlp --cookies "$COOKIES_FILE" \
          --write-auto-sub \
          --write-sub \
          --sub-lang "$SUBTITLE_LANG" \
          --skip-download \
          --output "$OUTPUT_DIR/%(title)s.%(ext)s" \
          "$URL" 2>&1 | tee "$OUTPUT_DIR/download.log"; then

    echo -e "${GREEN}✅ 字幕のダウンロードが完了しました${NC}"

    # ダウンロードされた字幕ファイルを確認
    SUBTITLE_FILES=$(find "$OUTPUT_DIR" -name "*.vtt" -o -name "*.srt" 2>/dev/null)

    if [ -n "$SUBTITLE_FILES" ]; then
        echo ""
        echo "ダウンロードされた字幕:"
        echo "$SUBTITLE_FILES" | while read -r file; do
            echo "  - $file"
        done

        # VTTをテキストに変換
        echo ""
        echo -e "${YELLOW}字幕をテキスト形式に変換中...${NC}"
        find "$OUTPUT_DIR" -name "*.vtt" | while read -r vtt_file; do
            txt_file="${vtt_file%.vtt}.txt"
            # タイムスタンプとVTTヘッダーを削除
            sed -e '/^WEBVTT$/d' \
                -e '/^Kind:/d' \
                -e '/^Language:/d' \
                -e '/^[0-9][0-9]:[0-9][0-9]:[0-9][0-9]\.[0-9][0-9][0-9] --> /d' \
                -e '/^[0-9][0-9]:[0-9][0-9]\.[0-9][0-9][0-9] --> /d' \
                -e '/^$/d' \
                "$vtt_file" > "$txt_file"
            echo "  ✅ 作成: $txt_file"
        done
        echo -e "${GREEN}✅ テキスト変換が完了しました${NC}"
    else
        echo -e "${YELLOW}⚠️  字幕ファイルが見つかりませんでした${NC}"

        if [ "$USE_AUDIO" = true ]; then
            echo ""
            echo -e "${YELLOW}音声認識を使用して文字起こしを実行中...${NC}"

            # 音声をダウンロード
            echo "音声をダウンロード中..."
            yt-dlp --cookies "$COOKIES_FILE" \
                   -f "bestaudio" \
                   -x --audio-format mp3 \
                   --output "$OUTPUT_DIR/%(title)s.%(ext)s" \
                   "$URL"

            # Whisperで文字起こし
            find "$OUTPUT_DIR" -name "*.mp3" | while read -r audio_file; do
                echo "文字起こし中: $audio_file"
                whisper "$audio_file" \
                        --model medium \
                        --language ja \
                        --output_dir "$OUTPUT_DIR" \
                        --output_format txt,srt
                echo "  ✅ 完了: ${audio_file%.mp3}.txt"
            done

            echo -e "${GREEN}✅ 音声認識による文字起こしが完了しました${NC}"
        else
            echo ""
            echo "音声認識を使用する場合は -a オプションを追加してください:"
            echo "  $0 -a \"$URL\""
        fi
    fi
else
    echo -e "${RED}❌ ダウンロードに失敗しました${NC}"
    echo ""
    echo "トラブルシューティング:"
    echo "1. Cookieファイルが最新か確認"
    echo "2. Udemyにログインできているか確認"
    echo "3. URLが正しいか確認"
    echo "4. ログファイルを確認: $OUTPUT_DIR/download.log"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 完了 ===${NC}"
echo "出力先: $OUTPUT_DIR"
echo ""

# Ollama処理
if [ "$USE_OLLAMA" = true ]; then
    echo ""
    echo -e "${GREEN}=== Ollama 処理を開始 ===${NC}"
    echo "モデル: $OLLAMA_MODEL"
    echo ""

    # 処理するテキストファイルを探す
    TXT_FILES=$(find "$OUTPUT_DIR" -name "*.txt" -not -name "*_summary.md" -not -name "*_notes.md" -not -name "*_keywords.md" -not -name "*_improved.txt" -type f)

    if [ -z "$TXT_FILES" ]; then
        echo -e "${YELLOW}⚠️  処理するテキストファイルが見つかりません${NC}"
    else
        SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
        OLLAMA_SCRIPT="$SCRIPT_DIR/ollama-process-transcript.sh"

        if [ ! -f "$OLLAMA_SCRIPT" ]; then
            echo -e "${RED}エラー: Ollamaスクリプトが見つかりません: $OLLAMA_SCRIPT${NC}"
        else
            echo "$TXT_FILES" | while read -r txt_file; do
                echo ""
                echo "処理中: $(basename "$txt_file")"
                "$OLLAMA_SCRIPT" -m "$OLLAMA_MODEL" -o "$OUTPUT_DIR" "$txt_file"
            done
        fi
    fi
fi

echo ""
echo "次のステップ:"
echo "1. $OUTPUT_DIR ディレクトリを確認"
echo "2. .txt ファイルで文字起こし結果を確認"
if [ "$USE_OLLAMA" = true ]; then
    echo "3. _summary.md で要約を確認"
    echo "4. _notes.md で学習ノートを確認"
    echo "5. _keywords.md でキーワードを確認"
fi
echo ""
