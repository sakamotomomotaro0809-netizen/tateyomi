# TAISUN v2 コントリビューションガイド

TAISUN v2への貢献に感謝します。このガイドでは、エージェント、スキル、MCPの追加方法を説明します。

---

## 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [エージェントの追加](#エージェントの追加)
3. [スキルの追加](#スキルの追加)
4. [MCPサーバーの追加](#mcpサーバーの追加)
5. [コーディング規約](#コーディング規約)
6. [プルリクエストの作成](#プルリクエストの作成)

---

## 開発環境のセットアップ

```bash
# 1. リポジトリをフォーク & クローン
git clone https://github.com/YOUR_USERNAME/taisun_agent.git
cd taisun_agent

# 2. 依存関係をインストール
npm install

# 3. ブランチを作成
git checkout -b feature/your-feature-name

# 4. 開発開始
npm run dev
```

---

## エージェントの追加

### ファイル構造

```
.claude/agents/
├── 00-ait42-coordinator.md      # コーディネーター（優先度: 1）
├── ait42-backend-developer.md   # 専門エージェント
└── your-new-agent.md            # 新規エージェント
```

### エージェント定義テンプレート

`.claude/agents/ait42-your-agent.md`:

```markdown
---
name: your-agent-name
description: "エージェントの説明（1行で簡潔に）"
tools: All tools  # または特定のツール: Read, Write, Edit, Bash, Grep, Glob
model: sonnet     # sonnet | opus | haiku
priority: 5       # 1-10 (低いほど優先)
---

<role>
**Expert Level**: [専門分野と経験年数]

**Primary Responsibility**: [主な責任]

**Domain Expertise**:
- [専門領域1]
- [専門領域2]
- [専門領域3]

**Constraints**:
- [制約1]
- [制約2]
</role>

<capabilities>
**[能力カテゴリ1]**:
1. [具体的な能力]
2. [具体的な能力]

**[能力カテゴリ2]**:
1. [具体的な能力]
2. [具体的な能力]
</capabilities>

<output_template>
## [出力タイトル]

**[セクション1]**: [説明]

**[セクション2]**: [説明]

**Quality Metrics**:
- [メトリクス1]: [基準]
- [メトリクス2]: [基準]
</output_template>

<execution_examples>
## Example 1: [シナリオ名]

**User**: "[ユーザー入力例]"

**Analysis**: [分析内容]

**Action**: [実行アクション]

**Output**: [期待される出力]
</execution_examples>
```

### 命名規則

- ファイル名: `ait42-{agent-name}.md`（ケバブケース）
- エージェント名: `{agent-name}`（ケバブケース）
- 説明: 英語で1行、日本語でも可

### 登録確認

```bash
npm run agents:list | grep your-agent-name
```

---

## スキルの追加

### ファイル構造

```
.claude/skills/
├── copywriting-helper/
│   └── SKILL.md
├── your-new-skill/
│   └── SKILL.md
└── ...
```

### スキル定義テンプレート

`.claude/skills/your-skill/SKILL.md`:

```markdown
---
name: your-skill-name
description: スキルの説明（日本語で1行）
---

# Your Skill Name

スキルの概要説明。

## Instructions

1. [手順1]
2. [手順2]
3. [手順3]
4. [手順4]

## Available Knowledge

### [ナレッジカテゴリ1]
- [ナレッジ項目1]
- [ナレッジ項目2]

### [ナレッジカテゴリ2]
- [ナレッジ項目1]
- [ナレッジ項目2]

## Usage Examples

```
ユーザー: [入力例1]
→ [処理内容と出力]

ユーザー: [入力例2]
→ [処理内容と出力]
```

## Guidelines

- [ガイドライン1]
- [ガイドライン2]
- [ガイドライン3]
```

### 命名規則

- ディレクトリ名: `{skill-name}/`（ケバブケース）
- スキル名: `{skill-name}`（ケバブケース）
- 説明: 日本語推奨

### 登録確認

```bash
npm run skills:list | grep your-skill-name
```

---

## MCPサーバーの追加

### 1. 定義ファイルに追加

`config/proxy-mcp/internal-mcps.json`:

```json
{
  "mcps": [
    {
      "name": "your-mcp",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@your-org/mcp-server@1.0.0"],
      "enabled": false,
      "versionPin": "1.0.0",
      "requiredEnv": ["YOUR_API_KEY"],
      "tags": ["category1", "category2"],
      "shortDescription": "MCPの簡潔な説明",
      "dangerousOperations": ["delete", "write"],
      "allowlist": ["read_*", "list_*", "get_*"],
      "resilience": {
        "timeout": { "spawnMs": 10000, "toolCallMs": 30000 },
        "retry": { "maxAttempts": 2, "backoffMs": 500, "jitter": true },
        "circuit": { "enabled": true, "failureThreshold": 5, "cooldownMs": 60000 }
      }
    }
  ]
}
```

### 2. 設定項目の説明

| 項目 | 必須 | 説明 |
|------|------|------|
| `name` | はい | MCP識別子（一意） |
| `transport` | はい | 通信方式（`stdio` or `http`） |
| `command` | はい | 実行コマンド |
| `args` | はい | コマンド引数 |
| `enabled` | はい | デフォルト有効/無効 |
| `versionPin` | 推奨 | バージョン固定 |
| `requiredEnv` | 推奨 | 必要な環境変数 |
| `tags` | 推奨 | 検索用タグ |
| `shortDescription` | 推奨 | 説明文 |
| `dangerousOperations` | 推奨 | 危険な操作のリスト |
| `allowlist` | 推奨 | 許可するツールパターン |
| `resilience` | 推奨 | タイムアウト/リトライ設定 |

### 3. ローカルで有効化

`config/proxy-mcp/internal-mcps.local.json`:

```json
{
  "mcps": [
    { "name": "your-mcp", "enabled": true }
  ]
}
```

### 4. テスト

```bash
# 環境変数を設定
export YOUR_API_KEY=xxx

# スモークテスト
npm run proxy:smoke
```

---

## コーディング規約

### TypeScript

```typescript
// ✅ 良い例
export interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
}

// ❌ 悪い例
export interface agentConfig {  // PascalCase を使用
  Name: string;  // camelCase を使用
}
```

### ファイル命名

| 種類 | 規則 | 例 |
|------|------|-----|
| TypeScript | ケバブケース | `agent-config.ts` |
| テスト | `.test.ts` サフィックス | `agent-config.test.ts` |
| エージェント | `ait42-{name}.md` | `ait42-backend-developer.md` |
| スキル | `{name}/SKILL.md` | `copywriting-helper/SKILL.md` |

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従う:

```
feat(agent): add new security-scanner agent
fix(mcp): resolve timeout issue in github MCP
docs: update CONTRIBUTING.md
chore: update dependencies
test: add unit tests for router
```

**タイプ:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `chore`: メンテナンス
- `test`: テスト
- `refactor`: リファクタリング

---

## プルリクエストの作成

### 1. 品質ゲートを通過

```bash
# 全てパスすること
npm test                    # テスト
npm run lint               # リント
npm run typecheck          # 型チェック
npm run security:scan      # セキュリティスキャン
```

### 2. テストカバレッジ

新しいコードには 80% 以上のテストカバレッジが必要:

```bash
npm run test:coverage
```

### 3. PR テンプレート

```markdown
## 概要
[変更の概要を1-3行で]

## 変更内容
- [変更1]
- [変更2]
- [変更3]

## テスト
- [ ] ユニットテスト追加
- [ ] 統合テスト追加
- [ ] 手動テスト実施

## スクリーンショット（該当する場合）
[スクリーンショット]

## チェックリスト
- [ ] `npm test` が通る
- [ ] `npm run lint` が通る
- [ ] `npm run typecheck` が通る
- [ ] ドキュメントを更新した（必要な場合）
```

### 4. レビュー基準

- コードレビュースコア: 80/100 以上
- テストカバレッジ: 80% 以上
- セキュリティスキャン: Critical/High ゼロ
- CI/CD パイプライン: 全てグリーン

---

## ディレクトリ構造リファレンス

```
taisun_agent/
├── .claude/
│   ├── agents/          # エージェント定義 (*.md)
│   ├── skills/          # スキル定義 (*/SKILL.md)
│   ├── commands/        # コマンド定義 (*.md)
│   ├── mcp-servers/     # カスタムMCPサーバー
│   ├── mcp-tools/       # MCPツール定義
│   └── memory/          # 学習システム
│
├── config/
│   └── proxy-mcp/       # MCP設定
│       ├── internal-mcps.json
│       └── *.schema.json
│
├── src/
│   └── proxy-mcp/       # Proxy MCP実装
│       ├── server.ts
│       ├── tools/
│       ├── router/
│       └── ...
│
├── tests/
│   ├── unit/            # ユニットテスト
│   └── integration/     # 統合テスト
│
└── docs/                # ドキュメント
```

---

## 質問・サポート

- [GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues) - バグ報告、機能要望
- [GitHub Discussions](https://github.com/taiyousan15/taisun_agent/discussions) - 質問、ディスカッション

---

*ご協力ありがとうございます！*
