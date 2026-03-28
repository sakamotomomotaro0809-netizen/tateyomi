#!/usr/bin/env bash
# Validate T3.1: Context Compression
# Checks: compressor, semantic analyzer, L2/L3 move, compression ratio, restoration accuracy

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T3.1: Context Compression Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: context-compressor.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/context-compressor.js" ]; then
    echo "[PASS] context-compressor.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] context-compressor.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: semantic-analyzer.js exists
if [ -f "$PROJECT_DIR/.claude/hooks/semantic-analyzer.js" ]; then
    echo "[PASS] semantic-analyzer.js exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] semantic-analyzer.js not found"
    FAIL=$((FAIL + 1))
fi

# Check 3: L2 NOT in rules/ (auto-load path)
if [ ! -f "$PROJECT_DIR/.claude/rules/CLAUDE-L2.md" ]; then
    echo "[PASS] L2 not in auto-load path (rules/)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L2 still in auto-load path"
    FAIL=$((FAIL + 1))
fi

# Check 4: L3 NOT in rules/ (auto-load path)
if [ ! -f "$PROJECT_DIR/.claude/rules/CLAUDE-L3.md" ]; then
    echo "[PASS] L3 not in auto-load path (rules/)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L3 still in auto-load path"
    FAIL=$((FAIL + 1))
fi

# Check 5: L2 exists in references/
if [ -f "$PROJECT_DIR/.claude/references/CLAUDE-L2.md" ]; then
    echo "[PASS] L2 available in references/"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L2 not in references/"
    FAIL=$((FAIL + 1))
fi

# Check 6: L3 exists in references/
if [ -f "$PROJECT_DIR/.claude/references/CLAUDE-L3.md" ]; then
    echo "[PASS] L3 available in references/"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L3 not in references/"
    FAIL=$((FAIL + 1))
fi

# Check 7: CLAUDE.md references updated to references/ path
if grep -q "references/CLAUDE-L2" "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null; then
    echo "[PASS] CLAUDE.md L2 reference updated to references/"
    PASS=$((PASS + 1))
else
    echo "[FAIL] CLAUDE.md L2 reference not updated"
    FAIL=$((FAIL + 1))
fi

# Check 8: CLAUDE.md L3 reference updated
if grep -q "references/CLAUDE-L3" "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null; then
    echo "[PASS] CLAUDE.md L3 reference updated to references/"
    PASS=$((PASS + 1))
else
    echo "[FAIL] CLAUDE.md L3 reference not updated"
    FAIL=$((FAIL + 1))
fi

# Check 9: help-advanced references updated
if grep -q "references/CLAUDE-L2" "$PROJECT_DIR/.claude/commands/help-advanced.md" 2>/dev/null; then
    echo "[PASS] /help-advanced references updated"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-advanced references not updated"
    FAIL=$((FAIL + 1))
fi

# Check 10: help-expert references updated
if grep -q "references/CLAUDE-L3" "$PROJECT_DIR/.claude/commands/help-expert.md" 2>/dev/null; then
    echo "[PASS] /help-expert references updated"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-expert references not updated"
    FAIL=$((FAIL + 1))
fi

# Check 11: Auto-load size reduced (target: <12KB after L2/L3 move)
AUTOLOAD_SIZE=0
for f in "$PROJECT_DIR"/.claude/rules/*.md; do
    if [ -f "$f" ]; then
        FSIZE=$(wc -c < "$f")
        AUTOLOAD_SIZE=$((AUTOLOAD_SIZE + FSIZE))
    fi
done
CLAUDE_SIZE=$(wc -c < "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null || echo 0)
AUTOLOAD_SIZE=$((AUTOLOAD_SIZE + CLAUDE_SIZE))

if [ "$AUTOLOAD_SIZE" -lt 12000 ]; then
    echo "[PASS] Auto-load size: ${AUTOLOAD_SIZE}B (<12KB target)"
    PASS=$((PASS + 1))
else
    echo "[WARN] Auto-load size: ${AUTOLOAD_SIZE}B (target: <12KB)"
    WARN=$((WARN + 1))
fi

# Check 12: Compression ratio >=20%
# Original size was ~16326B (before L2/L3 move)
ORIGINAL_SIZE=16326
SAVED=$((ORIGINAL_SIZE - AUTOLOAD_SIZE))
RATIO=$((SAVED * 100 / ORIGINAL_SIZE))

if [ "$RATIO" -ge 20 ]; then
    echo "[PASS] Compression ratio: ${RATIO}% (>=20% target)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Compression ratio: ${RATIO}% (<20% target)"
    FAIL=$((FAIL + 1))
fi

# Check 13: Compressor runs without error
if node "$PROJECT_DIR/.claude/hooks/context-compressor.js" analyze > /dev/null 2>&1; then
    echo "[PASS] context-compressor.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] context-compressor.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 14: Semantic analyzer runs without error
if node "$PROJECT_DIR/.claude/hooks/semantic-analyzer.js" score > /dev/null 2>&1; then
    echo "[PASS] semantic-analyzer.js runs without error"
    PASS=$((PASS + 1))
else
    echo "[FAIL] semantic-analyzer.js execution error"
    FAIL=$((FAIL + 1))
fi

# Check 15: Semantic analyzer verify passes
VERIFY_OUT=$(node "$PROJECT_DIR/.claude/hooks/semantic-analyzer.js" verify 2>&1)
VERIFY_FAIL=$(echo "$VERIFY_OUT" | grep -c '^\[FAIL\]' || true)
if [ "${VERIFY_FAIL:-0}" -eq 0 ]; then
    echo "[PASS] Semantic analyzer verification passed"
    PASS=$((PASS + 1))
else
    echo "[FAIL] Semantic analyzer verification failed (${VERIFY_FAIL} failures)"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
echo "Auto-load: ${AUTOLOAD_SIZE}B (~$((AUTOLOAD_SIZE / 4)) tokens)"
echo "Saved: ${SAVED}B (~$((SAVED / 4)) tokens)"
echo "Compression: ${RATIO}%"

if [ "$FAIL" -eq 0 ]; then
    echo ""
    echo "Result: T3.1 ALL CHECKS PASSED"
    exit 0
else
    echo ""
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
