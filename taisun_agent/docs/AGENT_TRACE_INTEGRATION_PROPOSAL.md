# Agent Trace 統合提案書

**作成日**: 2026-02-04
**バージョン**: 1.0
**ステータス**: 提案

---

## 1. エグゼクティブサマリー

Agent Traceは、AI生成コードの帰属を追跡するオープン仕様です。TAISUN Agentに統合することで、以下のメリットが期待できます：

- **透明性向上**: AI/人間の貢献を明確に区別
- **デバッグ効率化**: コード変更の「なぜ」を追跡可能
- **コンプライアンス対応**: 監査証跡の自動生成
- **エコシステム互換**: Cursor、Devin等との相互運用性

---

## 2. 技術概要

### 2.1 Agent Trace仕様

```json
{
  "version": "0.1.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-04T12:00:00Z",
  "files": [
    {
      "path": "src/utils/helper.ts",
      "conversations": [
        {
          "contributor_type": "ai",
          "model": "anthropic/claude-opus-4-5-20251101",
          "ranges": [
            { "start_line": 10, "end_line": 25 }
          ],
          "context_url": "https://claude.ai/conversation/xxx"
        }
      ]
    }
  ],
  "tool": {
    "name": "taisun-agent",
    "version": "2.10.1"
  },
  "metadata": {
    "dev.taisun": {
      "skill_used": "tdd-workflow",
      "agent_id": "code-reviewer"
    }
  }
}
```

### 2.2 貢献者タイプ

| タイプ | コード | 説明 |
|--------|--------|------|
| Human | `human` | 人間が直接記述 |
| AI | `ai` | AIが生成 |
| Mixed | `mixed` | 人間が編集したAIコード |
| Unknown | `unknown` | 起源不明 |

---

## 3. 統合アーキテクチャ

### 3.1 Phase 1: 基本的なトレース記録（推奨開始点）

```
┌─────────────────────────────────────────────────────────────┐
│  TAISUN Agent                                               │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Claude Code    │───▶│  PostToolUse    │                │
│  │  (Edit/Write)   │    │  Hook           │                │
│  └─────────────────┘    └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│                         ┌─────────────────┐                │
│                         │  Trace Store    │                │
│                         │  (JSON Files)   │                │
│                         └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│                         .agent-trace/                       │
│                         └── traces/                         │
│                             └── 2026-02-04_xxx.json        │
└─────────────────────────────────────────────────────────────┘
```

#### 実装ファイル

```
.claude/
├── hooks/
│   └── agent-trace-capture.js    # PostToolUseフック
├── lib/
│   └── trace-store.ts            # トレースストレージ
└── settings.json                 # フック設定
```

### 3.2 Phase 2: MCP・OpenTelemetry連携

```
┌─────────────────────────────────────────────────────────────┐
│  分散トレーシング統合                                        │
│                                                             │
│  TAISUN Agent                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────┐                                       │
│  │  MCP Request    │──── traceparent header ────▶          │
│  │  (with meta)    │                                       │
│  └─────────────────┘                                       │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  OpenTelemetry  │───▶│  Trace Backend  │                │
│  │  MCP Server     │    │  (Jaeger/Zipkin)│                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Phase 3: 高度な機能

- **Context Graph**: コード変更と会話の関連付け
- **ダッシュボード**: AI/人間貢献率の可視化
- **PRレビュー統合**: Diff + Agent Traceの併用レビュー

---

## 4. 実装計画

### Phase 1: 基本実装（推奨：1-2週間）

| タスク | 優先度 | 工数 |
|--------|--------|------|
| trace-store.ts実装 | 高 | 2日 |
| PostToolUseフック作成 | 高 | 1日 |
| JSON保存機能 | 高 | 1日 |
| テスト作成 | 中 | 2日 |
| ドキュメント | 中 | 1日 |

### Phase 2: MCP連携（2-3週間）

| タスク | 優先度 | 工数 |
|--------|--------|------|
| OpenTelemetry MCP Server導入 | 中 | 3日 |
| traceparent伝播実装 | 中 | 2日 |
| バックエンド接続設定 | 中 | 2日 |
| 統合テスト | 中 | 3日 |

### Phase 3: 高度な機能（3-4週間）

| タスク | 優先度 | 工数 |
|--------|--------|------|
| Context Graph構築 | 低 | 5日 |
| ダッシュボード作成 | 低 | 5日 |
| PRレビュー統合 | 低 | 3日 |

---

## 5. 具体的な実装コード

### 5.1 trace-store.ts

```typescript
// .claude/lib/trace-store.ts

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface TraceRange {
  start_line: number;
  end_line: number;
}

interface Conversation {
  contributor_type: 'human' | 'ai' | 'mixed' | 'unknown';
  model?: string;
  ranges: TraceRange[];
  context_url?: string;
}

interface FileTrace {
  path: string;
  conversations: Conversation[];
}

interface TraceRecord {
  version: string;
  id: string;
  timestamp: string;
  files: FileTrace[];
  vcs?: {
    type: 'git' | 'jj' | 'hg' | 'svn';
    commit?: string;
  };
  tool?: {
    name: string;
    version: string;
  };
  metadata?: Record<string, unknown>;
}

export class TraceStore {
  private traceDir: string;

  constructor(projectRoot: string) {
    this.traceDir = path.join(projectRoot, '.agent-trace', 'traces');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.traceDir)) {
      fs.mkdirSync(this.traceDir, { recursive: true });
    }
  }

  createTrace(files: FileTrace[], metadata?: Record<string, unknown>): TraceRecord {
    const trace: TraceRecord = {
      version: '0.1.0',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      files,
      tool: {
        name: 'taisun-agent',
        version: process.env.TAISUN_VERSION || '2.10.1'
      },
      metadata: {
        'dev.taisun': metadata || {}
      }
    };

    return trace;
  }

  save(trace: TraceRecord): string {
    const filename = `${trace.timestamp.split('T')[0]}_${trace.id.slice(0, 8)}.json`;
    const filepath = path.join(this.traceDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
    return filepath;
  }

  list(): TraceRecord[] {
    const files = fs.readdirSync(this.traceDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const content = fs.readFileSync(path.join(this.traceDir, f), 'utf-8');
      return JSON.parse(content) as TraceRecord;
    });
  }
}
```

### 5.2 PostToolUseフック

```javascript
// .claude/hooks/agent-trace-capture.js

const fs = require('fs');
const path = require('path');

// stdin からイベントデータを読み取り
let inputData = '';
process.stdin.on('data', chunk => inputData += chunk);
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(inputData);

    // Edit/Write ツールの場合のみトレース
    if (!['Edit', 'Write'].includes(event.tool_name)) {
      process.exit(0);
    }

    const filePath = event.tool_input?.file_path;
    if (!filePath) {
      process.exit(0);
    }

    // トレースレコード作成
    const trace = {
      version: '0.1.0',
      id: require('crypto').randomUUID(),
      timestamp: new Date().toISOString(),
      files: [{
        path: path.relative(process.cwd(), filePath),
        conversations: [{
          contributor_type: 'ai',
          model: 'anthropic/claude-opus-4-5-20251101',
          ranges: [{ start_line: 1, end_line: -1 }] // 全体
        }]
      }],
      tool: {
        name: 'taisun-agent',
        version: '2.10.1'
      }
    };

    // 保存
    const traceDir = path.join(process.cwd(), '.agent-trace', 'traces');
    if (!fs.existsSync(traceDir)) {
      fs.mkdirSync(traceDir, { recursive: true });
    }

    const filename = `${trace.timestamp.split('T')[0]}_${trace.id.slice(0, 8)}.json`;
    fs.writeFileSync(
      path.join(traceDir, filename),
      JSON.stringify(trace, null, 2)
    );

    process.exit(0);
  } catch (e) {
    // エラーでも処理を止めない
    process.exit(0);
  }
});
```

### 5.3 settings.json への追加

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/agent-trace-capture.js"
          }
        ]
      }
    ]
  }
}
```

---

## 6. 既存機能との統合

### 6.1 Claude Code Co-Authored-By との併用

| 機能 | 粒度 | 用途 |
|------|------|------|
| Agent Trace | 行レベル | 詳細な帰属追跡 |
| Git Trailer | コミットレベル | 簡易的な帰属表示 |

両方を併用することで多層的な帰属追跡が可能。

### 6.2 WORKFLOW FIDELITY CONTRACTとの連携

```yaml
# ワークフロー状態にAgent Trace IDを含める
workflow_state:
  current_phase: implementation
  agent_trace_ids:
    - "550e8400-e29b-41d4-a716-446655440000"
    - "550e8400-e29b-41d4-a716-446655440001"
```

### 6.3 13層防御システムへの追加（オプション）

| Layer | Guard | 追加機能 |
|-------|-------|----------|
| 13 | Agent Trace | 全編集操作のトレース記録 |

---

## 7. 期待される効果

### 定量的効果

| 指標 | 期待値 |
|------|--------|
| デバッグ時間短縮 | 30-50% |
| コードレビュー効率化 | 20-30% |
| 監査対応工数削減 | 40-60% |

### 定性的効果

- **信頼性向上**: AI生成コードの透明性確保
- **チーム協業**: 誰が何を書いたか明確化
- **学習機会**: AIの思考プロセスから学習可能

---

## 8. リスクと対策

| リスク | 対策 |
|--------|------|
| ストレージ容量増加 | 古いトレースの自動アーカイブ |
| パフォーマンス影響 | 非同期保存、バッチ処理 |
| 仕様変更への追従 | 抽象化レイヤーの導入 |

---

## 9. 次のアクション

### 即座に実行可能

1. **Phase 1 の実装開始**
   - `trace-store.ts` の作成
   - PostToolUse フックの追加

2. **.gitignore への追加**
   ```
   .agent-trace/
   ```

3. **テスト環境での検証**

### 承認待ち

- Phase 2以降の実装
- 本番環境への展開

---

## 10. 参考資料

- [Agent Trace 公式仕様](https://agent-trace.dev/)
- [GitHub - cursor/agent-trace](https://github.com/cursor/agent-trace)
- [Cognition Blog - Agent Trace](https://cognition.ai/blog/agent-trace)
- [OpenTelemetry MCP Server](https://github.com/traceloop/opentelemetry-mcp-server)

---

**提案者**: TAISUN Agent System
**レビュー依頼**: 承認後、Phase 1 の実装を開始
