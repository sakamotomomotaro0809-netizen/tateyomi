# TAISUN v2 クイックスタート

**5分で動かす最短手順**

```
git clone → npm install → npm test → Claude Codeで使う
```

---

## 重要: このシステムの正体

> **TAISUN v2は「Claude Code」の拡張機能です。**
>
> ターミナルから直接実行するCLIツールではありません。
> Claude Codeの会話の中で、エージェントやスキルが自動的に使えるようになります。

```
┌─────────────────────────────────────────────────┐
│  Claude Code (AIアシスタント)                    │
│      ↓ .claude/ フォルダを読み込み               │
│  ┌─────────────────────────────────────────┐   │
│  │  TAISUN v2 (77エージェント + 59スキル)    │   │
│  └─────────────────────────────────────────┘   │
│      ↓ あなたの会話をパワーアップ               │
│  「セールスレター書いて」→ 自動で最適なスキル実行 │
└─────────────────────────────────────────────────┘
```

---

## Step 1: クローン (30秒)

```bash
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
```

## Step 2: インストール (2分)

```bash
npm install
```

> `postinstall` で自動ビルドが実行されます。完了まで待ってください。

## Step 3: 動作確認 (2分)

```bash
# テスト実行 (524テスト)
npm test

# 環境診断
npm run doctor
```

**期待される出力:**

```
✅ Node.js version: 18.x.x (required: >=18.0.0)
✅ npm version: 9.x.x
✅ TypeScript compiled successfully
✅ All 524 tests passed
```

---

## Step 4: 実際に使う（最重要）

### 方法A: Claude Code CLI を使う場合

```bash
# taisun_agent ディレクトリで Claude Code を起動
cd taisun_agent
claude
```

起動したら、普通に会話するだけです：

```
あなた: 「セールスレターを書いて」
Claude: /sales-letter スキルを使って作成します...

あなた: 「このコードをレビューして」
Claude: code-reviewer エージェントを起動します...

あなた: 「LPを分析して: https://example.com」
Claude: /lp-analysis スキルで分析します...
```

### 方法B: VS Code + Claude拡張機能を使う場合

1. VS Code で `taisun_agent` フォルダを開く
2. Claude拡張機能が `.claude/` フォルダを自動認識
3. チャットパネルで会話するだけ

### 方法C: Cursor を使う場合

1. Cursor で `taisun_agent` フォルダを開く
2. AI チャットで会話するだけ

---

## 実際の使用例

### 環境・トラブルシューティング（初心者はまずここ）

| やりたいこと | Claude への話しかけ方 |
|-------------|---------------------|
| **環境診断** | 「環境を診断して」 |
| **エラー修正** | 「このエラーを直して」 |
| **ログ分析** | 「エラーログを分析して」 |
| **依存関係チェック** | 「依存関係に問題がないかチェックして」 |

### 開発・品質

| やりたいこと | Claude への話しかけ方 |
|-------------|---------------------|
| **コードレビュー** | 「src/app.ts をセキュリティ観点でレビューして」 |
| **バグ修正** | 「認証エラーを調査して修正して」 |
| **テスト生成** | 「このクラスのユニットテストを書いて」 |
| **アーキテクチャ設計** | 「ECサイトのシステム設計をして」 |
| **セキュリティスキャン** | 「依存関係の脆弱性をチェックして」 |

### マーケティング

| やりたいこと | Claude への話しかけ方 |
|-------------|---------------------|
| **セールスレター作成** | 「オンライン講座のセールスレターを書いて」 |
| **ステップメール作成** | 「7日間のステップメールを作って」 |
| **LP分析** | 「このLPを改善して: https://example.com」 |

> 詳しいフレーズ集は [BEGINNERS_PROMPT_GUIDE.md](./BEGINNERS_PROMPT_GUIDE.md) を参照

### スキル/エージェント一覧の確認

```bash
# 利用可能なスキル一覧
npm run skills:list

# 利用可能なエージェント一覧
npm run agents:list
```

---

## これで基本セットアップ完了

以下は必要に応じて設定してください。

---

## オプション: 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:

```bash
# 必須ではないが、推奨
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx  # GitHub連携に必要
TAISUN_LOCALE=ja                 # 日本語出力
```

## オプション: Dockerツール起動

```bash
# ドキュメント処理ツール (Gotenberg, Stirling-PDF)
make tools-up

# モニタリングスタック (Prometheus, Grafana, Loki)
make monitoring-up
```

## オプション: スケジューラー起動

```bash
# 日次/週次レポートの自動実行
npm run ops:schedule:loop &
```

---

## 次のステップ

| やりたいこと | コマンド/ドキュメント |
|-------------|---------------------|
| **話しかけ方を知りたい** | [BEGINNERS_PROMPT_GUIDE.md](./BEGINNERS_PROMPT_GUIDE.md) ⭐ |
| 利用可能なエージェント一覧 | `npm run agents:list` |
| 利用可能なスキル一覧 | `npm run skills:list` |
| システム全体を理解 | [README.md](../README.md) |
| 設定ファイルの詳細 | [CONFIG.md](./CONFIG.md) |
| エラーが出た場合 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| 開発に参加したい | [CONTRIBUTING.md](./CONTRIBUTING.md) |

---

## よくある質問

### Q: `npm install` が失敗する

```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: テストがスキップされる

一部のテストはオプション機能（Chrome、Docker等）が必要です。スキップは正常動作です。

### Q: `dist/` が見つからない

```bash
npm run build:all
```

---

## 最小動作要件

| 要件 | バージョン |
|------|-----------|
| Node.js | 18.0.0+ |
| npm | 9.0.0+ |
| Git | 2.0.0+ |

オプション:
- Docker (モニタリング/ドキュメント処理)
- GitHub CLI (`gh`) (Issue/PR操作)

---

*問題が解決しない場合は [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。*
