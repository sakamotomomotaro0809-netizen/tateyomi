# TAISUN v2 トラブルシューティング

よくあるエラーと解決方法をまとめています。

---

## 目次

1. [インストール/ビルドエラー](#インストールビルドエラー)
2. [実行時エラー](#実行時エラー)
3. [MCP関連エラー](#mcp関連エラー)
4. [テストエラー](#テストエラー)
5. [Docker関連](#docker関連)
6. [診断ツール](#診断ツール)

---

## インストール/ビルドエラー

### `npm install` が失敗する

**症状:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解決方法:**
```bash
rm -rf node_modules package-lock.json
npm install
```

それでも解決しない場合:
```bash
npm install --legacy-peer-deps
```

---

### `Cannot find module 'dist/proxy-mcp/server.js'`

**症状:**
```
Error: Cannot find module '/path/to/taisun_agent/dist/proxy-mcp/server.js'
```

**原因:** ビルドが実行されていない

**解決方法:**
```bash
npm run build:all
```

---

### TypeScript コンパイルエラー

**症状:**
```
error TS2304: Cannot find name 'xxx'
error TS2339: Property 'xxx' does not exist on type 'xxx'
```

**解決方法:**
```bash
# 1. キャッシュをクリア
rm -rf dist node_modules/.cache

# 2. 依存関係を再インストール
rm -rf node_modules
npm install

# 3. 再ビルド
npm run build:all
```

---

### Node.js バージョンエラー

**症状:**
```
⚠️ Node.js バージョンが不足しています
現在のバージョン: v16.x.x
必要なバージョン: v18.0.0 以上
```

**解決方法:**

#### nvm を使用:
```bash
nvm install 18
nvm use 18
```

#### nodenv を使用:
```bash
nodenv install 18.0.0
nodenv local 18.0.0
```

#### 直接インストール:
[nodejs.org](https://nodejs.org/) から LTS バージョンをダウンロード

---

## 実行時エラー

### `GITHUB_TOKEN が未設定です`

**症状:**
```
⚠️ GITHUB_TOKEN が未設定です
```

**解決方法:**

1. [GitHub Settings](https://github.com/settings/tokens) でトークンを作成
2. スコープ: `repo`, `workflow`, `read:org` を選択
3. `.env` に追加:
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

---

### `Configuration not found`

**症状:**
```
Error: Configuration not found: observability-report.json
```

**解決方法:**
```bash
cp config/proxy-mcp/observability-report.example.json config/proxy-mcp/observability-report.json
```

その後、ファイルを編集して必要な値を設定。

---

### `ENOENT: no such file or directory`

**症状:**
```
Error: ENOENT: no such file or directory, open 'config/proxy-mcp/xxx.json'
```

**解決方法:**

必要な設定ファイルが存在するか確認:
```bash
ls -la config/proxy-mcp/
```

存在しない場合は `.example` ファイルからコピー:
```bash
cp config/proxy-mcp/xxx.example.json config/proxy-mcp/xxx.json
```

---

### `Invalid JSON`

**症状:**
```
SyntaxError: Unexpected token } in JSON at position xxx
```

**解決方法:**

JSONの文法エラー。以下を確認:
- 末尾のカンマ（JSON では許可されない）
- 引用符の閉じ忘れ
- コメント（JSON では許可されない）

検証ツール:
```bash
cat config/proxy-mcp/xxx.json | python3 -m json.tool
```

---

## MCP関連エラー

### `Failed to spawn MCP server`

**症状:**
```
[proxy-mcp] Failed to spawn MCP server: github
Error: spawn npx ENOENT
```

**原因:** npx が見つからない、または MCP パッケージがインストールできない

**解決方法:**
```bash
# 1. npx の確認
which npx

# 2. MCP サーバーを手動で確認
npx -y @modelcontextprotocol/server-github@0.6.2 --help

# 3. npm キャッシュクリア
npm cache clean --force
```

---

### `MCP server not enabled`

**症状:**
```
[proxy-mcp] MCP server 'github' is not enabled
```

**解決方法:**

`config/proxy-mcp/internal-mcps.local.json` を作成:
```json
{
  "mcps": [
    { "name": "github", "enabled": true }
  ]
}
```

---

### `Required environment variable not set`

**症状:**
```
[proxy-mcp] Required env var GITHUB_TOKEN not set for MCP: github
```

**解決方法:**

1. `.env` ファイルに環境変数を追加
2. MCPの `requiredEnv` を確認:
```bash
grep -A 5 '"name": "github"' config/proxy-mcp/internal-mcps.json
```

---

### `Circuit breaker is open`

**症状:**
```
[proxy-mcp] Circuit breaker is open for MCP: github (5 failures)
```

**原因:** MCPサーバーが5回連続で失敗し、回路が開いた

**解決方法:**

1. 60秒待つ（自動クールダウン）
2. MCPサーバーの状態を確認:
```bash
npm run proxy:smoke
```

3. 強制リセット（再起動）:
```bash
# プロセス再起動
pkill -f "proxy-mcp"
npm run proxy:start
```

---

## テストエラー

### テストが全てスキップされる

**症状:**
```
Test Suites: 0 passed, 0 total
Tests: 0 passed, 50 skipped, 50 total
```

**原因:** オプション機能（Chrome、Docker等）が利用不可

**解決方法:**

これは正常動作です。スキップされるテストは以下の機能が必要:
- Chrome/Playwright（ブラウザテスト）
- Docker（統合テスト）
- GitHub CLI（GitHub連携テスト）

必要な機能をインストールすればテストが実行されます。

---

### Jest のメモリエラー

**症状:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
```

**解決方法:**
```bash
# メモリ制限を増やして実行
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

---

### カバレッジが取得できない

**症状:**
```
Jest: Coverage data for xxx was not found.
```

**解決方法:**
```bash
# カバレッジキャッシュをクリア
rm -rf coverage
npm run test:coverage
```

---

## Docker関連

### `docker: command not found`

**症状:**
```
make: docker: command not found
```

**解決方法:**

Docker がインストールされていません:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) をインストール
- インストール後、Docker を起動

---

### `Cannot connect to the Docker daemon`

**症状:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

**解決方法:**

Docker デーモンが起動していません:
- macOS/Windows: Docker Desktop を起動
- Linux: `sudo systemctl start docker`

---

### `Port already in use`

**症状:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方法:**
```bash
# ポートを使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
GOTENBERG_PORT=3001 make tools-up
```

---

### コンテナが起動しない

**解決方法:**
```bash
# ログを確認
docker compose -f docker-compose.tools.yml logs

# コンテナを再作成
docker compose -f docker-compose.tools.yml down
docker compose -f docker-compose.tools.yml up -d --force-recreate
```

---

## 診断ツール

### 環境診断コマンド

```bash
# 総合診断
npm run doctor

# 出力例:
# ✅ Node.js version: 20.10.0 (required: >=18.0.0)
# ✅ npm version: 10.2.3
# ✅ Git version: 2.43.0
# ✅ GITHUB_TOKEN: Set
# ⚠️ Docker: Not running
# ✅ Build: dist/ exists
```

### MCP ヘルスチェック

```bash
npm run proxy:smoke

# 出力例:
# ✅ Proxy MCP server started
# ✅ system_health tool: OK
# ✅ skill_search tool: OK
# ⚠️ github MCP: Not enabled
```

### システムステータス

```bash
# スケジューラー状態
npm run ops:schedule:status

# エージェント一覧
npm run agents:list

# スキル一覧
npm run skills:list
```

---

## それでも解決しない場合

1. **ログを確認:**
```bash
cat logs/schedule.log
cat logs/error.log
```

2. **Issue を作成:**
[GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues) で報告

Issue に含める情報:
- エラーメッセージ全文
- 実行したコマンド
- `npm run doctor` の出力
- Node.js/npm のバージョン
- OS の種類とバージョン

3. **最新版に更新:**
```bash
git pull origin main
rm -rf node_modules
npm install
```

---

## エラーコード一覧

| コード | 意味 | 対処 |
|--------|------|------|
| `ENOENT` | ファイルが見つからない | パスを確認、ファイルを作成 |
| `EACCES` | 権限がない | `chmod` でパーミッション変更 |
| `EADDRINUSE` | ポートが使用中 | 別のポートを使用、既存プロセスを終了 |
| `ETIMEDOUT` | タイムアウト | ネットワーク確認、リトライ |
| `ERESOLVE` | 依存関係の競合 | `--legacy-peer-deps` を使用 |

---

*このドキュメントで解決しない問題は [GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues) で報告してください。*
