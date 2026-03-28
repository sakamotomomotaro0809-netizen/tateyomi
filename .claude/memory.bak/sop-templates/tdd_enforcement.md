# TDD Enforcement SOP - Test-Driven Development Standard Operating Procedure

**Version**: 1.0.0
**Date**: 2025-11-08
**Status**: Mandatory for all implementation agents
**ROI**: 900 (High impact across all development tasks)

---

## Executive Summary

**Purpose**: Enforce Test-Driven Development (TDD) as the standard workflow for all implementation agents in AIT42

**Scope**: Applies to all agents in Pod 2 (Implementation):
- backend-developer
- frontend-developer
- api-developer
- database-developer
- feature-builder
- integration-developer
- migration-developer
- script-writer
- implementation-assistant

**Key Principle**: **NO CODE WITHOUT TESTS FIRST**

**Expected Impact**:
- Bug reduction: -70% (from 30% → 9% defect rate)
- Code quality: +25 points average (65 → 90/100)
- Refactoring confidence: +85% (developers willing to refactor)
- Long-term maintenance cost: -40%

---

## The TDD Workflow (Mandatory 3-Step Cycle)

### Red → Green → Refactor

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD Cycle (Mandatory)                     │
└─────────────────────────────────────────────────────────────┘

Step 1: RED (Write Failing Test)
   │
   ├─ Write test for new functionality
   ├─ Test MUST fail initially (proving it tests something)
   ├─ Commit: "test: add failing test for [feature]"
   │
   ▼
Step 2: GREEN (Make Test Pass)
   │
   ├─ Write MINIMUM code to pass test
   ├─ NO premature optimization
   ├─ Test MUST pass
   ├─ Commit: "feat: implement [feature] (test passing)"
   │
   ▼
Step 3: REFACTOR (Improve Code Quality)
   │
   ├─ Clean up code while keeping tests green
   ├─ Apply SOLID principles
   ├─ Remove duplication
   ├─ Test MUST still pass
   ├─ Commit: "refactor: improve [feature] implementation"
   │
   └─► Repeat for next feature
```

---

## Mandatory Quality Gates

### Gate 1: Test-First Enforcement

**Rule**: Implementation code CANNOT be written before test exists

**Validation**:
```bash
# Pre-commit hook checks:
1. For every new function/class, corresponding test MUST exist
2. Test file timestamp MUST be earlier than implementation file
3. Test MUST have been committed first in git history
```

**Violation Handling**:
```
❌ BLOCKED: Implementation without test detected

File: src/api/auth.ts
Issue: Function 'login()' has no corresponding test

Required Action:
1. Create test file: tests/api/auth.test.ts
2. Write failing test for login()
3. Commit test first
4. Then implement login()

Command:
  git reset HEAD src/api/auth.ts
  # Write test first, then re-add implementation
```

---

### Gate 2: Test Coverage Threshold

**Rule**: Minimum 80% code coverage required for all new code

**Validation**:
```bash
# Automated check (Jest/Pytest/etc.)
npm run test:coverage

# Must pass:
- Statements: ≥80%
- Branches: ≥80%
- Functions: ≥80%
- Lines: ≥80%
```

**Coverage Report Example**:
```
File                | Stmts | Branch | Funcs | Lines |
--------------------|-------|--------|-------|-------|
src/api/auth.ts     |  92%  |  85%   |  100% |  91%  | ✅ PASS
src/api/users.ts    |  76%  |  72%   |  80%  |  75%  | ❌ FAIL (below 80%)
--------------------|-------|--------|-------|-------|
Total               |  84%  |  78%   |  90%  |  83%  | ⚠️  WARN (branch <80%)
```

**Violation Handling**:
```
❌ BLOCKED: Coverage below 80% threshold

File: src/api/users.ts
Current Coverage: 76% statements, 72% branches

Required Action:
1. Identify uncovered lines (see coverage/lcov-report/index.html)
2. Write additional test cases for:
   - Line 45-52: Error handling branch
   - Line 78-82: Edge case validation
3. Rerun tests until ≥80% achieved

Commands:
  npm run test:coverage
  open coverage/lcov-report/index.html
```

---

### Gate 3: All Tests Must Pass

**Rule**: ZERO failing tests allowed before commit

**Validation**:
```bash
# Pre-commit hook runs:
npm test

# Must show:
Test Suites: X passed, X total
Tests:       Y passed, Y total
Snapshots:   Z passed, Z total
Time:        N.NNNs
```

**Violation Handling**:
```
❌ BLOCKED: 3 tests failing

FAIL src/api/auth.test.ts
  ● login() › should reject invalid password
    expect(received).toEqual(expected)
    Expected: 401
    Received: 500

Required Action:
1. Fix implementation in src/api/auth.ts
2. Ensure all tests pass
3. Then commit

Commands:
  npm test -- --watch
  # Fix until all green, then commit
```

---

## Standard TDD Workflow for Implementation Agents

### Phase 1: Requirements Analysis (2 minutes)

1. **Read user request** and extract acceptance criteria
2. **Identify testable behaviors**:
   - Input → Expected output
   - Error conditions → Expected error messages
   - Edge cases → Expected handling
3. **Plan test structure**:
   - Unit tests: Individual functions
   - Integration tests: Component interactions
   - E2E tests: Full user workflows (if applicable)

**Example**:
```
User Request: "Implement user login API endpoint"

Testable Behaviors:
1. ✅ Valid credentials → 200 + JWT token
2. ✅ Invalid password → 401 + error message
3. ✅ Non-existent user → 401 + error message
4. ✅ Missing fields → 400 + validation error
5. ✅ Rate limiting → 429 + retry-after header

Test Structure:
- tests/api/auth.test.ts (unit + integration)
- tests/e2e/login.e2e.test.ts (E2E)
```

---

### Phase 2: Write Failing Tests (10 minutes)

**Step 2.1**: Create test file BEFORE implementation file

```bash
# Create test file first
touch tests/api/auth.test.ts

# Implementation file does NOT exist yet
# src/api/auth.ts does NOT exist yet
```

**Step 2.2**: Write test cases for ALL behaviors

```typescript
// tests/api/auth.test.ts
describe('POST /api/auth/login', () => {
  it('should return 200 and JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correct' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });

  it('should return 401 for invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  // ... 3 more test cases for behaviors 3-5
});
```

**Step 2.3**: Run tests - MUST FAIL

```bash
npm test tests/api/auth.test.ts

# Expected output:
# ❌ FAIL  tests/api/auth.test.ts
# Cannot find module 'src/api/auth' from 'tests/api/auth.test.ts'

# This is CORRECT - test fails because implementation doesn't exist yet
```

**Step 2.4**: Commit failing tests

```bash
git add tests/api/auth.test.ts
git commit -m "test: add failing tests for user login endpoint

- Valid credentials → 200 + JWT
- Invalid password → 401
- Non-existent user → 401
- Missing fields → 400
- Rate limiting → 429

All tests currently failing (implementation pending)
"
```

---

### Phase 3: Implement Minimum Code (20 minutes)

**Step 3.1**: Create implementation file

```bash
touch src/api/auth.ts
```

**Step 3.2**: Write MINIMUM code to pass tests (no more, no less)

```typescript
// src/api/auth.ts
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation (for test case 4)
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Find user (for test cases 1-3)
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password (for test cases 1-2)
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT (for test case 1)
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });

  return res.status(200).json({ token });
});

export default router;
```

**Step 3.3**: Run tests - MUST PASS

```bash
npm test tests/api/auth.test.ts

# Expected output:
# ✅ PASS  tests/api/auth.test.ts
#   POST /api/auth/login
#     ✓ should return 200 and JWT token for valid credentials (125ms)
#     ✓ should return 401 for invalid password (89ms)
#     ✓ should return 401 for non-existent user (76ms)
#     ✓ should return 400 for missing fields (42ms)
```

**Step 3.4**: Commit implementation

```bash
git add src/api/auth.ts
git commit -m "feat: implement user login endpoint

- JWT token generation for valid credentials
- 401 error for invalid password/non-existent user
- 400 error for missing fields
- Password hashing via bcrypt

Tests: 4/4 passing (rate limiting TODO)
Coverage: 92% statements, 85% branches
"
```

---

### Phase 4: Refactor for Quality (10 minutes)

**Step 4.1**: Identify code smells

```typescript
// Code smells in current implementation:
// 1. Magic strings ("Invalid credentials" duplicated)
// 2. No error handling for database failures
// 3. No rate limiting (test case 5 not implemented)
// 4. JWT secret hardcoded check (should validate env)
```

**Step 4.2**: Refactor while keeping tests green

```typescript
// src/api/auth.ts (refactored)
import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { rateLimit } from '../middleware/rateLimit';
import { validateEnv } from '../utils/env';

const router = Router();

// Constants (eliminate magic strings)
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  MISSING_FIELDS: 'Email and password required',
  RATE_LIMIT: 'Too many login attempts, please try again later'
};

// Validate environment on startup
validateEnv(['JWT_SECRET']);

// Rate limiting middleware (5 attempts per 15 minutes)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: ERROR_MESSAGES.RATE_LIMIT,
  statusCode: 429
});

router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: ERROR_MESSAGES.MISSING_FIELDS });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return res.status(200).json({ token });

  } catch (error) {
    // Error handling for database failures
    next(error);
  }
});

export default router;
```

**Step 4.3**: Add test for rate limiting (test case 5)

```typescript
// tests/api/auth.test.ts (add rate limiting test)
it('should return 429 after 5 failed attempts', async () => {
  // Make 5 failed login attempts
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
  }

  // 6th attempt should be rate limited
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'wrong' });

  expect(response.status).toBe(429);
  expect(response.body.error).toBe('Too many login attempts, please try again later');
  expect(response.headers['retry-after']).toBeDefined();
});
```

**Step 4.4**: Run tests - MUST STILL PASS

```bash
npm test tests/api/auth.test.ts

# Expected output:
# ✅ PASS  tests/api/auth.test.ts
#   POST /api/auth/login
#     ✓ should return 200 and JWT token for valid credentials (118ms)
#     ✓ should return 401 for invalid password (87ms)
#     ✓ should return 401 for non-existent user (79ms)
#     ✓ should return 400 for missing fields (38ms)
#     ✓ should return 429 after 5 failed attempts (245ms)
#
# Test Suites: 1 passed, 1 total
# Tests:       5 passed, 5 total
# Coverage:    95% statements, 92% branches, 100% functions
```

**Step 4.5**: Commit refactoring

```bash
git add src/api/auth.ts tests/api/auth.test.ts src/middleware/rateLimit.ts
git commit -m "refactor: improve login endpoint quality

- Extract magic strings to ERROR_MESSAGES constant
- Add rate limiting (5 attempts per 15 minutes)
- Add error handling for database failures
- Validate JWT_SECRET on startup

Tests: 5/5 passing
Coverage: 95% statements, 92% branches, 100% functions
Quality: Code review score 94/100 (refactor-specialist)
"
```

---

## Automated Validation Scripts

### Pre-commit Hook (Mandatory)

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running TDD validation checks..."

# Check 1: Test coverage
echo "📊 Checking test coverage..."
npm run test:coverage -- --silent

if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Test coverage below 80% threshold"
  echo "Run: npm run test:coverage"
  echo "Fix: Add tests for uncovered code"
  exit 1
fi

# Check 2: All tests pass
echo "🧪 Running all tests..."
npm test -- --silent

if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Tests failing"
  echo "Run: npm test"
  echo "Fix: Make all tests pass before committing"
  exit 1
fi

# Check 3: Test-first enforcement
echo "📝 Checking test-first compliance..."
node scripts/validate-tdd.js

if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Implementation committed before tests"
  echo "Fix: Commit tests first, then implementation"
  exit 1
fi

echo "✅ All TDD validation checks passed"
exit 0
```

---

### Test-First Validator Script

```javascript
// scripts/validate-tdd.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Validates that tests were committed before implementation
 * for all new or modified implementation files
 */
function validateTestFirst() {
  // Get list of staged files
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM')
    .toString()
    .split('\n')
    .filter(Boolean);

  // Filter implementation files (src/*.ts, lib/*.js, etc.)
  const implFiles = stagedFiles.filter(file =>
    file.startsWith('src/') && !file.includes('.test.') && !file.includes('.spec.')
  );

  const violations = [];

  for (const implFile of implFiles) {
    // Derive test file path
    const testFile = implFile
      .replace('src/', 'tests/')
      .replace(/\.(ts|js)$/, '.test.$1');

    // Check if test file exists
    if (!fs.existsSync(testFile)) {
      violations.push({
        file: implFile,
        issue: 'NO_TEST_FILE',
        message: `Missing test file: ${testFile}`
      });
      continue;
    }

    // Check git history: test should be committed before implementation
    try {
      const testCommit = execSync(`git log -1 --format=%ct -- ${testFile}`).toString().trim();
      const implCommit = execSync(`git log -1 --format=%ct -- ${implFile}`).toString().trim();

      if (!testCommit) {
        // Test file not yet committed (both in same commit is OK)
        continue;
      }

      if (implCommit && parseInt(implCommit) < parseInt(testCommit)) {
        violations.push({
          file: implFile,
          issue: 'IMPL_BEFORE_TEST',
          message: `Implementation committed before test (impl: ${new Date(implCommit * 1000).toISOString()}, test: ${new Date(testCommit * 1000).toISOString()})`
        });
      }
    } catch (error) {
      // File is new (no git history), allow if test is also staged
      if (!stagedFiles.includes(testFile)) {
        violations.push({
          file: implFile,
          issue: 'NEW_IMPL_NO_TEST',
          message: `New implementation without corresponding test`
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n❌ TDD Violation Detected:\n');
    violations.forEach(v => {
      console.error(`File: ${v.file}`);
      console.error(`Issue: ${v.issue}`);
      console.error(`Message: ${v.message}\n`);
    });
    console.error('Required Action: Commit tests before implementation');
    console.error('See: .claude/memory/sop-templates/tdd_enforcement.md\n');
    process.exit(1);
  }

  console.log('✅ Test-first compliance verified');
  process.exit(0);
}

validateTestFirst();
```

---

## Integration with Implementation Agents

### Mandatory Agent Constraint Addition

All implementation agents MUST include this constraint in their `<role>` section:

```markdown
<role>
...
**Constraints**:
- MUST follow TDD workflow (see .claude/memory/sop-templates/tdd_enforcement.md)
- NO implementation without tests first
- MUST achieve ≥80% test coverage
- MUST pass all tests before commit
...
</role>
```

### Agent Output Template Addition

All implementation agents MUST include test metrics in their output:

```markdown
<output_template>
...
### Test Validation ✅
- Test Coverage: [X%] (Target: ≥80%)
- Tests Passing: [X/Y]
- TDD Compliance: [✅ Pass | ❌ Fail]
- Test-First Verified: [✅ Yes | ❌ No]

### TDD Workflow Followed:
1. ✅ RED: Wrote failing tests first
2. ✅ GREEN: Implemented minimum code to pass
3. ✅ REFACTOR: Improved code quality while keeping tests green
...
</output_template>
```

---

## Success Metrics

### Target KPIs (Week 12)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **TDD Compliance Rate** | 35% | 95% | % of commits with test-first |
| **Test Coverage** | 62% | 85% | Average coverage across codebase |
| **Defect Rate** | 30% | 9% | % of commits introducing bugs |
| **Code Quality Score** | 65/100 | 90/100 | Average code-reviewer score |
| **Refactoring Confidence** | 25% | 85% | % willing to refactor code |

### Expected Outcomes

**Immediate (Week 1-2)**:
- All new code has ≥80% test coverage
- Pre-commit hooks enforce TDD workflow
- Implementation agents produce test-first code

**Short-term (Week 3-6)**:
- Defect rate drops from 30% → 15%
- Code quality score improves from 65 → 78/100
- Developer confidence in refactoring increases

**Long-term (Week 7-12)**:
- Defect rate stabilizes at <10%
- Code quality consistently ≥90/100
- Maintenance cost reduced by 40%
- Team velocity increases (less debugging time)

---

## References

1. **Orchestra Pattern** (GitHub Copilot): TDD-enforced workflow with mandatory pause points
2. **Test-Driven Development by Example** (Kent Beck): Red-Green-Refactor cycle
3. **PROMPT_DESIGN_THEORY.md**: Quality standards for agent prompts
4. **action_plan.md**: TDD Validation Scripts (ROI 900)

---

## FAQ

**Q1: What if writing tests first slows down development?**
**A**: Short-term: Yes, 15-20% slower. Long-term: 40-60% faster due to fewer bugs, easier refactoring, better design.

**Q2: Can I skip tests for "simple" functions?**
**A**: NO. Simple functions are easiest to test. If it's too simple to test, it's probably not needed.

**Q3: What if I'm prototyping/experimenting?**
**A**: Create feature branch with `prototype/` prefix. Merge to main requires full TDD compliance.

**Q4: What about legacy code without tests?**
**A**: Add tests BEFORE modifying. "Boy Scout Rule": Leave code better than you found it.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-08
**Status**: ✅ Active - Mandatory for all implementation agents
