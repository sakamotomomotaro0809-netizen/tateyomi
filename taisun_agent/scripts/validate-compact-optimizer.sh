#!/usr/bin/env bash
# Validate T2.2: Compact Optimizer
# Checks: hook file exists, registered in settings, state management, CLI modes

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T2.2: Compact Optimizer Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: compact-optimizer.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/compact-optimizer.js" ]; then
    echo "[PASS] compact-optimizer.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] compact-optimizer.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: Registered in settings.json
if grep -q "compact-optimizer.js" "$PROJECT_DIR/.claude/settings.json" 2>/dev/null; then
    echo "[PASS] Hook registered in settings.json"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Hook NOT registered in settings.json"
    FAIL=$((FAIL + 1))
fi

# Check 3: PostToolUse matcher is empty string (matches all tools)
MATCHER=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
for entry in data.get('hooks', {}).get('PostToolUse', []):
    for hook in entry.get('hooks', []):
        if 'compact-optimizer' in hook.get('command', ''):
            print(entry.get('matcher', 'MISSING'))
            break
" 2>/dev/null || echo "ERROR")

if [ "$MATCHER" = "" ]; then
    echo "[PASS] Hook matcher covers all tools (empty matcher)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Hook matcher is '$MATCHER' (expected empty for all tools)"
    WARN=$((WARN + 1))
fi

# Check 4: Hook timeout is <=3s (lightweight)
TIMEOUT=$(python3 -c "
import json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    data = json.load(f)
for entry in data.get('hooks', {}).get('PostToolUse', []):
    for hook in entry.get('hooks', []):
        if 'compact-optimizer' in hook.get('command', ''):
            print(hook.get('timeout', 'MISSING'))
            break
" 2>/dev/null || echo "ERROR")

if [ "$TIMEOUT" -le 3 ] 2>/dev/null; then
    echo "[PASS] Hook timeout: ${TIMEOUT}s (<=3s lightweight)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Hook timeout: ${TIMEOUT}s (recommend <=3s)"
    WARN=$((WARN + 1))
fi

# Check 5: CLI status mode works
STATUS_OUTPUT=$(node "$PROJECT_DIR/.claude/hooks/compact-optimizer.js" status 2>&1 || true)
if echo "$STATUS_OUTPUT" | grep -q "Compact Optimizer Status"; then
    echo "[PASS] CLI status mode works"
    PASS=$((PASS + 1))
else
    echo "[FAIL] CLI status mode broken"
    FAIL=$((FAIL + 1))
fi

# Check 6: CLI reset mode works
RESET_OUTPUT=$(node "$PROJECT_DIR/.claude/hooks/compact-optimizer.js" reset 2>&1 || true)
if echo "$RESET_OUTPUT" | grep -q "State reset"; then
    echo "[PASS] CLI reset mode works"
    PASS=$((PASS + 1))
else
    echo "[FAIL] CLI reset mode broken"
    FAIL=$((FAIL + 1))
fi

# Check 7: State file created after reset
if [ -f "$PROJECT_DIR/.claude/temp/compact-optimizer-state.json" ]; then
    echo "[PASS] State file created"
    PASS=$((PASS + 1))
else
    echo "[FAIL] State file not created"
    FAIL=$((FAIL + 1))
fi

# Check 8: Module exports are correct
EXPORTS=$(node -e "
const m = require('$PROJECT_DIR/.claude/hooks/compact-optimizer.js');
const keys = ['loadState','saveState','shouldSuggestCompact','CONFIG'];
const ok = keys.every(k => typeof m[k] !== 'undefined');
console.log(ok ? 'OK' : 'MISSING');
" 2>/dev/null || echo "ERROR")

if [ "$EXPORTS" = "OK" ]; then
    echo "[PASS] Module exports correct (loadState, saveState, shouldSuggestCompact, CONFIG)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Module exports missing or broken"
    FAIL=$((FAIL + 1))
fi

# Check 9: Threshold logic test (30min / 50 calls)
LOGIC_TEST=$(node -e "
const m = require('$PROJECT_DIR/.claude/hooks/compact-optimizer.js');
const state = { sessionStart: Date.now() - 31*60000, toolCallCount: 10, lastCompactSuggestion: 0, compactCount: 0, suggestedAt: [] };
const check = m.shouldSuggestCompact(state);
console.log(check.suggest && check.reason === 'time' ? 'TIME_OK' : 'TIME_FAIL');
const state2 = { sessionStart: Date.now(), toolCallCount: 55, lastCompactSuggestion: 0, compactCount: 0, suggestedAt: [] };
const check2 = m.shouldSuggestCompact(state2);
console.log(check2.suggest && check2.reason === 'tool_calls' ? 'CALLS_OK' : 'CALLS_FAIL');
" 2>/dev/null || echo "ERROR")

if echo "$LOGIC_TEST" | grep -q "TIME_OK" && echo "$LOGIC_TEST" | grep -q "CALLS_OK"; then
    echo "[PASS] Threshold logic: 30min time trigger + 50 calls trigger"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Threshold logic test failed: $LOGIC_TEST"
    FAIL=$((FAIL + 1))
fi

# Check 10: auto-compact-manager.js also exists (complementary)
if [ -f "$PROJECT_DIR/.claude/hooks/auto-compact-manager.js" ]; then
    echo "[PASS] auto-compact-manager.js exists (complementary 4-tier system)"
    PASS=$((PASS + 1))
else
    echo "[WARN] auto-compact-manager.js not found"
    WARN=$((WARN + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo "Result: T2.2 ALL CHECKS PASSED"
    exit 0
else
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
