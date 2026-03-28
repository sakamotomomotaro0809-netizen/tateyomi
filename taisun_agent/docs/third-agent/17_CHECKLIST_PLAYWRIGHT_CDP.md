# 17. Checklist: Playwright CDP Session Reuse

## Prerequisites

- [ ] Chrome/Chromium installed
- [ ] playwright-core in devDependencies
- [ ] npm scripts configured (`chrome:debug:start`, `chrome:cdp:smoke`)

## Implementation Checklist

### CDP Module (`src/proxy-mcp/browser/cdp/`)

- [ ] **types.ts**
  - [ ] CDPConfig interface defined
  - [ ] CDPConnection interface defined
  - [ ] CDPActionResult generic type defined
  - [ ] PageContent, ExtractedLinks, DOMMap types defined
  - [ ] CAPTCHA_PATTERNS array defined
  - [ ] detectCaptchaOrLogin() function implemented
  - [ ] DEFAULT_CDP_CONFIG exported

- [ ] **session.ts**
  - [ ] isCDPPortOpen() - Port check with timeout
  - [ ] connectCDP() - Connection with retry and caching
  - [ ] getCachedConnection() - Retrieve cached connection
  - [ ] disconnectCDP() - Disconnect without closing Chrome
  - [ ] clearConnectionCache() - Clear cache (for testing)
  - [ ] Connection caching working
  - [ ] Automatic reconnection on stale cache

- [ ] **actions.ts**
  - [ ] readUrlViaCDP() - Page content extraction
  - [ ] extractLinksViaCDP() - Link extraction
  - [ ] captureDOMMapViaCDP() - DOM structure capture
  - [ ] CAPTCHA detection in all actions
  - [ ] requireHuman flag on CAPTCHA detection
  - [ ] Page cleanup (close tab, keep browser)
  - [ ] Error handling with meaningful messages

- [ ] **chrome-debug-cli.ts**
  - [ ] Cross-platform Chrome path detection
  - [ ] macOS path working
  - [ ] Linux path working
  - [ ] Windows path working
  - [ ] Environment variable overrides (CHROME_PATH, CHROME_DEBUG_PORT, CHROME_PROFILE_DIR)
  - [ ] Dedicated profile directory creation
  - [ ] Security: --remote-debugging-address=127.0.0.1

- [ ] **cdp-smoke-cli.ts**
  - [ ] Port check before connection
  - [ ] Connection test
  - [ ] Page navigation test
  - [ ] Title extraction test
  - [ ] Tab close (browser stays)
  - [ ] Error messages with troubleshooting

- [ ] **index.ts**
  - [ ] All exports from types
  - [ ] All exports from session
  - [ ] All exports from actions

### Skills Integration (`src/proxy-mcp/browser/skills.ts`)

- [ ] WebBackend type ('default' | 'cdp')
- [ ] readUrl() - backend parameter support
- [ ] extractLinks() - backend parameter support
- [ ] captureDomMap() - backend parameter support
- [ ] Memory integration for CDP results
- [ ] Type definitions for backend option

### npm Scripts (package.json)

- [ ] `chrome:debug:start` - Chrome with debug port
- [ ] `chrome:cdp:smoke` - Smoke test CLI

## Testing Checklist

### Unit Tests (`tests/unit/playwright-cdp.test.ts`)

- [ ] **isCDPPortOpen tests**
  - [ ] Returns true when port is open
  - [ ] Returns false on connection error
  - [ ] Returns false on timeout

- [ ] **connectCDP tests**
  - [ ] Connects successfully
  - [ ] Reuses existing context
  - [ ] Creates new context when none exist
  - [ ] Caches connection for reuse
  - [ ] Throws error if Chrome not running

- [ ] **getCachedConnection tests**
  - [ ] Returns null when no cache

- [ ] **detectCaptchaOrLogin tests**
  - [ ] Detects CAPTCHA
  - [ ] Detects reCAPTCHA
  - [ ] Detects hCaptcha
  - [ ] Detects login requirement
  - [ ] Detects sign in requirement
  - [ ] Detects authentication requirement
  - [ ] Detects robot verification
  - [ ] Does not detect on normal pages

- [ ] **CDP Actions tests**
  - [ ] readUrlViaCDP success
  - [ ] readUrlViaCDP CAPTCHA detection
  - [ ] readUrlViaCDP error handling
  - [ ] extractLinksViaCDP success
  - [ ] extractLinksViaCDP CAPTCHA detection
  - [ ] captureDOMMapViaCDP success
  - [ ] captureDOMMapViaCDP CAPTCHA detection

- [ ] **Skills module tests**
  - [ ] Module exports functions

### Manual Verification

- [ ] Chrome starts with debug port
- [ ] Smoke test passes
- [ ] Login sessions preserved
- [ ] CAPTCHA detection works
- [ ] Tab closes, Chrome stays open

## CI/CD Checklist

- [ ] TypeScript compiles without errors
- [ ] ESLint passes (0 errors)
- [ ] All tests pass (existing + new)
- [ ] Coverage thresholds met
- [ ] No regression in existing tests

## Documentation Checklist

- [ ] Runbook: `docs/third-agent/31_PLAYWRIGHT_CDP_SESSION_REUSE.md`
- [ ] Checklist: `docs/third-agent/17_CHECKLIST_PLAYWRIGHT_CDP.md`
- [ ] README.md index updated

## Security Checklist

- [ ] Debug port 127.0.0.1 only (not 0.0.0.0)
- [ ] No CAPTCHA auto-bypass
- [ ] Dedicated profile isolation
- [ ] No credential storage in code

## Deployment Checklist

- [ ] PR created with changes
- [ ] CI green
- [ ] Code reviewed
- [ ] Merged to main
- [ ] RUNLOG issue closed

## Known Limitations

- Chrome must be started manually before CDP operations
- Login sessions must be established manually
- CAPTCHA detected but not bypassed (human intervention required)
- Single Chrome instance per profile
