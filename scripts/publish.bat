@echo off
rem tateyomi PyPI 公開スクリプト (Windows)
rem 使い方:
rem   scripts\publish.bat          -- TestPyPI へアップロード
rem   scripts\publish.bat --prod   -- 本番 PyPI へアップロード
rem 前提: pip install build twine
rem        %USERPROFILE%\.pypirc に API トークンを設定、または環境変数 TWINE_PASSWORD

set PROD=0
for %%A in (%*) do (
  if "%%A"=="--prod" set PROD=1
)

echo =^> 既存ビルド成果物を削除
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

echo =^> ビルド
python -m build || goto :error

echo =^> twine check
python -m twine check dist\* || goto :error

if "%PROD%"=="1" (
  echo =^> 本番 PyPI へアップロード
  python -m twine upload dist\*
) else (
  echo =^> TestPyPI へアップロード
  python -m twine upload --repository testpypi dist\*
  echo.
  echo インストールテスト:
  echo   pip install --index-url https://test.pypi.org/simple/ tateyomi
)

echo.
echo 完了。本番公開は: scripts\publish.bat --prod
goto :eof

:error
echo エラーが発生しました
exit /b 1
