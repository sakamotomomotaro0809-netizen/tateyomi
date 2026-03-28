# Skillize - URL→Skill Generation (M5)

## Overview

Skillize generates skills from URLs using templates. It analyzes web content and creates structured skills that can be used for future interactions.

**Key Features:**
- Template-driven: 3 templates (docs, ecommerce, internal-tool)
- dry-run by default (preview only)
- write only with `confirmWrite=true`
- Minimal output: summary + refId (full content in memory)

## Templates

| Template | Purpose | URL Patterns |
|----------|---------|--------------|
| `docs` | API docs, library docs, guides | `/docs`, `/api`, `/reference`, `.io/docs` |
| `ecommerce` | Product pages, catalogs | `/product`, `/shop`, amazon.com |
| `internal-tool` | Dashboards, admin panels | `/admin`, `/dashboard`, localhost |

## Usage

### Sync Check (Ready Status)

```typescript
import { skillRun } from './src/proxy-mcp/tools/skill';

// Check if skillize is ready (dry-run mode)
const result = skillRun('skillize', { url: 'https://docs.example.com' });
// Returns: { success: true, data: { asyncRequired: true, status: 'ready', confirmWrite: false } }

// Check with write mode
const result2 = skillRun('skillize', {
  url: 'https://docs.example.com',
  confirmWrite: true
});
// Returns: { success: true, data: { asyncRequired: true, status: 'ready', confirmWrite: true } }
```

### Async Execution (Dry-Run)

```typescript
import { skillRunAsync } from './src/proxy-mcp/tools/skill';

// Generate skill preview (dry-run)
const result = await skillRunAsync('skillize', {
  url: 'https://docs.example.com',
  // template: 'docs',  // optional: auto-detect if omitted
});

// Result (minimal output):
// {
//   success: true,
//   referenceId: "abc123",
//   data: {
//     template: "docs",
//     summary: "Generated skill \"example-docs\" using docs template...",
//     skillName: "example-docs",
//     preview: "# Example Documentation Skill\n\n## Overview...",
//     filesCount: 1,
//     written: false,
//     message: "Dry-run complete. Use confirmWrite=true to write. Use memory_search(\"abc123\") for full content."
//   }
// }
```

### Async Execution (Write Mode)

```typescript
const result = await skillRunAsync('skillize', {
  url: 'https://docs.example.com',
  confirmWrite: true,  // Actually write files
  name: 'my-custom-skill',  // Optional custom name
});

// Result:
// {
//   success: true,
//   referenceId: "abc123",
//   data: {
//     template: "docs",
//     skillName: "my-custom-skill",
//     filesCount: 1,
//     written: true,
//     path: "/path/to/.claude/skills/my-custom-skill",
//     message: "Skill written to /path/to/.claude/skills/my-custom-skill. Use memory_search(\"abc123\") for full content."
//   }
// }
```

## Template Detection

Templates are auto-detected based on:

1. **URL patterns** - `/docs`, `/product`, `/admin`, etc.
2. **Content keywords** - "documentation", "price", "dashboard", etc.
3. **Content type** - documentation, product, tool, etc.

### Detection Priority

```
URL pattern match: +3 points
Content keyword match: +1 point per keyword
Content type match: +5 points

Highest score wins. Default: docs template.
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | required | URL to analyze |
| `template` | string | auto | Template type: `docs`, `ecommerce`, `internal-tool` |
| `name` | string | auto | Custom skill name (auto-generated from title) |
| `confirmWrite` | boolean | `false` | Write files to disk |
| `namespace` | string | `long-term` | Memory namespace for storage |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     skill.run('skillize')                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              URL Analysis (M4 web.read_url)          │   │
│  │  Read URL → Extract content → Detect type           │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │              Template Detection                      │   │
│  │  URL patterns → Keywords → Content type → Score     │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │              Skill Generation                        │   │
│  │  Template.generate(analysis) → GeneratedSkill       │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │              Memory Storage (M3)                     │   │
│  │  Store full skill → return refId                    │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │         File Write (if confirmWrite=true)           │   │
│  │  Write SKILL.md → .claude/skills/{name}/            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Generated Skill Structure

```
.claude/skills/{skill-name}/
└── SKILL.md     # Skill definition with usage examples
```

### Example SKILL.md (docs template)

```markdown
# Example Documentation Skill

## Overview

Skill for accessing docs.example.com documentation.

**Source URL:** https://docs.example.com

## Available Sections

- Getting Started
- Installation
- API Reference

## Usage

```typescript
// Search documentation
skill.run('example-docs', { mode: 'search', query: 'your query' });

// Get specific section
skill.run('example-docs', { mode: 'section', name: 'section-name' });
```

## Auto-generated

This skill was auto-generated from https://docs.example.com.
Template: docs
```

## Error Handling

### Invalid URL

```json
{
  "success": false,
  "error": "Invalid URL: not-a-url"
}
```

### Page Load Failed

```json
{
  "success": false,
  "error": "Failed to read URL: Navigation timeout of 30000 ms exceeded"
}
```

### Unknown Template

```json
{
  "success": false,
  "error": "Unknown template type: custom"
}
```

## File Structure

```
src/proxy-mcp/
├── skillize/
│   ├── index.ts       # Exports
│   ├── types.ts       # Type definitions
│   ├── templates.ts   # Template definitions
│   └── skillize.ts    # Core skillize function
└── tools/
    └── skill.ts       # Updated with skillize support

tests/unit/
└── skillize.test.ts   # Unit tests
```

## Testing

```bash
# Run tests
npm run test:unit

# Test skillize directly
npx ts-node -e "
import { skillRunAsync } from './src/proxy-mcp/tools/skill';
skillRunAsync('skillize', { url: 'https://docs.example.com' })
  .then(console.log)
  .catch(console.error);
"
```

## Limitations

1. **Requires Chrome MCP** - Uses M4 web skills for URL reading
2. **Template-based** - Limited to 3 predefined templates
3. **No custom templates** - Can't add new templates dynamically
4. **Memory storage** - Full content stored in memory (may increase storage)

## Security

- dry-run by default (no file writes without explicit confirmation)
- Generated skills are stored in memory for audit
- File writes only to `.claude/skills/` directory
- No code execution from generated skills
