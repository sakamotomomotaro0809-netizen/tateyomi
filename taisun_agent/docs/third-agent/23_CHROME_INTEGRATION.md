# Chrome Integration (M4)

## Overview

Chrome Integration enables browser automation through the Puppeteer MCP server. All outputs follow the minimal output principle: `summary + refId`.

## Web Skills

Three web skills are available via `skill.run`:

| Skill | Purpose | Output |
|-------|---------|--------|
| `web.read_url` | Read page content and summarize | summary + refId + contentLength |
| `web.extract_links` | Extract all links from page | summary + refId + linkCount |
| `web.capture_dom_map` | Capture DOM structure | summary + refId + componentsCount |

## Usage

### Sync Check (Ready Status)

```typescript
import { skillRun } from './src/proxy-mcp/tools/skill';

// Check if skill is ready
const result = skillRun('web.read_url', { url: 'https://example.com' });
// Returns: { success: true, data: { asyncRequired: true, status: 'ready' } }
```

### Async Execution

```typescript
import { skillRunAsync } from './src/proxy-mcp/tools/skill';

// Execute the skill
const result = await skillRunAsync('web.read_url', {
  url: 'https://example.com',
  namespace: 'short-term', // or 'long-term'
});

// Result (minimal output):
// {
//   success: true,
//   referenceId: "abc123",
//   data: {
//     action: "allow",
//     summary: "Example Domain (example.com)\n\nThis domain is for...",
//     url: "https://example.com",
//     title: "Example Domain",
//     contentLength: 1270,
//     message: "Use memory_search(\"abc123\") for full content."
//   }
// }
```

### Extract Links

```typescript
const result = await skillRunAsync('web.extract_links', {
  url: 'https://example.com',
  filter: 'internal', // 'internal' | 'external' | 'all'
});

// Result:
// {
//   success: true,
//   referenceId: "def456",
//   data: {
//     summary: "Extracted 15 internal links from example.com...",
//     linkCount: 15,
//     filter: "internal"
//   }
// }
```

### Capture DOM Map

```typescript
const result = await skillRunAsync('web.capture_dom_map', {
  url: 'https://example.com',
});

// Result:
// {
//   success: true,
//   referenceId: "ghi789",
//   data: {
//     summary: "DOM map for Example Domain:\n- header: 1\n- main: 1...",
//     componentsCount: 5,
//     typeCounts: { header: 1, main: 1, section: 2, footer: 1 }
//   }
// }
```

## CAPTCHA Detection

All web skills include CAPTCHA detection guardrails:

### Detection Patterns

- `captcha`, `recaptcha`, `hcaptcha`
- `cloudflare`, `cf-turnstile`, `cf-challenge`
- `verify you are human`, `i'm not a robot`
- `security check`, `bot detection`

### When CAPTCHA is Detected

```json
{
  "success": false,
  "action": "require_human",
  "reason": "CAPTCHA detected: \"recaptcha\"",
  "error": "CAPTCHA detected on https://example.com. Manual intervention required.",
  "data": {
    "url": "https://example.com",
    "detectedPattern": "recaptcha",
    "instructions": [
      "1. Open the URL in a browser manually",
      "2. Complete the CAPTCHA/verification",
      "3. If you have access, provide the page content directly",
      "4. Alternatively, try a different approach or URL"
    ]
  }
}
```

### Blocked Patterns (Authentication Required)

URLs containing these patterns trigger `require_human`:

- `accounts.google.com`
- `login.`, `/signin`, `/login`
- `auth.`, `/oauth`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     skill.run / skillRunAsync               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Web Skills (M4)                          │   │
│  │  web.read_url | web.extract_links | web.capture_dom  │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │              CAPTCHA Guardrails                      │   │
│  │  detectPatterns → require_human if detected          │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │              McpClient (stdio)                       │   │
│  │  spawn → callTool → handle response                  │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │     @anthropic/mcp-server-puppeteer                  │   │
│  │     (external process)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Memory System (M3)                      │   │
│  │  Store full content → return refId                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

`config/proxy-mcp/internal-mcps.json`:

```json
{
  "name": "chrome",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-puppeteer"],
  "enabled": true,
  "tags": ["browser", "web", "automation", "scrape", "dom", "url", "links", "page"],
  "shortDescription": "Browser automation: navigate, click, extract DOM",
  "dangerousOperations": ["login", "submit-form", "payment", "captcha-bypass", "download-file"],
  "captchaGuardrails": {
    "detectPatterns": ["captcha", "recaptcha", "cloudflare", "verify you are human", "i'm not a robot"],
    "action": "require_human",
    "message": "CAPTCHA detected. Manual intervention required."
  }
}
```

## Prerequisites

1. Chrome/Chromium installed on the system
2. Enable chrome in config:
   ```json
   "enabled": true
   ```
3. Install puppeteer MCP (first run will auto-install):
   ```bash
   npx -y @anthropic/mcp-server-puppeteer
   ```

## Error Handling

### Chrome MCP Not Available

```json
{
  "success": false,
  "error": "Chrome MCP not available. Ensure it is enabled and mcp-server-puppeteer is installed.",
  "data": {
    "help": [
      "1. Check config/proxy-mcp/internal-mcps.json - chrome.enabled should be true",
      "2. Install puppeteer MCP: npx -y @anthropic/mcp-server-puppeteer",
      "3. Ensure Chrome/Chromium is available on the system"
    ]
  }
}
```

### Page Load Failed

```json
{
  "success": false,
  "error": "Failed to load page: Navigation timeout of 30000 ms exceeded",
  "data": {
    "url": "https://slow-site.com",
    "suggestion": "Try accessing the URL directly or check if the site is accessible."
  }
}
```

## File Structure

```
src/proxy-mcp/
├── browser/
│   ├── index.ts      # Exports
│   ├── types.ts      # Type definitions
│   ├── captcha.ts    # CAPTCHA detection
│   └── skills.ts     # Web skills implementation
├── internal/
│   └── mcp-client.ts # MCP client for stdio transport
└── tools/
    └── skill.ts      # Updated with web skills

config/proxy-mcp/
└── internal-mcps.json  # Chrome MCP configuration
```

## Testing

```bash
# Run tests
npm run test:unit

# Test specific web skill
npx ts-node -e "
import { skillRunAsync } from './src/proxy-mcp/tools/skill';
skillRunAsync('web.read_url', { url: 'https://example.com' })
  .then(console.log)
  .catch(console.error);
"
```

## Limitations

1. **No CAPTCHA Bypass** - CAPTCHA pages require manual intervention
2. **No Login Automation** - Authentication pages are blocked
3. **Timeout** - Default 30s timeout for page loads
4. **Memory Storage** - Large content is stored, but retrieval may add latency

## Security

- All dangerous operations require human confirmation
- CAPTCHA detection stops automation immediately
- Login/auth URLs are blocked by default
- No credentials are stored or transmitted
