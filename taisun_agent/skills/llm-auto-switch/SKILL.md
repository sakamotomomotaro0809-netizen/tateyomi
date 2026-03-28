# LLM Auto-Switch System

LLMコスト最適化のためのモデル自動切替システムを導入する。
タスク複雑度に応じてOpus/Sonnet/Haiku/Ollama/OpenRouterを自動選択し、月額47-58%のコスト削減を実現。

## 使い方

```
/llm-auto-switch
```

このスキルを実行すると、以下が自動で構築されます：

1. **ModelRouter** - タスク複雑度ベースのモデル自動選択
2. **CostTracker** - リクエストごとのコスト記録・集計
3. **予算ガード** - 月$50/日$5上限、超過時は無料モデルへ自動フォールバック
4. **LiteLLMスタック** - Docker Compose (LiteLLM + Postgres + Redis)
5. **管理スクリプト** - start/stop/status/cost CLI

## 前提条件

- Node.js 18+
- Ollama (localhost:11434) + qwen3-coder:30b インストール済み
- Redis 稼働中
- Docker (LiteLLMスタック用、オプション)

## ルーティングルール

| タスク難易度 | モデル | コスト/1Mトークン |
|------------|--------|-----------------|
| trivial | Ollama qwen3-coder | $0 |
| simple | Claude Haiku 4.5 | $1/$5 |
| moderate | Claude Sonnet 4.5 | $3/$15 |
| complex | Claude Sonnet 4.5 | $3/$15 |
| expert | Claude Opus 4.6 | $5/$25 |

## セットアップ後のコマンド

```bash
npm run llm:router:setup   # セットアップ確認
npm run llm:start           # LiteLLMスタック起動
npm run llm:status          # 稼働確認
npm run llm:cost            # 今日のコストレポート
npm run llm:cost:month      # 月間コストレポート
```

## TypeScriptからの利用

```typescript
import { PerformanceService } from '@/performance'

const service = new PerformanceService()
const result = await service.routeModel({ taskComplexity: 'moderate' })
// → { model: 'claude-sonnet', provider: 'anthropic-api', estimatedCost: 0.09 }

const budget = service.checkBudget()
// → { isOverBudget: false, percentUsed: 25, monthlyRemaining: 37.5 }
```
