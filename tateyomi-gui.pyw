"""
tateyomi GUI — ダブルクリックで起動するPythonスクリプト
.pyw拡張子でコンソールウィンドウなしで実行される
"""
import os
import sys

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tateyomi.gui import main
main()
