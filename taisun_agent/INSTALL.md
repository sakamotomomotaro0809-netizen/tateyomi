# TAISUN Agent 2026 インストールガイド

> ⚠️ **重要**: すべてのコマンドは `taisun_agent` ディレクトリ内で実行してください。
>
> ```bash
> # 正しいディレクトリにいることを確認
> pwd  # → /path/to/taisun_agent と表示されるはず
>
> # package.jsonにtaisun:diagnoseがあることを確認
> grep "taisun:diagnose" package.json
> ```

---

## クイックインストール（5分）

```bash
# 1. リポジトリをクローン
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent

# 2. 依存関係をインストール
npm install

# 3. ビルド
npm run build:all

# 4. Hooksの実行権限を付与
chmod +x .claude/hooks/*.js 2>/dev/null || true

# 5. 高速モード有効化（推奨）
npm run perf:fast

# 6. メモリ対策（長時間セッション向け）
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.zshrc
source ~/.zshrc

# 7. 動作確認
npm run taisun:diagnose
```

---

## 前提条件

| 要件 | バージョン | 確認コマンド |
|------|-----------|-------------|
| Node.js | 18.x 以上 | `node -v` |
| npm | 9.x 以上 | `npm -v` |
| Git | 2.x 以上 | `git --version` |
| Python | 3.10 以上（オプション） | `python3 --version` |

---

## 詳細インストール手順

### Step 1: リポジトリのクローン

```bash
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
```

または SSH:
```bash
git clone git@github.com:taiyousan15/taisun_agent.git
```

### Step 2: 依存関係のインストール

```bash
npm install
```

Python依存（オプション）:
```bash
pip install -r requirements.txt 2>/dev/null || true
```

### Step 3: ビルド

```bash
npm run build:all
```

これにより以下がビルドされます:
- `dist/proxy-mcp/` - MCP Proxy サーバー
- `dist/scripts/` - CLIスクリプト

### Step 4: 実行権限の付与（Unix/Mac）

```bash
chmod +x .claude/hooks/*.js
chmod +x scripts/*.sh 2>/dev/null || true
```

Windowsの場合は不要です。

### Step 5: 診断の実行

```bash
npm run taisun:diagnose
```

以下が表示されれば成功:
```
総合スコア: 100/100点
すべてのシステムが正常に動作しています！
```

---

## Claude Code / Claude Desktopでの使用

### .mcp.json の確認

プロジェクトルートの `.mcp.json` が Claude Code に自動認識されます。

```json
{
  "mcpServers": {
    "taisun-proxy": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/proxy-mcp/server.js"]
    }
  }
}
```

### Claude Desktopの設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "taisun-proxy": {
      "command": "node",
      "args": ["/path/to/taisun_agent/dist/proxy-mcp/server.js"]
    }
  }
}
```

---

## アップデート

```bash
# 1. 最新を取得
git pull origin main

# 2. 依存関係を更新
npm install

# 3. 再ビルド
npm run build:all

# 4. 高速モード有効化（推奨）
npm run perf:fast

# 5. 診断
npm run taisun:diagnose
```

---

## メモリ最適化（重要）

長時間セッションでの「JavaScript heap out of memory」エラーを防ぐための設定です。

### 対策1: Node.jsヒープサイズ増加

```bash
# zshの場合
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.zshrc
source ~/.zshrc

# bashの場合
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.bashrc
source ~/.bashrc
```

### 対策2: 高速モード有効化

```bash
# 高速モード（フック81%削減）
npm run perf:fast

# 状態確認
npm run perf:status

# 通常モードに戻す
npm run perf:normal
```

### 対策3: 安定起動エイリアス（オプション）

```bash
echo 'alias claude-stable="NODE_OPTIONS=\"--max-old-space-size=8192\" claude"' >> ~/.zshrc
source ~/.zshrc

# 使用方法
claude-stable
```

### 各モードの比較

| モード | フック数 | タイムアウト | 用途 |
|--------|---------|------------|------|
| `fast` | 4 | 16秒 | 日常の開発作業（推奨） |
| `normal` | 31 | 83秒 | バランス型 |
| `strict` | 31+ | 100秒+ | 本番ワークフロー |

詳細: [docs/PERFORMANCE_MODE.md](docs/PERFORMANCE_MODE.md)

---

## 環境変数（オプション）

`.env` ファイルを作成:

```bash
# MCP統合（オプション）
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
FIGMA_API_KEY=your_figma_key
PEXELS_API_KEY=your_pexels_key

# Supabase（オプション）
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# Qdrant（オプション）
QDRANT_URL=http://localhost:6333
```

---

## トラブルシューティング

### 「スクリプトが存在しません」エラー

```bash
# 原因: 間違ったディレクトリにいる可能性
# 確認方法:
pwd                                    # 現在のディレクトリを確認
grep "taisun:diagnose" package.json    # スクリプトが存在するか確認

# 正しいディレクトリに移動
cd /path/to/taisun_agent

# 再確認
npm run taisun:diagnose
```

**よくある間違い:**
- 親ディレクトリで実行している（`taisun_agent2026/` ではなく `taisun_agent/` で実行）
- 別のプロジェクトディレクトリで実行している

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf node_modules dist
npm install
npm run build:all
```

### 権限エラー（Mac/Linux）

```bash
chmod +x .claude/hooks/*.js
```

### Node.jsバージョンエラー

```bash
# nvmを使用している場合
nvm install 20
nvm use 20
```

### 診断が失敗する

```bash
# 完全リセット
rm -f .workflow_state.json
rm -rf dist/
npm install
npm run build:all
npm run taisun:diagnose
```

---

## 次のステップ

1. [TAISUN_SETUP_PROMPTS.md](TAISUN_SETUP_PROMPTS.md) - 初期設定プロンプト
2. [README.md](README.md) - 詳細なドキュメント
3. [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md) - 配布ガイド

---

## サポート

- Issues: https://github.com/taiyousan15/taisun_agent/issues
- Discussions: https://github.com/taiyousan15/taisun_agent/discussions
