# Supervisor (M6)

## Overview

Supervisor is a state-machine based execution controller that ensures dangerous operations require human approval before proceeding.

**Key Features:**
- State machine: `ingest → route → plan → (approval?) → execute_safe → finalize`
- Dangerous pattern detection (40+ patterns)
- Human approval via GitHub Issues
- Automatic RUNLOG issue creation
- Minimal output: summary + refId

## Dangerous Patterns

Operations containing these patterns **always require human approval**:

| Category | Patterns |
|----------|----------|
| Deployment | `deploy`, `production`, `release`, `publish` |
| Destructive | `delete`, `drop`, `truncate`, `remove`, `destroy`, `wipe` |
| Secrets | `secret`, `credential`, `api_key`, `password`, `token` |
| Billing | `billing`, `payment`, `subscription`, `charge` |
| Access Control | `role`, `admin`, `permission`, `privilege` |
| Abuse | `captcha`, `bypass`, `spam`, `brute_force` |

## Usage

### Sync Check (Ready Status)

```typescript
import { skillRun } from './src/proxy-mcp/tools/skill';

// Check if input requires approval
const result = skillRun('supervisor', { input: 'search for files' });
// Returns: { success: true, data: { requiresApproval: false, status: 'ready' } }

// Dangerous input
const result2 = skillRun('supervisor', { input: 'delete production database' });
// Returns: { success: true, data: { requiresApproval: true, dangerousPatterns: ['delete', 'production'] } }
```

### Async Execution

```typescript
import { skillRunAsync } from './src/proxy-mcp/tools/skill';

// Run supervisor for safe input
const result = await skillRunAsync('supervisor', {
  input: 'search for documentation',
});

// Result:
// {
//   success: true,
//   referenceId: "abc123",
//   data: {
//     runId: "run-xyz123",
//     step: "finalize",
//     summary: "Executed plan for: search for documentation",
//     requiresApproval: false
//   }
// }

// Run supervisor for dangerous input
const result2 = await skillRunAsync('supervisor', {
  input: 'delete all user data',
});

// Result (paused for approval):
// {
//   success: false,
//   data: {
//     runId: "run-abc456",
//     step: "approval",
//     summary: "Waiting for approval",
//     requiresApproval: true,
//     approvalIssue: 42
//   }
// }
```

### Resume After Approval

```typescript
const result = await skillRunAsync('supervisor', {
  input: 'delete all user data',
  resume: 'run-abc456',
  approvalIssue: 42,
});

// If approved:
// {
//   success: true,
//   data: {
//     summary: "Approval granted by admin. Execution can proceed.",
//     requiresApproval: false
//   }
// }
```

## State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                       Supervisor                            │
│                                                             │
│  ┌─────────┐    ┌───────┐    ┌──────┐                      │
│  │ ingest  │ ─► │ route │ ─► │ plan │                      │
│  └─────────┘    └───────┘    └──────┘                      │
│                                  │                          │
│                    ┌─────────────┴─────────────┐           │
│                    │                           │           │
│                    ▼                           ▼           │
│            ┌────────────┐              ┌──────────────┐    │
│            │  approval  │              │ execute_safe │    │
│            │  (pause)   │              └──────────────┘    │
│            └────────────┘                     │            │
│                    │                          │            │
│             [APPROVE]                         │            │
│                    │                          │            │
│                    ▼                          ▼            │
│            ┌──────────────┐           ┌──────────┐        │
│            │ execute_safe │  ─────►   │ finalize │        │
│            └──────────────┘           └──────────┘        │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## GitHub Integration

### RUNLOG Issue

Automatically created for each supervisor run:

```markdown
## Supervisor Run: run-xyz123

**Input:** delete all user data...

**Started:** 2024-01-01T00:00:00Z

**Status:** plan
```

### Approval Issue

Created when dangerous patterns detected:

```markdown
## Approval Required

**Run ID:** run-xyz123

**Input:** delete all user data

**Risk Level:** high

**Reason:** Detected patterns: delete

### Planned Steps

1. **analyze** (low risk) - delete all user
2. **process** (high risk) - user input

---

## How to Approve

1. Review the planned steps above
2. Comment `APPROVE` on this issue to proceed
3. Or add the `approved` label

## How to Reject

Comment `REJECT` to abort the operation.
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input` | string | required | Task to execute |
| `runId` | string | auto | Custom run ID |
| `skipApproval` | boolean | `false` | Skip approval (testing only) |
| `namespace` | string | `short-term` | Memory namespace |
| `resume` | string | - | Run ID to resume |
| `approvalIssue` | number | - | Issue ID to check approval |

## File Structure

```
src/proxy-mcp/
├── supervisor/
│   ├── index.ts       # Exports
│   ├── types.ts       # Type definitions
│   ├── policy.ts      # Dangerous pattern detection
│   ├── github.ts      # GitHub issue integration
│   └── graph.ts       # State machine
└── tools/
    └── skill.ts       # Updated with supervisor support

tests/unit/
└── supervisor.test.ts # Unit tests
```

## Testing

```bash
# Run tests
npm run test:unit

# Test supervisor directly
npx ts-node -e "
import { skillRunAsync } from './src/proxy-mcp/tools/skill';
skillRunAsync('supervisor', { input: 'search for files' })
  .then(console.log)
  .catch(console.error);
"
```

## Limitations

1. **Requires gh CLI** - GitHub integration needs `gh` command
2. **No state persistence** - Paused runs require manual resume
3. **Simple execution** - Actual MCP execution is placeholder
4. **Single approval** - No multi-party approval support

## Security

- Dangerous patterns **always** require approval
- Approval via GitHub Issues (audit trail)
- No credential storage
- RUNLOG for full execution history
