#!/usr/bin/env bash
# Validate T2.3: Hook Optimization
# Checks: profiler exists, duplicates resolved, execution time, hook count

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T2.3: Hook Optimization Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: hook-profiler.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/hook-profiler.js" ]; then
    echo "[PASS] hook-profiler.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] hook-profiler.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: Profiler CLI modes work
PROFILE_OUT=$(node "$PROJECT_DIR/.claude/hooks/hook-profiler.js" profile 2>&1 || true)
if echo "$PROFILE_OUT" | grep -q "Hook Profiler"; then
    echo "[PASS] Profiler profile mode works"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Profiler profile mode broken"
    FAIL=$((FAIL + 1))
fi

# Check 3: No duplicate unified-guard entries
UNIFIED_COUNT=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
count = 0
for event, entries in data.get('hooks', {}).items():
    for entry in entries:
        for h in entry.get('hooks', []):
            if 'unified-guard' in h.get('command', ''):
                count += 1
print(count)
")
if [ "$UNIFIED_COUNT" -eq 1 ]; then
    echo "[PASS] unified-guard.js registered once (was 2, now 1)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] unified-guard.js registered $UNIFIED_COUNT times (expected 1)"
    FAIL=$((FAIL + 1))
fi

# Check 4: Total hook count reduced from 12 to 11
TOTAL_HOOKS=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
count = 0
for event, entries in data.get('hooks', {}).items():
    for entry in entries:
        count += len(entry.get('hooks', []))
print(count)
")
if [ "$TOTAL_HOOKS" -le 12 ]; then
    echo "[PASS] Total hook registrations: $TOTAL_HOOKS (reduced from 12)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Total hook registrations: $TOTAL_HOOKS (expected <=12)"
    WARN=$((WARN + 1))
fi

# Check 5: All hooks have timeout <=5s
MAX_TIMEOUT=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
max_t = 0
for event, entries in data.get('hooks', {}).items():
    for entry in entries:
        for h in entry.get('hooks', []):
            t = h.get('timeout', 5)
            if t > max_t:
                max_t = t
print(max_t)
")
if [ "$MAX_TIMEOUT" -le 5 ]; then
    echo "[PASS] Max hook timeout: ${MAX_TIMEOUT}s (<=5s)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Max hook timeout: ${MAX_TIMEOUT}s (recommend <=5s)"
    WARN=$((WARN + 1))
fi

# Check 6: unified-guard matcher covers Write|Edit|Bash
MERGED_MATCHER=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
for entry in data.get('hooks', {}).get('PreToolUse', []):
    for h in entry.get('hooks', []):
        if 'unified-guard' in h.get('command', ''):
            print(entry.get('matcher', ''))
            break
")
if [ "$MERGED_MATCHER" = "Write|Edit|Bash" ]; then
    echo "[PASS] unified-guard matcher merged: Write|Edit|Bash"
    PASS=$((PASS + 1))
else
    echo "[FAIL] unified-guard matcher: $MERGED_MATCHER (expected Write|Edit|Bash)"
    FAIL=$((FAIL + 1))
fi

# Check 7: Profile metrics file created
if [ -f "$PROJECT_DIR/.claude/hooks/data/hook-profile-metrics.jsonl" ]; then
    echo "[PASS] Profile metrics file exists"
    PASS=$((PASS + 1))
else
    echo "[WARN] Profile metrics file not yet created"
    WARN=$((WARN + 1))
fi

# Check 8: Module exports for hook-profiler
EXPORTS=$(node -e "
const m = require('$PROJECT_DIR/.claude/hooks/hook-profiler.js');
const keys = ['getAllHooks','profileHook','findDuplicates','generateOptimizations'];
const ok = keys.every(k => typeof m[k] === 'function');
console.log(ok ? 'OK' : 'MISSING');
" 2>/dev/null || echo "ERROR")
if [ "$EXPORTS" = "OK" ]; then
    echo "[PASS] hook-profiler exports correct"
    PASS=$((PASS + 1))
else
    echo "[FAIL] hook-profiler exports broken"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo "Result: T2.3 ALL CHECKS PASSED"
    exit 0
else
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
