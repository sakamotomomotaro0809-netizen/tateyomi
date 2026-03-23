#!/usr/bin/env bash
# ============================================================
# tateyomi PyPI 公開スクリプト
# 使い方:
#   bash scripts/publish.sh           # TestPyPI へアップロード
#   bash scripts/publish.sh --prod    # 本番PyPI へアップロード
# 前提:
#   pip install build twine
#   ~/.pypirc に API トークンを設定済み、または環境変数 TWINE_PASSWORD に設定
# ============================================================
set -euo pipefail

PROD=0
for arg in "$@"; do
  [ "$arg" = "--prod" ] && PROD=1
done

echo "==> 既存ビルド成果物を削除"
rm -rf dist/ build/ *.egg-info/

echo "==> ビルド"
python -m build

echo "==> 生成されたパッケージ:"
ls -lh dist/

echo "==> twine check"
python -m twine check dist/*

if [ "$PROD" -eq 1 ]; then
  echo "==> 本番 PyPI へアップロード"
  echo "    URL: https://pypi.org/project/tateyomi/"
  python -m twine upload dist/*
else
  echo "==> TestPyPI へアップロード"
  echo "    URL: https://test.pypi.org/project/tateyomi/"
  python -m twine upload --repository testpypi dist/*
  echo ""
  echo "インストールテスト:"
  echo "  pip install --index-url https://test.pypi.org/simple/ tateyomi"
fi

echo ""
echo "完了。本番公開は: bash scripts/publish.sh --prod"
