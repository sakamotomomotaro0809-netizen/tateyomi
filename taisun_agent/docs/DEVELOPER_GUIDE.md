# TAISUN v2 開発者ガイド

## 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [エージェントの追加](#エージェントの追加)
3. [スキルの追加](#スキルの追加)
4. [MCP サーバーの設定](#mcp-サーバーの設定)
5. [テストの書き方](#テストの書き方)
6. [コーディング規約](#コーディング規約)
7. [デバッグ](#デバッグ)

---

## 開発環境のセットアップ

### 必要なツール

| ツール | バージョン | 用途 |
|-------|----------|------|
| Node.js | 18.x 以上 | ランタイム |
| npm | 9.x 以上 | パッケージ管理 |
| Git | 2.x 以上 | バージョン管理 |
| Claude Code CLI | 最新版 | AI開発支援 |

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .env を編集してAPIキー等を設定

# 4. セットアップ検証
npm test
npm run lint
npm run typecheck
```

### VS Code 推奨拡張機能

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "GitHub.copilot"
  ]
}
```

---

## エージェントの追加

### エージェント定義の構造

エージェントは `.claude/agents/` ディレクトリに YAML 形式で定義します。

```
.claude/agents/
├── coordinators/      # コーディネーター
├── architecture/      # 設計系
├── development/       # 開発系
├── quality/           # 品質保証系
├── operations/        # 運用系
├── documentation/     # ドキュメント系
├── analysis/          # 分析系
├── specialized/       # 特化型
├── multi-agent/       # マルチエージェント
└── process/           # プロセス系
```

### 新規エージェントの作成

#### 1. YAML ファイルの作成

```yaml
# .claude/agents/development/new-agent.yaml
name: new-agent
description: |
  新しいエージェントの説明（ツール一覧に表示される）

system_prompt: |
  ## Role
  あなたは〇〇の専門家です。

  ## Capabilities
  - 機能1
  - 機能2
  - 機能3

  ## Guidelines
  1. ガイドライン1
  2. ガイドライン2

  ## Output Format
  - 出力形式の説明

model: sonnet  # haiku | sonnet | opus
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
```

#### 2. CLAUDE.md への登録

`.claude/CLAUDE.md` のエージェント一覧に追加します：

```markdown
### 3. Development (開発)
- `backend-developer` - バックエンド実装
- `frontend-developer` - フロントエンド実装
- `new-agent` - 新しいエージェントの説明  # 追加
```

#### 3. テストの作成

```javascript
// tests/agents/new-agent.test.js
describe('new-agent', () => {
  it('should handle basic task', async () => {
    const result = await invokeAgent('new-agent', 'テストプロンプト');
    expect(result).toBeDefined();
  });
});
```

### エージェント設計のベストプラクティス

| 項目 | 推奨 |
|------|------|
| 責務の明確化 | 1エージェント1責務 |
| プロンプト長 | 500-2000文字 |
| ツール数 | 必要最小限（3-6個） |
| モデル選択 | 複雑度に応じて選択 |

### モデル選択ガイドライン

```
┌────────────────────────────────────────────┐
│                  タスク複雑度               │
├──────────┬──────────────┬─────────────────┤
│  haiku   │    sonnet    │      opus       │
│          │              │                 │
│ ・簡単な  │ ・標準的な   │ ・複雑な設計    │
│  修正    │  実装       │ ・深い分析      │
│ ・フォー  │ ・レビュー   │ ・アーキテクチャ │
│  マット  │ ・テスト生成 │  決定          │
└──────────┴──────────────┴─────────────────┘
```

---

## スキルの追加

### スキル定義の構造

スキルは `.claude/skills/` ディレクトリに配置します。

```
.claude/skills/
├── marketing/           # マーケティング系
│   ├── sales-letter/
│   │   └── SKILL.md
│   ├── step-mail/
│   │   └── SKILL.md
│   └── ...
├── creative/            # クリエイティブ系
├── infrastructure/      # インフラ系
└── research/            # リサーチ系
```

### 新規スキルの作成

#### 1. ディレクトリの作成

```bash
mkdir -p .claude/skills/category/new-skill
```

#### 2. SKILL.md の作成

```markdown
# New Skill

スキルの説明。

## When to Use This Skill

以下の場合にこのスキルを使用：
- 「〇〇して」
- 「△△を作って」

## Instructions

1. 手順1
2. 手順2
3. 手順3

## Output Format

出力形式の説明

## Examples

### 例1: 基本的な使用

```
ユーザー: /new-skill 引数
→ 期待される動作
```

## References

- 参考リソース1
- 参考リソース2
```

#### 3. settings.json への登録

`.claude/settings.json` にスキルを登録します：

```json
{
  "skills": {
    "new-skill": {
      "path": ".claude/skills/category/new-skill/SKILL.md",
      "description": "新しいスキルの説明"
    }
  }
}
```

### スキル設計のベストプラクティス

1. **明確なユースケース**: いつ使うべきか明示
2. **具体的な手順**: ステップバイステップで記述
3. **出力形式の定義**: 期待される出力を明確に
4. **例の充実**: 実際の使用例を複数記載

---

## MCP サーバーの設定

### MCP 設定ファイル

`.mcp.json` で MCP サーバーを定義します。

```json
{
  "mcpServers": {
    "postgres-ro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${POSTGRES_MCP_DSN}"],
      "env": {
        "POSTGRES_MCP_DSN": "postgresql://user:pass@host:5432/db"
      }
    },
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp",
      "headers": {
        "Authorization": "Bearer ${NOTION_API_KEY}"
      }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    }
  }
}
```

### 新規 MCP サーバーの追加

#### 1. 設定の追加

```json
{
  "mcpServers": {
    "new-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-xxx"],
      "env": {
        "API_KEY": "${NEW_SERVER_API_KEY}"
      }
    }
  }
}
```

#### 2. 環境変数の設定

```bash
# .env
NEW_SERVER_API_KEY=your-api-key-here
```

#### 3. 接続テスト

```bash
# MCP サーバーの起動テスト
npx @modelcontextprotocol/server-xxx --help
```

### サポートされる MCP タイプ

| タイプ | 説明 | 例 |
|-------|------|-----|
| stdio | 標準入出力 | postgres, filesystem |
| http | HTTP/HTTPS | notion |
| builtin | 組み込み | ide |

---

## テストの書き方

### テスト構造

```
tests/
├── unit/              # ユニットテスト
│   ├── services/
│   └── utils/
├── integration/       # 統合テスト
│   ├── api/
│   └── mcp/
└── e2e/               # E2Eテスト
```

### ユニットテストの例

```javascript
// tests/unit/services/user.test.js
import { UserService } from '../../../src/services/user';

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const result = await userService.createUser(userData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email'
      };

      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

### 統合テストの例

```javascript
// tests/integration/api/user.test.js
import request from 'supertest';
import { app } from '../../../src/app';

describe('User API', () => {
  it('POST /api/users should create user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'Test User',
        email: 'test@example.com'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });
});
```

### テスト実行コマンド

```bash
# 全テスト実行
npm test

# カバレッジ付き
npm run test:coverage

# 特定のファイルのみ
npm test -- tests/unit/services/user.test.js

# ウォッチモード
npm test -- --watch
```

### カバレッジ要件

| メトリクス | 最低基準 |
|-----------|---------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

---

## コーディング規約

### TypeScript スタイルガイド

#### 命名規則

```typescript
// クラス: PascalCase
class UserService { }

// インターフェース: PascalCase + I プレフィックス（オプション）
interface User { }
interface IUserRepository { }

// 関数・メソッド: camelCase
function getUserById(id: string) { }

// 変数: camelCase
const userList = [];

// 定数: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// ファイル名: kebab-case
// user-service.ts
```

#### 型定義

```typescript
// 明示的な型注釈を推奨
function processUser(user: User): ProcessedUser {
  // ...
}

// any は避ける
// ❌ function process(data: any)
// ✅ function process(data: unknown)

// union type の活用
type Status = 'pending' | 'active' | 'inactive';
```

### ESLint 設定

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Prettier 設定

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type

| Type | 説明 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| style | フォーマット |
| refactor | リファクタリング |
| test | テスト |
| chore | その他 |

#### 例

```
feat(agents): add new backend-developer agent

- Implement REST API development capabilities
- Add database integration support
- Include authentication handling

Closes #123
```

---

## デバッグ

### ログ出力

```typescript
import { logger } from '../utils/logger';

// レベル別ログ
logger.debug('Debug information');
logger.info('Information message');
logger.warn('Warning message');
logger.error('Error occurred', { error });
```

### 環境変数でのデバッグモード

```bash
# .env
DEBUG=true
LOG_LEVEL=debug
```

### Claude Code でのデバッグ

```bash
# 詳細ログを有効化
claude --verbose

# 特定のエージェントをデバッグ
claude --debug-agent=backend-developer
```

### よくある問題と解決策

#### MCP 接続エラー

```bash
# 問題: MCP サーバーに接続できない
# 解決: 環境変数と認証情報を確認
echo $POSTGRES_MCP_DSN
echo $NOTION_API_KEY
```

#### エージェント読み込みエラー

```bash
# 問題: エージェントが見つからない
# 解決: YAML 構文を確認
npx yaml-lint .claude/agents/**/*.yaml
```

#### テスト失敗

```bash
# 問題: テストがタイムアウト
# 解決: タイムアウト値を増加
npm test -- --testTimeout=30000
```

---

## 次のステップ

- [API リファレンス](API_REFERENCE.md) - 各エージェント・スキルの詳細仕様
- [運用ガイド](OPERATIONS.md) - デプロイ・監視・トラブルシューティング
- [アーキテクチャ](ARCHITECTURE.md) - システム構成図

---

Built with Claude Code
