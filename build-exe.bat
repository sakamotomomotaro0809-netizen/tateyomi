@echo off
REM tateyomi 実行ファイルビルドスクリプト
REM 使い方: build-exe.bat

echo === tateyomi exe ビルド ===
echo.

REM PyInstaller チェック
python -c "import PyInstaller" 2>NUL
if errorlevel 1 (
    echo [!] PyInstaller が見つかりません。インストールします...
    pip install pyinstaller
)

REM CLIビルド
echo [1/2] CLI 実行ファイルをビルド中...
pyinstaller tateyomi.spec --clean --noconfirm
if errorlevel 1 (
    echo [!] CLIビルド失敗
    pause
    exit /b 1
)
echo [OK] dist\tateyomi.exe

REM GUIビルド
echo [2/2] GUI 実行ファイルをビルド中...
pyinstaller tateyomi-gui.spec --clean --noconfirm
if errorlevel 1 (
    echo [!] GUIビルド失敗
    pause
    exit /b 1
)
echo [OK] dist\tateyomi-gui.exe

echo.
echo === ビルド完了 ===
echo   dist\tateyomi.exe     -- コマンドライン版
echo   dist\tateyomi-gui.exe -- ダブルクリック起動 GUI版
echo.
pause
