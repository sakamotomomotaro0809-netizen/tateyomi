#!/usr/bin/env bash
# Validate T2.4: Progressive Disclosure
# Checks: L1/L2/L3 files exist, commands exist, navigation between layers

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

echo "=== T2.4: Progressive Disclosure Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: L1 (CLAUDE.md) exists and is concise
if [ -f "$PROJECT_DIR/.claude/CLAUDE.md" ]; then
    L1_LINES=$(wc -l < "$PROJECT_DIR/.claude/CLAUDE.md")
    if [ "$L1_LINES" -le 120 ]; then
        echo "[PASS] L1 (CLAUDE.md) exists: ${L1_LINES} lines (<=120)"
        PASS=$((PASS + 1))
    else
        echo "[WARN] L1 (CLAUDE.md) is ${L1_LINES} lines (recommend <=120)"
        WARN=$((WARN + 1))
    fi
else
    echo "[FAIL] L1 (CLAUDE.md) not found"
    FAIL=$((FAIL + 1))
fi

# Check 2: L2 (CLAUDE-L2.md) exists
if [ -f "$PROJECT_DIR/.claude/rules/CLAUDE-L2.md" ]; then
    L2_LINES=$(wc -l < "$PROJECT_DIR/.claude/rules/CLAUDE-L2.md")
    echo "[PASS] L2 (CLAUDE-L2.md) exists: ${L2_LINES} lines"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L2 (CLAUDE-L2.md) not found"
    FAIL=$((FAIL + 1))
fi

# Check 3: L3 (CLAUDE-L3.md) exists
if [ -f "$PROJECT_DIR/.claude/rules/CLAUDE-L3.md" ]; then
    L3_LINES=$(wc -l < "$PROJECT_DIR/.claude/rules/CLAUDE-L3.md")
    echo "[PASS] L3 (CLAUDE-L3.md) exists: ${L3_LINES} lines"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L3 (CLAUDE-L3.md) not found"
    FAIL=$((FAIL + 1))
fi

# Check 4: /help-advanced command exists
if [ -f "$PROJECT_DIR/.claude/commands/help-advanced.md" ]; then
    echo "[PASS] /help-advanced command exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-advanced command not found"
    FAIL=$((FAIL + 1))
fi

# Check 5: /help-expert command exists
if [ -f "$PROJECT_DIR/.claude/commands/help-expert.md" ]; then
    echo "[PASS] /help-expert command exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-expert command not found"
    FAIL=$((FAIL + 1))
fi

# Check 6: L1 references L2
if grep -q "CLAUDE-L2" "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null; then
    echo "[PASS] L1 references L2 (navigation link)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L1 does not reference L2"
    FAIL=$((FAIL + 1))
fi

# Check 7: L1 references L3
if grep -q "CLAUDE-L3" "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null; then
    echo "[PASS] L1 references L3 (navigation link)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] L1 does not reference L3"
    FAIL=$((FAIL + 1))
fi

# Check 8: help-advanced references CLAUDE-L2.md
if grep -q "CLAUDE-L2" "$PROJECT_DIR/.claude/commands/help-advanced.md" 2>/dev/null; then
    echo "[PASS] /help-advanced references L2 file"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-advanced does not reference L2 file"
    FAIL=$((FAIL + 1))
fi

# Check 9: help-expert references CLAUDE-L3.md
if grep -q "CLAUDE-L3" "$PROJECT_DIR/.claude/commands/help-expert.md" 2>/dev/null; then
    echo "[PASS] /help-expert references L3 file"
    PASS=$((PASS + 1))
else
    echo "[FAIL] /help-expert does not reference L3 file"
    FAIL=$((FAIL + 1))
fi

# Check 10: Progressive structure (L1 < L2, L1 < L3)
L1_SIZE=$(wc -c < "$PROJECT_DIR/.claude/CLAUDE.md" 2>/dev/null || echo 0)
L2_SIZE=$(wc -c < "$PROJECT_DIR/.claude/rules/CLAUDE-L2.md" 2>/dev/null || echo 0)
L3_SIZE=$(wc -c < "$PROJECT_DIR/.claude/rules/CLAUDE-L3.md" 2>/dev/null || echo 0)

if [ "$L1_SIZE" -lt "$L2_SIZE" ] || [ "$L1_SIZE" -lt "$L3_SIZE" ]; then
    echo "[PASS] Progressive structure: L1(${L1_SIZE}B) < L2(${L2_SIZE}B)/L3(${L3_SIZE}B)"
    PASS=$((PASS + 1))
else
    echo "[WARN] L1 is not smaller than L2/L3 (L1:${L1_SIZE}B, L2:${L2_SIZE}B, L3:${L3_SIZE}B)"
    WARN=$((WARN + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo "Result: T2.4 ALL CHECKS PASSED"
    exit 0
else
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
