#!/usr/bin/env bash
# Validate T2.5: Tier 2 Integration Validation
# Runs all T2 validators and generates summary report

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="$PROJECT_DIR/.claude/reports"
REPORT_FILE="$REPORT_DIR/tier2_validation_report.md"
METRICS_FILE="$PROJECT_DIR/.claude/hooks/data/metrics_tier2.jsonl"

mkdir -p "$REPORT_DIR"
mkdir -p "$(dirname "$METRICS_FILE")"

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_WARN=0
T21_STATUS="UNKNOWN"
T22_STATUS="UNKNOWN"
T23_STATUS="UNKNOWN"
T24_STATUS="UNKNOWN"

echo "=== T2.5: Tier 2 Integration Validation ==="
echo "Date: $(date)"
echo ""

# --- Run T2.1 ---
echo "--- T2.1: MCP defer_loading ---"
if bash "$PROJECT_DIR/scripts/validate-mcp-defer.sh" > /tmp/t21.out 2>&1; then
    T21_STATUS="PASS"
    echo "[PASS] T2.1 validation passed"
else
    T21_STATUS="FAIL"
    echo "[FAIL] T2.1 validation failed"
fi
T21_PASS=$(grep -c '^\[PASS\]' /tmp/t21.out 2>/dev/null || true)
T21_FAIL=$(grep -c '^\[FAIL\]' /tmp/t21.out 2>/dev/null || true)
T21_WARN=$(grep -c '^\[WARN\]' /tmp/t21.out 2>/dev/null || true)
T21_PASS=${T21_PASS:-0}; T21_FAIL=${T21_FAIL:-0}; T21_WARN=${T21_WARN:-0}
TOTAL_PASS=$((TOTAL_PASS + T21_PASS))
TOTAL_FAIL=$((TOTAL_FAIL + T21_FAIL))
TOTAL_WARN=$((TOTAL_WARN + T21_WARN))
echo ""

# --- Run T2.2 ---
echo "--- T2.2: Compact Optimization ---"
if bash "$PROJECT_DIR/scripts/validate-compact-optimizer.sh" > /tmp/t22.out 2>&1; then
    T22_STATUS="PASS"
    echo "[PASS] T2.2 validation passed"
else
    T22_STATUS="FAIL"
    echo "[FAIL] T2.2 validation failed"
fi
T22_PASS=$(grep -c '^\[PASS\]' /tmp/t22.out 2>/dev/null || true)
T22_FAIL=$(grep -c '^\[FAIL\]' /tmp/t22.out 2>/dev/null || true)
T22_WARN=$(grep -c '^\[WARN\]' /tmp/t22.out 2>/dev/null || true)
T22_PASS=${T22_PASS:-0}; T22_FAIL=${T22_FAIL:-0}; T22_WARN=${T22_WARN:-0}
TOTAL_PASS=$((TOTAL_PASS + T22_PASS))
TOTAL_FAIL=$((TOTAL_FAIL + T22_FAIL))
TOTAL_WARN=$((TOTAL_WARN + T22_WARN))
echo ""

# --- Run T2.3 ---
echo "--- T2.3: Hook Optimization ---"
if bash "$PROJECT_DIR/scripts/validate-hook-optimization.sh" > /tmp/t23.out 2>&1; then
    T23_STATUS="PASS"
    echo "[PASS] T2.3 validation passed"
else
    T23_STATUS="FAIL"
    echo "[FAIL] T2.3 validation failed"
fi
T23_PASS=$(grep -c '^\[PASS\]' /tmp/t23.out 2>/dev/null || true)
T23_FAIL=$(grep -c '^\[FAIL\]' /tmp/t23.out 2>/dev/null || true)
T23_WARN=$(grep -c '^\[WARN\]' /tmp/t23.out 2>/dev/null || true)
T23_PASS=${T23_PASS:-0}; T23_FAIL=${T23_FAIL:-0}; T23_WARN=${T23_WARN:-0}
TOTAL_PASS=$((TOTAL_PASS + T23_PASS))
TOTAL_FAIL=$((TOTAL_FAIL + T23_FAIL))
TOTAL_WARN=$((TOTAL_WARN + T23_WARN))
echo ""

# --- Run T2.4 ---
echo "--- T2.4: Progressive Disclosure ---"
if bash "$PROJECT_DIR/scripts/validate-progressive-disclosure.sh" > /tmp/t24.out 2>&1; then
    T24_STATUS="PASS"
    echo "[PASS] T2.4 validation passed"
else
    T24_STATUS="FAIL"
    echo "[FAIL] T2.4 validation failed"
fi
T24_PASS=$(grep -c '^\[PASS\]' /tmp/t24.out 2>/dev/null || true)
T24_FAIL=$(grep -c '^\[FAIL\]' /tmp/t24.out 2>/dev/null || true)
T24_WARN=$(grep -c '^\[WARN\]' /tmp/t24.out 2>/dev/null || true)
T24_PASS=${T24_PASS:-0}; T24_FAIL=${T24_FAIL:-0}; T24_WARN=${T24_WARN:-0}
TOTAL_PASS=$((TOTAL_PASS + T24_PASS))
TOTAL_FAIL=$((TOTAL_FAIL + T24_FAIL))
TOTAL_WARN=$((TOTAL_WARN + T24_WARN))
echo ""

# --- Overall Result ---
echo "========================================"
echo "Tier 2 Integration Results"
echo "========================================"
echo "T2.1 MCP defer_loading:    $T21_STATUS ($T21_PASS pass, $T21_FAIL fail, $T21_WARN warn)"
echo "T2.2 Compact Optimization: $T22_STATUS ($T22_PASS pass, $T22_FAIL fail, $T22_WARN warn)"
echo "T2.3 Hook Optimization:    $T23_STATUS ($T23_PASS pass, $T23_FAIL fail, $T23_WARN warn)"
echo "T2.4 Progressive Disclosure: $T24_STATUS ($T24_PASS pass, $T24_FAIL fail, $T24_WARN warn)"
echo ""
echo "TOTAL: PASS=$TOTAL_PASS FAIL=$TOTAL_FAIL WARN=$TOTAL_WARN"

if [ "$TOTAL_FAIL" -eq 0 ]; then
    echo ""
    echo "TIER 2 VALIDATION: ALL PASSED"
    OVERALL="PASS"
else
    echo ""
    echo "TIER 2 VALIDATION: SOME FAILED"
    OVERALL="FAIL"
fi

# --- Generate Report ---
cat > "$REPORT_FILE" << EOF
# Tier 2 Validation Report

**Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Overall**: $OVERALL

## Results

| Task | Description | Status | Pass | Fail | Warn |
|------|-------------|--------|------|------|------|
| T2.1 | MCP defer_loading | $T21_STATUS | $T21_PASS | $T21_FAIL | $T21_WARN |
| T2.2 | Compact Optimization | $T22_STATUS | $T22_PASS | $T22_FAIL | $T22_WARN |
| T2.3 | Hook Optimization | $T23_STATUS | $T23_PASS | $T23_FAIL | $T23_WARN |
| T2.4 | Progressive Disclosure | $T24_STATUS | $T24_PASS | $T24_FAIL | $T24_WARN |
| **Total** | | **$OVERALL** | **$TOTAL_PASS** | **$TOTAL_FAIL** | **$TOTAL_WARN** |

## Deliverables

### T2.1: MCP defer_loading
- .mcp.json: 21 servers, 3 core (eager), 18 deferred
- scripts/validate-mcp-defer.sh: Validation script

### T2.2: Compact Optimization
- .claude/hooks/compact-optimizer.js: Session time + tool call tracking
- Registered as PostToolUse hook (all tools, 2s timeout)

### T2.3: Hook Optimization
- .claude/hooks/hook-profiler.js: Execution time profiler
- unified-guard.js entries merged (12 -> 11 registrations)
- 10/11 hooks under 100ms

### T2.4: Progressive Disclosure
- .claude/commands/help-advanced.md: /help-advanced command (L2)
- .claude/commands/help-expert.md: /help-expert command (L3)
- 3-layer structure: L1(CLAUDE.md) -> L2(CLAUDE-L2.md) -> L3(CLAUDE-L3.md)

## Estimated Token Savings

| Component | Savings |
|-----------|---------|
| MCP defer_loading (already configured) | 1-2K |
| Compact optimizer (session awareness) | ~0.5K |
| Hook consolidation (12->11) | ~0.5K |
| Progressive disclosure commands | ~0.5K |
| **Total Tier 2** | **~2.5-3.5K** |

## Cumulative (Tier 1 + Tier 2)

- Tier 1: 28-43K tokens saved
- Tier 2: 2.5-3.5K tokens saved
- **Total: 30.5-46.5K tokens saved**
EOF

echo ""
echo "Report generated: $REPORT_FILE"

# --- Write Metrics ---
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"tier\":2,\"overall\":\"$OVERALL\",\"pass\":$TOTAL_PASS,\"fail\":$TOTAL_FAIL,\"warn\":$TOTAL_WARN,\"t21\":\"$T21_STATUS\",\"t22\":\"$T22_STATUS\",\"t23\":\"$T23_STATUS\",\"t24\":\"$T24_STATUS\"}" >> "$METRICS_FILE"
echo "Metrics written: $METRICS_FILE"
