@echo off
rem tateyomi GUI 起動 (Windows)
rem GUIが表示されない場合は tateyomi-gui.pyw をダブルクリックしてください
set PYTHONIOENCODING=utf-8
pythonw -m tateyomi.cli gui 2>nul || python -m tateyomi.cli gui
