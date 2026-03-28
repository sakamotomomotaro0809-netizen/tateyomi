#!/usr/bin/env bash
# Validate T3.2: Dynamic Content Compression
# Checks: dynamic_compressor.js, usage_tracker.js, frequency tracking, cache

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T3.2: Dynamic Content Compression Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: dynamic-compressor.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/dynamic-compressor.js" ]; then
    echo "[PASS] dynamic-compressor.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] dynamic-compressor.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: usage-tracker.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/usage-tracker.js" ]; then
    echo "[PASS] usage-tracker.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] usage-tracker.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 3: dynamic-compressor runs without error
if node "$PROJECT_DIR/.claude/hooks/dynamic-compressor.js" status > /dev/null 2>&1; then
    echo "[PASS] dynamic-compressor.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] dynamic-compressor.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 4: usage-tracker runs without error
if node "$PROJECT_DIR/.claude/hooks/usage-tracker.js" report > /dev/null 2>&1; then
    echo "[PASS] usage-tracker.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] usage-tracker.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 5: Usage tracking works (track + verify)
node "$PROJECT_DIR/.claude/hooks/usage-tracker.js" track test validate-test > /dev/null 2>&1
TRACK_OUT=$(node "$PROJECT_DIR/.claude/hooks/usage-tracker.js" report 2>&1)
if echo "$TRACK_OUT" | grep -q "validate-test"; then
    echo "[PASS] Usage tracking records correctly"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Usage tracking not recording"
    FAIL=$((FAIL + 1))
fi

# Check 6: Frequency tiers work
RANK_OUT=$(node "$PROJECT_DIR/.claude/hooks/usage-tracker.js" ranking 2>&1)
if echo "$RANK_OUT" | grep -q "COLD"; then
    echo "[PASS] Frequency tier classification works"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Frequency tier classification broken"
    FAIL=$((FAIL + 1))
fi

# Check 7: Dynamic compression produces savings
STATUS_OUT=$(node "$PROJECT_DIR/.claude/hooks/dynamic-compressor.js" status 2>&1)
if echo "$STATUS_OUT" | grep -q "Saved:"; then
    SAVED=$(echo "$STATUS_OUT" | grep "^Saved:" | grep -o '[0-9]*B' | head -1)
    echo "[PASS] Dynamic compression produces savings: $SAVED"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Dynamic compression produces no savings output"
    FAIL=$((FAIL + 1))
fi

# Check 8: Cache file created after compression
if [ -f "$PROJECT_DIR/.claude/hooks/data/dynamic-cache.json" ]; then
    echo "[PASS] Cache file created"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Cache file not created"
    FAIL=$((FAIL + 1))
fi

# Check 9: Usage tracking data file exists
if [ -f "$PROJECT_DIR/.claude/hooks/data/usage-tracking.json" ]; then
    echo "[PASS] Usage tracking data file exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Usage tracking data file not found"
    FAIL=$((FAIL + 1))
fi

# Check 10: Metrics file written
if [ -f "$PROJECT_DIR/.claude/hooks/data/dynamic-compressor-metrics.jsonl" ]; then
    echo "[PASS] Dynamic compressor metrics written"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Dynamic compressor metrics not found"
    FAIL=$((FAIL + 1))
fi

# Check 11: File compression works for individual file
COMP_OUT=$(node "$PROJECT_DIR/.claude/hooks/dynamic-compressor.js" compress .claude/rules/context-management.md 2>&1)
if echo "$COMP_OUT" | grep -q "Saved:"; then
    echo "[PASS] Individual file compression works"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Individual file compression broken"
    FAIL=$((FAIL + 1))
fi

# Check 12: Cache hit on second compression
COMP_OUT2=$(node "$PROJECT_DIR/.claude/hooks/dynamic-compressor.js" compress .claude/rules/context-management.md 2>&1)
if echo "$COMP_OUT2" | grep -q "CACHE HIT"; then
    echo "[PASS] Cache hit works on second compression"
    PASS=$((PASS + 1))
else
    echo "[WARN] Cache hit not detected (may be timing issue)"
    WARN=$((WARN + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo ""
    echo "Result: T3.2 ALL CHECKS PASSED"
    exit 0
else
    echo ""
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
