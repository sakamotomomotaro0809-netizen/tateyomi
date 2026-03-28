# Windows セットアップガイド

TAISUN v2 を Windows 環境で100%動作させるための完全ガイドです。

## 📋 目次

1. [前提条件](#前提条件)
2. [インストール手順](#インストール手順)
3. [トラブルシューティング](#トラブルシューティング)
4. [よくある質問](#よくある質問)

---

## 前提条件

### 必須ソフトウェア

#### 1. Node.js 18 以上

**インストール方法:**
1. [Node.js 公式サイト](https://nodejs.org/) にアクセス
2. **LTS版（推奨）** をダウンロード
3. インストーラーを実行（デフォルト設定でOK）

**確認方法:**
```powershell
node --version
# v18.0.0 以上が表示されればOK

npm --version
# 9.0.0 以上が表示されればOK
```

#### 2. Git for Windows

**インストール方法:**
1. [Git for Windows](https://git-scm.com/download/win) にアクセス
2. インストーラーをダウンロード
3. インストール時の**重要な設定**:
   - ✅ Git Bash を含める
   - ✅ デフォルトエディタは好みで選択
   - ⚠️ **改行コード設定**: "Checkout as-is, commit Unix-style line endings" を選択

**確認方法:**
```powershell
git --version
# git version 2.40.0 以上が表示されればOK
```

**Git 設定（重要）:**
```powershell
# グローバル設定（初回のみ）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 改行コード設定（重要）
git config --global core.autocrlf false

# 確認
git config --list
```

### 推奨ソフトウェア（オプション）

#### 3. GitHub CLI（Supervisor 機能に必要）

**インストール方法:**
1. [GitHub CLI](https://cli.github.com/) にアクセス
2. Windows インストーラーをダウンロード
3. インストール後、認証:

```powershell
gh auth login
# GitHub.com を選択
# HTTPS を選択
# ブラウザで認証
```

**確認方法:**
```powershell
gh --version
```

#### 4. Docker Desktop（一部 MCP サーバーに必要）

**インストール方法:**
1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) にアクセス
2. インストーラーをダウンロード
3. インストール後、Docker Desktop を起動

**確認方法:**
```powershell
docker --version
docker info
```

---

## インストール手順

### 手順 1: セットアップスクリプトの実行

```powershell
# PowerShell または Git Bash を開く

# リポジトリをクローン
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent

# Windows セットアップスクリプトを実行
npm run setup:windows
```

**出力例:**
```
==========================================
  TAISUN v2 - Windows Setup
==========================================

[1/6] Checking Node.js...
  ✓ Node.js installed: v20.10.0

[2/6] Checking Git...
  ✓ Git installed: git version 2.43.0

[3/6] Checking npm...
  ✓ npm installed: 10.2.3

[4/6] Checking TypeScript...
  ! TypeScript not globally installed (will be installed via npm install)

[5/6] Checking optional dependencies...
  ✓ Docker installed: Docker version 24.0.7
  ✓ Docker daemon is running
  ✓ GitHub CLI installed: gh version 2.40.0

[6/6] Checking project files...
  ! .env file not found
    Copy .env.example to .env and configure
  ! node_modules not found
    Run: npm install

==========================================
  Setup Summary
==========================================

⚠️  Setup complete with warnings
Please review the warnings above for optimal experience.

Next Steps:
  1. Run: npm install
  2. Run: npm test
  3. Run: npm run mcp:health
  4. Run: claude (start Claude Code)
```

### 手順 2: 依存関係のインストール

```powershell
# npm パッケージをインストール
npm install

# ビルドが自動実行される（postinstall フック）
# エラーが出る場合は手動で:
npm run build:all
```

### 手順 3: 環境変数の設定

```powershell
# .env.example をコピー
copy .env.example .env

# .env をエディタで開いて必要な値を設定
notepad .env
```

**最小限の設定:**
```env
# 基本設定（必須）
NODE_ENV=development

# MCP サーバー設定（使用する場合）
GITHUB_TOKEN=your_github_token_here
NOTION_API_KEY=your_notion_key_here
```

### 手順 4: 動作確認

```powershell
# テストを実行（692個のテストが通ればOK）
npm test

# MCP サーバーのヘルスチェック
npm run mcp:health

# 開発環境の診断
npm run doctor
```

**成功例:**
```
Test Suites: 33 passed, 33 total
Tests:       692 passed, 692 total
Snapshots:   0 total
Time:        15.866 s
```

### 手順 5: Claude Code の起動

```powershell
# プロジェクトディレクトリで Claude Code を起動
claude
```

---

## トラブルシューティング

### 🚨 緊急: テストで大量のエラーが出る場合

**症状:**
```
npm test
# 13万文字以上のエラーログが出力される
# スクロールが止まらない
```

**原因:**
- TypeScript ビルドが失敗している
- コンパイル済みファイルが存在しない状態でテスト実行

**解決策（必ずこの順番で実行）:**

```powershell
# 1. 出力を抑えてビルドを再実行
npm run build:all 2>&1 | Select-Object -Last 20

# ビルドが失敗する場合、手動で実行:
npm run proxy:build
npm run scripts:build

# 2. ビルド成功を確認
ls dist/  # dist フォルダの存在を確認

# 3. テストを静かに実行（ログ最小化）
npm run test:silent

# または、サマリーのみ表示
npm run test:summary
```

**⚠️ 重要: Claudeにエラーログを貼り付けない**
- 13万文字のログを貼り付けると API 400エラーが発生
- 必ず `npm run test:summary` で要約のみを取得
- または、エラーの最初と最後の20行だけをコピー

**WSL は不要です:**
- この問題は WSL で解決しません
- 上記の手順でビルドを再実行してください

---

### 問題 1: npm install でエラーが出る

**症状:**
```
npm ERR! code ELIFECYCLE
```

**解決策:**
```powershell
# npm キャッシュをクリア
npm cache clean --force

# node_modules を削除して再インストール
rmdir /s /q node_modules
rmdir /s /q package-lock.json
npm install
```

### 問題 2: TypeScript コンパイルエラー

**症状:**
```
TSError: Unable to compile TypeScript
```

**解決策:**
```powershell
# TypeScript を再インストール
npm install --save-dev typescript@latest

# 手動ビルド
npm run build:all
```

### 問題 3: 改行コードの問題

**症状:**
```
'\r': command not found
```

**解決策:**
```powershell
# Git の改行コード設定を確認
git config core.autocrlf
# "false" でない場合:

git config --global core.autocrlf false

# リポジトリを再クローン
cd ..
rmdir /s /q taisun_agent
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
npm install
```

### 問題 4: パス関連のエラー

**症状:**
```
Error: ENOENT: no such file or directory
```

**解決策:**
```powershell
# プロジェクトのルートディレクトリにいるか確認
pwd
# C:\Users\YourName\taisun_agent のような表示になっているか

# パス区切りの問題の場合、Node.js スクリプトを使用
# ✅ 良い例: npm run mcp:health
# ❌ 悪い例: ./scripts/mcp-health-check.sh
```

### 問題 5: Docker エラー

**症状:**
```
Docker daemon is not running
```

**解決策:**
1. Docker Desktop を起動
2. トレイアイコンで Docker が実行中か確認
3. 再度テスト: `docker info`

### 問題 6: 権限エラー

**症状:**
```
Error: EPERM: operation not permitted
```

**解決策:**
1. PowerShell または Git Bash を**管理者として実行**
2. ウイルス対策ソフトがnode_modulesをスキャンしている場合、除外設定を追加

---

## よくある質問

### Q: Git Bash と PowerShell、どちらを使うべきですか？

**A:** どちらでも動作しますが、以下を推奨:
- **Git Bash**: Unix 系コマンドに慣れている場合
- **PowerShell**: Windows ネイティブの環境が好みの場合

このプロジェクトは両方に対応しています。

### Q: WSL (Windows Subsystem for Linux) は使えますか？

**A:** はい、WSL2 で完全に動作します:

```bash
# WSL2 (Ubuntu など) で実行
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
npm install
npm test
```

WSL2 を使う場合、Linux 環境として扱えるため、`.sh` スクリプトもそのまま実行可能です。

### Q: シェルスクリプト（.sh）が実行できません

**A:** Windows では以下の方法があります:

1. **推奨: Node.js 版を使用**
   ```powershell
   npm run mcp:health  # .sh の代わりに .js を使用
   ```

2. **Git Bash で実行**
   ```bash
   ./scripts/mcp-health-check.sh
   ```

3. **WSL で実行**
   ```bash
   bash ./scripts/mcp-health-check.sh
   ```

### Q: Claude Code がインストールされていません

**A:** Claude Code は別途インストールが必要です:

1. [Claude Code 公式ページ](https://claude.ai/code) から CLI をダウンロード
2. インストール後、コマンドラインで `claude` が使えるようになります

### Q: テストが遅いです

**A:** Windows では I/O が遅いため、以下を試してください:

1. **ウイルス対策ソフトの除外設定**
   - `node_modules` フォルダを除外リストに追加

2. **SSD の使用**
   - HDD よりも SSD にプロジェクトを配置

3. **並列実行の調整**
   ```powershell
   # 並列数を減らす
   npm test -- --maxWorkers=2
   ```

### Q: 日本語ファイル名で問題が起きます

**A:** 以下を確認:

1. **UTF-8 エンコーディング**
   - エディタの設定で UTF-8 (BOM なし) を使用

2. **ファイル名の文字化け**
   ```powershell
   git config --global core.quotepath false
   ```

3. **安全な置換ツールを使用**
   ```powershell
   npm run text:safe-replace
   npm run text:utf8-guard
   ```

---

## サポート

### 追加ヘルプ

問題が解決しない場合:

1. **セットアップスクリプトを再実行**
   ```powershell
   npm run setup:windows
   ```

2. **環境診断を実行**
   ```powershell
   npm run doctor
   ```

3. **ログを確認**
   ```powershell
   # テストの詳細ログ
   npm test -- --verbose

   # ビルドログ
   npm run build:all 2>&1 | Out-File build.log
   notepad build.log
   ```

4. **GitHub Issue を作成**
   - [Issues ページ](https://github.com/taiyousan15/taisun_agent/issues)
   - `npm run doctor` の出力を添付
   - OS バージョン、Node.js バージョンを記載

---

## 次のステップ

Windows でのセットアップが完了したら:

1. [QUICK_START.md](QUICK_START.md) - 基本的な使い方
2. [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md) - コンテキスト管理の理解
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 一般的な問題解決

Claude Code を起動して、TAISUN v2 を使い始めましょう！

```powershell
claude
```

あなた: 「セールスレターを書いて」
Claude: /sales-letter スキルで作成します...
```
