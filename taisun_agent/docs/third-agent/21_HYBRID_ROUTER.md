# Hybrid Router (M2)

## Overview

Hybrid Routerは、ルールベースとセマンティックマッチングを組み合わせたルーティングシステムです。危険な操作を確実にブロックしながら、適切な内部MCPを選択します。

## Architecture

```
Input (user request)
       │
       ▼
┌──────────────────────────────────────┐
│         Hybrid Router                │
│  ┌────────────────────────────────┐  │
│  │   1. Safety Rules (優先)       │  │
│  │   - deny: 即座にブロック       │  │
│  │   - require_human: 人間確認    │  │
│  └────────────────────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌────────────────────────────────┐  │
│  │   2. Semantic Router           │  │
│  │   - タグマッチング             │  │
│  │   - 説明文の類似度             │  │
│  │   - 名前マッチング             │  │
│  └────────────────────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌────────────────────────────────┐  │
│  │   3. Dangerous Op Check        │  │
│  │   - MCPごとの危険操作リスト    │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
       │
       ▼
RouteResult (action, candidates, confidence)
```

## Route Actions

| Action | 説明 | 発生条件 |
|--------|------|----------|
| `allow` | 処理を許可 | 安全なリクエストでMCPがマッチ |
| `deny` | 即座に拒否 | 自動化悪用（captcha回避等） |
| `require_human` | 人間確認が必要 | 危険操作（deploy, delete等） |
| `require_clarify` | 明確化が必要 | マッチするMCPがない |

## Safety Rules

### Categories

1. **deployment**: デプロイ関連
   - Keywords: deploy, production, release, publish, rollout
   - Action: require_human

2. **destructive**: 破壊的操作
   - Keywords: delete, drop, truncate, remove, destroy, wipe
   - Action: require_human

3. **secrets**: 機密情報
   - Keywords: secret, credential, password, token, api_key
   - Action: require_human

4. **billing**: 課金関連
   - Keywords: billing, payment, invoice, subscription, charge
   - Action: require_human

5. **access_control**: 権限管理
   - Keywords: permission, role, access, admin, sudo, root
   - Action: require_human

6. **automation_abuse**: 自動化悪用
   - Keywords: captcha, bypass, scrape, spam, flood
   - Action: deny

## Internal MCP Registry

### Configuration File

`config/proxy-mcp/internal-mcps.json`:

```json
{
  "version": "1.0.0",
  "mcps": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "enabled": true,
      "tags": ["vcs", "code", "issues", "pr", "repository"],
      "shortDescription": "GitHub operations: repos, issues, PRs, code search",
      "dangerousOperations": ["delete", "force-push", "archive"]
    }
  ],
  "routerConfig": {
    "ruleFirst": true,
    "semanticThreshold": 0.70,
    "topK": 5,
    "fallback": "require_human_or_clarify"
  }
}
```

### MCP Definition Fields

| Field | Type | Description |
|-------|------|-------------|
| name | string | MCP識別名 |
| transport | enum | stdio, sse, http |
| command | string | 起動コマンド |
| args | string[] | コマンド引数 |
| enabled | boolean | 有効/無効 |
| tags | string[] | 検索用タグ |
| shortDescription | string | 短い説明（100文字以内） |
| dangerousOperations | string[] | 危険操作キーワード |

## Usage

### skill_run with routing

```typescript
// Preview mode (default) - 従来通り
skillRun('my-skill');

// Route mode - 入力に最適なMCPを検索
skillRun('_', { mode: 'route', input: 'search github issues for bugs' });
```

### Response Example (route mode)

```json
{
  "success": true,
  "data": {
    "action": "allow",
    "reason": "Matched github with confidence 85.0%",
    "confidence": 0.85,
    "candidates": [
      {
        "name": "github",
        "score": "85.0%",
        "description": "GitHub operations: repos, issues, PRs, code search",
        "tags": ["vcs", "code", "issues", "pr", "repository"]
      }
    ],
    "message": "Ready to proceed with github."
  }
}
```

### Response Example (require_human)

```json
{
  "success": true,
  "data": {
    "action": "require_human",
    "reason": "Safety rule [deployment]: matched keyword \"deploy\"",
    "matchedRule": "deployment",
    "message": "This operation requires human confirmation before proceeding."
  }
}
```

## Adding a New Internal MCP

1. `config/proxy-mcp/internal-mcps.json` に追加:

```json
{
  "name": "new-mcp",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@company/mcp-server-new"],
  "enabled": true,
  "tags": ["relevant", "tags", "here"],
  "shortDescription": "Concise description of what this MCP does",
  "dangerousOperations": ["delete", "modify"]
}
```

2. テストを追加（`tests/unit/router.test.ts`）

3. 動作確認:

```typescript
import { skillRun } from './src/proxy-mcp/tools/skill';

const result = skillRun('_', { mode: 'route', input: 'use new-mcp for task' });
console.log(result);
```

## Router Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| ruleFirst | true | 安全ルールを優先 |
| semanticThreshold | 0.70 | マッチング閾値 |
| topK | 5 | 返す候補数 |
| fallback | require_clarify | 閾値未満時の動作 |

## Semantic Matching Algorithm

スコア計算式:

```
score = (tagMatches / queryTokens) * 0.5
      + (descMatches / queryTokens) * 0.35
      + (nameMatches / queryTokens) * 0.15
      + exactTagBonus (0.2)
      + nameInQueryBonus (0.3)
```

- タグマッチング: 重み 0.5
- 説明文マッチング: 重み 0.35
- 名前マッチング: 重み 0.15
- 完全一致ボーナス: +0.2
- 名前がクエリに含まれる: +0.3

## Failure Modes

### No MCP Matches

```json
{
  "action": "require_clarify",
  "reason": "No MCP matched with confidence >= 0.70. Please clarify...",
  "candidates": [],
  "confidence": 0
}
```

### Safety Rule Triggered

```json
{
  "action": "deny",
  "reason": "Safety rule [automation_abuse]: matched keyword \"captcha\"",
  "matchedRule": "automation_abuse"
}
```

### Dangerous Operation on Matched MCP

```json
{
  "action": "require_human",
  "reason": "Operation may involve dangerous action for github. Human confirmation required.",
  "matchedRule": "dangerous_operation",
  "candidates": [...],
  "confidence": 0.85
}
```

## File Structure

```
src/proxy-mcp/
├── router/
│   ├── index.ts      # Main router (route, isSafe, explainRoute)
│   ├── types.ts      # Type definitions
│   ├── rules.ts      # Safety rules evaluation
│   └── semantic.ts   # Semantic matching
├── internal/
│   ├── registry.ts   # MCP registry management
│   └── normalize.ts  # Text normalization utilities
└── tools/
    └── skill.ts      # Updated with routing support

config/proxy-mcp/
└── internal-mcps.json  # MCP definitions

tests/unit/
└── router.test.ts      # Router tests
```

## Testing

```bash
# Run router tests
npm test -- --testPathPattern=router

# Run all unit tests
npm run test:unit
```
