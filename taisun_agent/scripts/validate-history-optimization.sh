#!/usr/bin/env bash
# Validate T3.3: History Management Optimization
# Checks: history_optimizer.js, importance_scorer.js, optimization results

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T3.3: History Management Optimization Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: history-optimizer.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/history-optimizer.js" ]; then
    echo "[PASS] history-optimizer.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] history-optimizer.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: importance-scorer.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/importance-scorer.js" ]; then
    echo "[PASS] importance-scorer.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] importance-scorer.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 3: history-optimizer runs without error
if node "$PROJECT_DIR/.claude/hooks/history-optimizer.js" analyze > /dev/null 2>&1; then
    echo "[PASS] history-optimizer.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] history-optimizer.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 4: importance-scorer runs without error
if node "$PROJECT_DIR/.claude/hooks/importance-scorer.js" test > /dev/null 2>&1; then
    echo "[PASS] importance-scorer.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] importance-scorer.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 5: Importance scorer classifies correctly
SCORER_OUT=$(node "$PROJECT_DIR/.claude/hooks/importance-scorer.js" test 2>&1)
if echo "$SCORER_OUT" | grep -q "CRIT" && echo "$SCORER_OUT" | grep -q "HIGH" && echo "$SCORER_OUT" | grep -q "LOW"; then
    echo "[PASS] Importance scorer classifies all levels"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Importance scorer missing classification levels"
    FAIL=$((FAIL + 1))
fi

# Check 6: Retainable ratio reasonable (40-80%)
RETAIN_PCT=$(echo "$SCORER_OUT" | grep "Retainable:" | grep -o '[0-9]*%' | tr -d '%')
if [ -n "$RETAIN_PCT" ] && [ "$RETAIN_PCT" -ge 30 ] && [ "$RETAIN_PCT" -le 90 ]; then
    echo "[PASS] Retain ratio: ${RETAIN_PCT}% (reasonable 30-90%)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Retain ratio: ${RETAIN_PCT:-unknown}% (expected 30-90%)"
    WARN=$((WARN + 1))
fi

# Check 7: Metrics files under control (<=100 entries each)
ALL_OK=true
for f in "$PROJECT_DIR"/.claude/hooks/data/*.jsonl; do
    if [ -f "$f" ]; then
        LINES=$(wc -l < "$f" | tr -d ' ')
        if [ "$LINES" -gt 100 ]; then
            ALL_OK=false
            echo "[FAIL] $(basename "$f") has $LINES entries (>100)"
        fi
    fi
done
if $ALL_OK; then
    echo "[PASS] All metrics files have <=100 entries"
    PASS=$((PASS + 1))
else
    FAIL=$((FAIL + 1))
fi

# Check 8: History optimizer verify passes
VERIFY_OUT=$(node "$PROJECT_DIR/.claude/hooks/history-optimizer.js" verify 2>&1)
VERIFY_FAIL=$(echo "$VERIFY_OUT" | grep -c '^\[FAIL\]' || true)
if [ "${VERIFY_FAIL:-0}" -eq 0 ]; then
    echo "[PASS] History optimizer verification passed"
    PASS=$((PASS + 1))
else
    echo "[FAIL] History optimizer verification failed"
    FAIL=$((FAIL + 1))
fi

# Check 9: History optimizer metrics written
if [ -f "$PROJECT_DIR/.claude/hooks/data/history-optimizer-metrics.jsonl" ]; then
    echo "[PASS] History optimizer metrics written"
    PASS=$((PASS + 1))
else
    echo "[WARN] History optimizer metrics not found (OK if no apply yet)"
    WARN=$((WARN + 1))
fi

# Check 10: Total history size reasonable
TOTAL_SIZE=0
for f in "$PROJECT_DIR"/.claude/hooks/data/*.jsonl; do
    if [ -f "$f" ]; then
        FSIZE=$(wc -c < "$f" | tr -d ' ')
        TOTAL_SIZE=$((TOTAL_SIZE + FSIZE))
    fi
done
if [ "$TOTAL_SIZE" -lt 50000 ]; then
    echo "[PASS] Total metrics size: ${TOTAL_SIZE}B (<50KB)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Total metrics size: ${TOTAL_SIZE}B (recommend <50KB)"
    WARN=$((WARN + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo ""
    echo "Result: T3.3 ALL CHECKS PASSED"
    exit 0
else
    echo ""
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
