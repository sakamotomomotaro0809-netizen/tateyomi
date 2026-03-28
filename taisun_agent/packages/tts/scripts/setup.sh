#!/bin/bash
# @taisun/tts セットアップスクリプト
#
# 使用方法:
#   ./scripts/setup.sh [--with-t5gemma]
#
# オプション:
#   --with-t5gemma  T5Gemma-TTSもセットアップ（非商用のみ）

set -e

echo "🎤 @taisun/tts セットアップ"
echo "=========================="
echo ""

# Node.js 依存関係のインストール
echo "📦 Node.js 依存関係をインストール..."
npm install

# Edge TTS のインストール
echo ""
echo "🔊 Edge TTS をインストール..."
if command -v pip3 &> /dev/null; then
    pip3 install edge-tts
elif command -v pip &> /dev/null; then
    pip install edge-tts
else
    echo "⚠️  pip が見つかりません。手動で edge-tts をインストールしてください:"
    echo "   pip install edge-tts"
fi

# Edge TTS 確認
echo ""
echo "✅ Edge TTS インストール確認..."
if command -v edge-tts &> /dev/null; then
    echo "   edge-tts: OK"
    edge-tts --list-voices 2>/dev/null | head -5
else
    echo "   edge-tts: インストール失敗"
fi

# T5Gemma-TTS のセットアップ（オプション）
if [[ "$1" == "--with-t5gemma" ]]; then
    echo ""
    echo "🧠 T5Gemma-TTS をセットアップ..."
    echo "   ⚠️  注意: T5Gemma-TTS は非商用利用のみ（CC-BY-NC ライセンス）"
    echo ""

    T5GEMMA_DIR="./external/T5Gemma-TTS"

    if [ ! -d "$T5GEMMA_DIR" ]; then
        echo "   T5Gemma-TTS をクローン..."
        git clone https://huggingface.co/spaces/Aratako/T5Gemma-TTS-Demo "$T5GEMMA_DIR"
    fi

    cd "$T5GEMMA_DIR"

    # Python 仮想環境のセットアップ
    if [ ! -d "venv" ]; then
        echo "   Python 仮想環境を作成..."
        python3 -m venv venv
    fi

    echo "   依存関係をインストール..."
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt 2>/dev/null || true
    pip install torch torchaudio transformers accelerate

    # HuggingFace ログイン確認
    echo ""
    echo "   📝 HuggingFace ログイン状態を確認..."
    if python -c "from huggingface_hub import HfApi; api = HfApi(); print(api.whoami()['name'])" 2>/dev/null; then
        echo "   HuggingFace: ログイン済み"
    else
        echo "   HuggingFace: 未ログイン"
        echo "   以下のコマンドでログインしてください:"
        echo "   cd $T5GEMMA_DIR && source venv/bin/activate && huggingface-cli login"
    fi

    deactivate
    cd -
fi

# TypeScript ビルド
echo ""
echo "🔨 TypeScript をビルド..."
npm run build

# ヘルスチェック
echo ""
echo "🔍 ヘルスチェック..."
node -e "
import('./dist/clients/edge-tts.js').then(async ({ EdgeTTSClient }) => {
  const client = new EdgeTTSClient();
  const ok = await client.healthCheck();
  console.log('   Edge TTS:', ok ? '✅ OK' : '❌ 利用不可');
}).catch(() => console.log('   Edge TTS: ❌ ビルドエラー'));
"

echo ""
echo "=========================="
echo "✅ セットアップ完了！"
echo ""
echo "使用例:"
echo "  # CLI で音声合成"
echo "  npx taisun-tts synthesize -t 'こんにちは' -o output.wav"
echo ""
echo "  # プログラムから使用"
echo "  import { TTSManager } from '@taisun/tts';"
echo ""
