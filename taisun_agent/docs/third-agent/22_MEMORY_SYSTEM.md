# Memory System (M3)

## Overview

Memory Systemは、短期/長期メモリを分離し、最小出力原則（Minimal Output Principle）を適用したメモリ管理システムです。ツール出力は常にrefId + summaryを中心とし、フルコンテンツは返しません。

## Design Principles

### 1. Minimal Output Principle
- ツール出力は **summary + refId + metadata** のみ
- フルコンテンツは返さない（コンテキスト圧縮のため）
- 必要時のみ `includeContent: true` でプレビューを取得

### 2. Namespace Separation
- **short-term**: 14日TTL、一時的なセッション情報
- **long-term**: 10年TTL、永続的な知識・設定

### 3. Future-Proof Design
- Store adapter pattern で Mem0/Zep への置き換えが容易
- `InMemoryStore` と `JsonlStore` を実装済み

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Memory Tools                           │
│  memoryAdd, memorySearch, memoryStats, etc.               │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                   MemoryService                            │
│  - add/get/search/delete/clear                            │
│  - Summary generation                                      │
│  - TTL management                                         │
│  - Output formatting (minimal)                            │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    MemoryStore                             │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │  InMemoryStore  │    │   JsonlStore    │               │
│  │  (testing)      │    │  (persistent)   │               │
│  └─────────────────┘    └─────────────────┘               │
└────────────────────────────────────────────────────────────┘
```

## Namespaces

| Namespace | TTL | Max Entries | Max Content | Use Case |
|-----------|-----|-------------|-------------|----------|
| short-term | 14 days | 2,000 | 200KB | Session data, temp results |
| long-term | 10 years | 20,000 | 500KB | Knowledge, config, learned patterns |

## Configuration

`config/proxy-mcp/memory.json`:

```json
{
  "version": "1.0.0",
  "storage": {
    "defaultBackend": "inmemory",
    "directory": ".taisun/memory"
  },
  "namespaces": {
    "short-term": {
      "maxEntries": 2000,
      "ttlDays": 14,
      "maxContentChars": 200000,
      "maxSummaryChars": 1200
    },
    "long-term": {
      "maxEntries": 20000,
      "ttlDays": 3650,
      "maxContentChars": 500000,
      "maxSummaryChars": 1200
    }
  },
  "retrieval": {
    "topK": 5,
    "minScore": 0.15
  },
  "output": {
    "includeContentByDefault": false,
    "contentPreviewChars": 1200
  }
}
```

## Usage

### Adding to Memory

```typescript
import { memoryAdd } from './src/proxy-mcp/tools/memory';

// Short-term (default)
const result = await memoryAdd('API response data here');
// Returns: { referenceId: "abc123", summary: "API response...", contentLength: 123 }

// Long-term with tags
const result = await memoryAdd(
  'Important configuration settings',
  'long-term',
  { tags: ['config', 'important'], source: 'user' }
);
```

### Searching Memory

```typescript
import { memorySearch } from './src/proxy-mcp/tools/memory';

// By ID (exact match)
const result = await memorySearch('abc123');

// By keyword (fuzzy search)
const result = await memorySearch('API response');

// With filters
const result = await memorySearch('config', {
  namespace: 'long-term',
  tags: ['important'],
  limit: 3
});

// With content preview
const result = await memorySearch('config', {
  includeContent: true
});
```

### Response Format (Minimal Output)

```json
{
  "success": true,
  "data": {
    "found": true,
    "results": [
      {
        "id": "abc123",
        "namespace": "short-term",
        "summary": "API response data for user authentication...",
        "tags": ["api", "auth"],
        "score": "85.0%",
        "createdAt": "2025-01-02T10:00:00.000Z"
      }
    ],
    "total": 1,
    "query": "API response"
  }
}
```

### Statistics

```typescript
const stats = await memoryStats();
// { total: 100, shortTerm: 80, longTerm: 20 }
```

### Cleanup

```typescript
// Clear short-term only
await memoryClearShortTerm();

// Clear all
await memoryClearAll();

// Clean up expired entries
await memoryCleanup();
```

## Store Adapters

### InMemoryStore

- Fast, non-persistent
- Ideal for testing
- Token-based search with scoring

### JsonlStore

- Append-only JSONL format
- Automatic log compaction
- Persistent across restarts

### Adding Custom Store (e.g., Mem0, Zep)

1. Implement `MemoryStore` interface:

```typescript
import { MemoryStore, MemoryEntry, MemorySearchResult } from './types';

export class Mem0Store implements MemoryStore {
  async add(entry: MemoryEntry): Promise<void> { /* ... */ }
  async get(id: string): Promise<MemoryEntry | null> { /* ... */ }
  async search(tokens: string[], options?): Promise<MemorySearchResult[]> { /* ... */ }
  async delete(id: string): Promise<boolean> { /* ... */ }
  async clear(namespace?): Promise<number> { /* ... */ }
  async list(namespace?): Promise<MemoryEntry[]> { /* ... */ }
  async count(namespace?): Promise<number> { /* ... */ }
}
```

2. Update `store.ts`:

```typescript
export function createStore(config: MemoryConfig): MemoryStore {
  switch (config.storage.defaultBackend) {
    case 'mem0':
      return new Mem0Store(config);
    // ...
  }
}
```

## Search Algorithm

### Scoring Formula

```
score = (summaryMatches / queryTokens) * 0.40   // Summary weight
      + (contentMatches / queryTokens) * 0.25   // Content weight
      + (tagMatches / queryTokens) * 0.20       // Tag weight
      + recencyBonus                             // Up to 0.10
      + importanceBonus                          // importance * 0.05
```

### Filters

- **namespace**: Restrict to short-term or long-term
- **tags**: Require at least one matching tag
- **limit**: Max results (default: 5)
- **minScore**: Minimum relevance score (default: 0.15)

## File Structure

```
src/proxy-mcp/
├── memory/
│   ├── index.ts           # Exports
│   ├── types.ts           # Type definitions
│   ├── store.ts           # Store factory
│   ├── service.ts         # MemoryService singleton
│   └── stores/
│       ├── inmemory.ts    # In-memory implementation
│       └── jsonl.ts       # JSONL file implementation
└── tools/
    └── memory.ts          # Tool wrappers (async)

config/proxy-mcp/
└── memory.json            # Configuration

tests/unit/
├── proxy-mcp.test.ts      # Basic memory tool tests
└── memory-system.test.ts  # Comprehensive memory tests
```

## Best Practices

### Do

- Use short-term for temporary data (API responses, session state)
- Use long-term for persistent knowledge (user preferences, learned patterns)
- Search by refId when exact retrieval is needed
- Use tags for categorization and filtering
- Let TTL handle cleanup automatically

### Don't

- Store large binary data (use file storage instead)
- Expect full content in search results (use `includeContent` for preview)
- Bypass the namespace separation
- Store secrets or credentials

## Testing

```bash
# Run memory system tests
npm test -- --testPathPattern=memory

# Run all unit tests
npm run test:unit
```

## Caveats

1. **Content Truncation**: Content exceeding `maxContentChars` is truncated
2. **Summary Length**: Summaries are limited to `maxSummaryChars` (default: 1200)
3. **Search Tokens**: Very short tokens (1 char) are filtered out
4. **Expiry**: Expired entries are excluded from search but not immediately deleted
