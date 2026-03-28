# 31. Playwright CDP Session Reuse

## Overview

Playwright CDP integration enables Proxy to reuse existing Chrome sessions via Chrome DevTools Protocol.
This approach preserves authentication state (login sessions, cookies) while avoiding CAPTCHA challenges.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Chrome (Dedicated Profile)                │
│  ~/.chrome-debug-profile                                     │
│  Port: 9222                                                  │
│  Features:                                                   │
│  - Manual login preserved                                    │
│  - Cookies/sessions retained                                 │
│  - Single instance reused                                    │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ CDP (WebSocket)
                              │
┌──────────────────────────────────────────────────────────────┐
│                       Proxy MCP                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ playwright-core (connectOverCDP)                        │ │
│  │ - Cached connection (reused across operations)          │ │
│  │ - Automatic reconnection                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ web.* Skills                                            │ │
│  │ - read_url(backend=cdp)                                 │ │
│  │ - extract_links(backend=cdp)                            │ │
│  │ - capture_dom_map(backend=cdp)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Components

### 1. Chrome Debug CLI (`chrome-debug-cli.ts`)

Starts Chrome with remote debugging enabled:

```bash
npm run chrome:debug:start
```

Features:
- Cross-platform Chrome detection (macOS, Linux, Windows)
- Dedicated profile directory (`~/.chrome-debug-profile`)
- Configurable via environment variables

Environment Variables:
- `CHROME_PATH`: Custom Chrome executable path
- `CHROME_DEBUG_PORT`: Debug port (default: 9222)
- `CHROME_PROFILE_DIR`: Profile directory

### 2. CDP Session Manager (`session.ts`)

Manages Playwright CDP connection:

```typescript
// Connect (cached)
const connection = await connectCDP({
  endpointUrl: 'http://127.0.0.1:9222',
  timeout: 10000,
  maxRetries: 3
});

// Check if port is open
const isOpen = await isCDPPortOpen(9222);

// Get cached connection
const cached = getCachedConnection();

// Disconnect (keeps Chrome running)
await disconnectCDP();
```

### 3. CDP Actions (`actions.ts`)

High-level browser operations:

```typescript
// Read URL content
const result = await readUrlViaCDP('https://example.com');

// Extract links
const links = await extractLinksViaCDP('https://example.com');

// Capture DOM structure
const dom = await captureDOMMapViaCDP('https://example.com');
```

All actions include CAPTCHA detection with `requireHuman` flag.

### 4. Web Skills with CDP Backend

Skills support `backend` parameter:

```typescript
// Using CDP backend
await readUrl('https://example.com', { backend: 'cdp' });

// Using default (puppeteer)
await readUrl('https://example.com');
await readUrl('https://example.com', { backend: 'default' });
```

## CAPTCHA Detection

Automatic detection patterns:
- CAPTCHA challenges (reCAPTCHA, hCaptcha, etc.)
- Login/authentication requirements
- Bot verification pages
- Cloudflare challenges

When detected:
```json
{
  "success": false,
  "requireHuman": true,
  "humanReason": "Detected pattern: captcha"
}
```

## Usage

### Initial Setup

1. Start Chrome in debug mode:
```bash
npm run chrome:debug:start
```

2. Log in to required sites manually in the Chrome window

3. Use CDP backend in skills:
```bash
# Via skill call
{"tool": "web.read_url", "args": {"url": "...", "backend": "cdp"}}
```

### Smoke Test

Verify CDP connection:
```bash
npm run chrome:cdp:smoke
```

Expected output:
```
CDP Smoke Test
==============

Checking Chrome on port 9222...
Chrome is running. Connecting via CDP...
Connected successfully!

Opening https://example.com...

Page loaded:
  URL: https://example.com/
  Title: Example Domain

Closing tab (Chrome stays open)...

Smoke test passed!
```

## Troubleshooting

### Chrome Not Running

```
Error: Chrome is not running on port 9222
```

Solution:
```bash
npm run chrome:debug:start
```

### Connection Failed

```
Error: Failed to connect to Chrome after 3 attempts
```

Possible causes:
1. Chrome crashed - restart with `npm run chrome:debug:start`
2. Firewall blocking localhost - check firewall settings
3. Port in use - check for other processes on 9222

### CAPTCHA Detected

```json
{
  "requireHuman": true,
  "humanReason": "Detected pattern: captcha"
}
```

Solution:
1. Open the URL in the debug Chrome window
2. Complete CAPTCHA manually
3. Retry the operation

## Security Considerations

1. **Local Only**: Debug port bound to 127.0.0.1 only
2. **Profile Isolation**: Dedicated profile prevents interference with normal browsing
3. **No CAPTCHA Bypass**: Detects but doesn't auto-solve CAPTCHAs
4. **Session Security**: User responsible for logged-in session security

## Files

```
src/proxy-mcp/browser/cdp/
├── index.ts           # Module exports
├── types.ts           # Type definitions + CAPTCHA patterns
├── session.ts         # CDP Session Manager
├── actions.ts         # High-level browser actions
├── chrome-debug-cli.ts # Chrome startup CLI
└── cdp-smoke-cli.ts   # Connection smoke test

src/proxy-mcp/browser/
└── skills.ts          # Updated with backend=cdp support
```

## Dependencies

- `playwright-core`: CDP connection (devDependency)
- Chrome/Chromium: Browser with debug mode

## Related

- [30. Chrome Extensions Ops](./30_CHROME_EXTENSIONS_OPS.md)
- [16. Browser Skills](./16_BROWSER_SKILLS.md)
