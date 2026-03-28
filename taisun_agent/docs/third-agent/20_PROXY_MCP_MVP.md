# Proxy MCP MVP (M1)

## Overview

Proxy MCPは、Claude Codeに対して単一のエントリポイントを提供し、複数の内部MCPを最小限の公開インターフェースでバンドルします。これにより、会話コンテキストの圧迫を軽減します。

## Architecture

```
Claude Code
    │
    ▼
┌─────────────────────────────────────┐
│         Proxy MCP (this)            │
│  ┌────────────────────────────────┐ │
│  │   Public Tools (5 tools)       │ │
│  │   - system_health              │ │
│  │   - skill_search               │ │
│  │   - skill_run                  │ │
│  │   - memory_add                 │ │
│  │   - memory_search              │ │
│  └────────────────────────────────┘ │
│              │                      │
│              ▼                      │
│  ┌────────────────────────────────┐ │
│  │   Internal MCPs (future)       │ │
│  │   - Memory MCP                 │ │
│  │   - Skill MCP                  │ │
│  │   - Chrome MCP                 │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Public Tools

### system_health

Check if Proxy MCP is alive and get status.

**Input:** None

**Output:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 12345,
    "version": "0.1.0",
    "timestamp": "2025-01-02T10:00:00.000Z"
  }
}
```

### skill_search

Search for skills in `.claude/skills` directory.

**Input:**
```json
{
  "query": "string (optional)"
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "name": "skill-name",
        "description": "Skill description",
        "path": "/path/to/.claude/skills/skill-name"
      }
    ],
    "total": 1,
    "query": "search query"
  }
}
```

### skill_run

Load and preview a skill by name.

**Input:**
```json
{
  "name": "skill-name",
  "params": {} // optional
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "skill": "skill-name",
    "status": "loaded",
    "contentPreview": "# Skill content...",
    "message": "Skill loaded. Full execution requires internal MCP integration (M2+)"
  }
}
```

### memory_add

Store large content and return a reference ID.

**Input:**
```json
{
  "content": "Large content to store",
  "type": "short-term | long-term",
  "metadata": {} // optional
}
```

**Output:**
```json
{
  "success": true,
  "referenceId": "abc123def456",
  "data": {
    "id": "abc123def456",
    "type": "short-term",
    "contentLength": 1234,
    "timestamp": 1704189600000,
    "message": "Stored 1234 chars. Use memory.search(\"abc123def456\") to retrieve."
  }
}
```

### memory_search

Search memory by reference ID or keyword.

**Input:**
```json
{
  "query": "reference-id-or-keyword"
}
```

**Output (by ID):**
```json
{
  "success": true,
  "data": {
    "found": true,
    "entry": {
      "id": "abc123def456",
      "type": "short-term",
      "content": "Full content here",
      "timestamp": 1704189600000,
      "metadata": {}
    }
  }
}
```

**Output (by keyword):**
```json
{
  "success": true,
  "data": {
    "found": true,
    "results": [
      {
        "id": "abc123def456",
        "type": "short-term",
        "preview": "First 100 chars...",
        "timestamp": 1704189600000
      }
    ],
    "total": 1,
    "query": "keyword"
  }
}
```

## Usage

### Starting the Proxy MCP Server

```bash
# Development
npm run proxy:start

# Or directly with ts-node
npx ts-node src/proxy-mcp/server.ts
```

### Claude Code Settings

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "taisun-proxy": {
      "command": "npx",
      "args": ["ts-node", "/path/to/taisun_agent/src/proxy-mcp/server.ts"]
    }
  }
}
```

### Example Usage in Claude Code

```
# Check system health
Use system_health tool

# Search for skills
Use skill_search tool with query: "automation"

# Store large content
Use memory_add tool with:
- content: "Large analysis result..."
- type: "short-term"

# Retrieve content later
Use memory_search tool with query: "abc123def456"
```

## Implementation Notes

### MVP Limitations

1. **In-memory storage** - Memory is not persisted across restarts
2. **Skill execution** - Only loads skill content, full execution requires M2+
3. **No routing** - Single proxy, no load balancing

### Future Improvements (M2+)

1. **Persistent memory** - File-based or database storage
2. **Full skill execution** - Integration with internal MCPs
3. **Hybrid router** - Local vs. cloud MCP routing
4. **Chrome integration** - Browser automation via internal MCP

## File Structure

```
src/proxy-mcp/
├── index.ts          # Public exports
├── server.ts         # MCP server entry point
├── types.ts          # TypeScript types
└── tools/
    ├── system.ts     # system_health
    ├── skill.ts      # skill_search, skill_run
    └── memory.ts     # memory_add, memory_search
```

## Testing

```bash
# Run unit tests
npm test -- --testPathPattern=proxy-mcp

# Run with coverage
npm run test:coverage
```
