# API Key Troubleshooting Guide

「Invalid API key - Please run /login」エラーの完全解決ガイド。

---

## ⚠️ 「OAuth token has expired」と表示された場合

エラーに **「OAuth token has expired」「Please run /login」** と出ているときは、**ターミナルで `/login` は使えません**（zsh がファイルとして解釈し `no such file or directory` になります）。

**ターミナルで実行する正しいコマンド:**

```bash
claude logout
claude login
```

または API キーを直接設定する（推奨）:

```bash
# ~/.zshrc に追加
export ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxx"
source ~/.zshrc
```

---

## クイック診断

```bash
# Claude Codeで実行
/status          # 認証状態確認
/mcp             # MCPサーバー状態確認
/doctor          # 問題診断
```

---

## 原因別解決策

### 1. Claude Code CLI認証エラー

#### 症状
- `/login`を実行しても認証が保持されない
- SSH接続時にエラーが出る

#### 解決策A: APIキー直接設定（推奨）

```bash
# ~/.zshrc に追加
export ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxx"

# 反映
source ~/.zshrc
```

#### 解決策B: macOS Keychainアンロック（SSH接続時）

```bash
# SSH接続時に実行
security unlock-keychain ~/Library/Keychains/login.keychain-db

# 自動化する場合、~/.zshrc に追加:
claude() {
  if [ -n "$SSH_CONNECTION" ] && [ -z "$KEYCHAIN_UNLOCKED" ]; then
    security unlock-keychain ~/Library/Keychains/login.keychain-db
    export KEYCHAIN_UNLOCKED=true
  fi
  command claude "$@"
}
```

#### 解決策C: 再ログイン

**注意**: 「Please run /login」の `/login` は Claude Code の**チャット内**で打つスラッシュコマンドです。ターミナルでは次のコマンドを使います。

```bash
claude logout
claude login
```

---

### 2. MCPサーバー（gpt-researcher等）のAPIキーエラー

#### 症状
- gpt-researcherで「Invalid API key」
- figmaで認証エラー
- MCPツールが使えない

#### 原因
`.mcp.json`の環境変数展開（`${VAR}`）がMCPサブプロセスで機能しない。

#### 解決策A: ~/.claude/settings.json に設定（推奨）

```json
{
  "env": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxx",
    "TAVILY_API_KEY": "tvly-xxxxxxxxxxxxxxxxxxxx",
    "FIGMA_API_KEY": "figd_xxxxxxxxxxxxxxxxxxxx"
  }
}
```

#### 解決策B: シェル環境変数を設定

```bash
# ~/.zshrc に追加
export OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxx"
export TAVILY_API_KEY="tvly-xxxxxxxxxxxxxxxxxxxx"
export FIGMA_API_KEY="figd_xxxxxxxxxxxxxxxxxxxx"

# 反映
source ~/.zshrc

# Claude Codeを再起動
```

#### 解決策C: .mcp.json に直接記載（セキュリティ注意）

```json
{
  "mcpServers": {
    "gpt-researcher": {
      "env": {
        "OPENAI_API_KEY": "sk-実際のキー",
        "TAVILY_API_KEY": "tvly-実際のキー"
      }
    }
  }
}
```

---

### 3. OpenRouter APIエラー

#### 症状
- `OPENROUTER_API_KEY`関連のエラー

#### 解決策

```bash
# 環境変数名を確認（OPENAIではなくOPENROUTER）
export OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxxxxxxxxx"

# APIキーの検証
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello"}]}'
```

クレジット不足の場合は[OpenRouter Dashboard](https://openrouter.ai/keys)で確認。

---

## 設定ファイルテンプレート

### ~/.zshrc（推奨設定）

```bash
# ===========================================
# AI API Keys
# ===========================================
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export OPENAI_API_KEY="sk-..."
export OPENROUTER_API_KEY="sk-or-v1-..."
export TAVILY_API_KEY="tvly-..."
export FIGMA_API_KEY="figd_..."

# ===========================================
# Vector Database
# ===========================================
export QDRANT_URL="http://localhost:6333"
export QDRANT_COLLECTION_NAME="taisun_memory"

# ===========================================
# macOS SSH Keychain Fix
# ===========================================
claude() {
  if [ -n "$SSH_CONNECTION" ] && [ -z "$KEYCHAIN_UNLOCKED" ]; then
    security unlock-keychain ~/Library/Keychains/login.keychain-db
    export KEYCHAIN_UNLOCKED=true
  fi
  command claude "$@"
}
```

### ~/.claude/settings.json

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-api03-...",
    "OPENAI_API_KEY": "sk-...",
    "TAVILY_API_KEY": "tvly-...",
    "FIGMA_API_KEY": "figd_..."
  }
}
```

---

## トラブルシューティングフロー

```
「Invalid API key」エラー発生
            │
            ▼
    ┌───────────────────┐
    │ どこでエラー？    │
    └───────────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
Claude   MCP     OpenRouter
Code   サーバー    API
    │       │       │
    ▼       ▼       ▼
/status  /mcp    curl
確認     確認     テスト
    │       │       │
    ▼       ▼       ▼
APIキー  env設定  クレジット
設定     確認     確認
```

---

## よくある質問

### Q: 環境変数を設定したのに反映されない

```bash
# ターミナルを新しく開くか、以下を実行
source ~/.zshrc

# Claude Codeを再起動
# /mcp で設定が反映されているか確認
```

### Q: .envファイルが読み込まれない

MCPサーバーは`.env`ファイルを自動で読み込みません。
`~/.claude/settings.json`の`env`セクションまたは`~/.zshrc`に設定してください。

### Q: セキュリティが心配

- `.env`や`settings.json`は`chmod 600`で権限を制限
- APIキーをGitにコミットしない（`.gitignore`に追加済み）
- 必要最小限の権限を持つAPIキーを使用

---

## サポート

解決しない場合:
1. [GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues)に報告
2. `/doctor`の出力を添付
3. エラーメッセージの全文を共有
