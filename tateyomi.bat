@echo off
rem tateyomi — 電子書籍縦書き変換ツール ランチャー (Windows)
set PYTHONIOENCODING=utf-8
python -m tateyomi.cli %*
