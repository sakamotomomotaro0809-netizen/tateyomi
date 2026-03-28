#!/usr/bin/env bash
# T4.6: Generate Release Approval Document
# Creates comprehensive release approval report for v2.20.0

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$PROJECT_DIR/.claude/hooks/data"
REPORT_DIR="$PROJECT_DIR/.claude/reports"
BASELINE_FILE="$DATA_DIR/baseline-metrics.json"
METRICS_FINAL="$DATA_DIR/metrics_final.jsonl"
REPORT_OUTPUT="$REPORT_DIR/release_approval.md"

mkdir -p "$REPORT_DIR"

VERSION="v2.20.0"
RELEASE_DATE="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "=== Generating Release Approval Document ==="
echo "Version: $VERSION"
echo "Date: $RELEASE_DATE"
echo ""

# --- Extract Latest Validation Results ---
REQ900_STATUS="UNKNOWN"
REQ901_STATUS="UNKNOWN"
REQ902_STATUS="UNKNOWN"
REQ903_STATUS="UNKNOWN"
OVERALL_STATUS="UNKNOWN"
BASELINE_TOKENS=75000
ESTIMATED_CURRENT=0
TOTAL_REDUCTION=0
REDUCTION_RATE=0
AVG_SESSION_TIME=0
BLOCK_RATE=0

if [ -f "$METRICS_FINAL" ]; then
    LATEST_LINE=$(tail -1 "$METRICS_FINAL")

    # Extract values using grep
    REQ900_STATUS=$(echo "$LATEST_LINE" | grep -o '"req900":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")
    REQ901_STATUS=$(echo "$LATEST_LINE" | grep -o '"req901":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")
    REQ902_STATUS=$(echo "$LATEST_LINE" | grep -o '"req902":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")
    REQ903_STATUS=$(echo "$LATEST_LINE" | grep -o '"req903":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")
    OVERALL_STATUS=$(echo "$LATEST_LINE" | grep -o '"overall":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")

    ESTIMATED_CURRENT=$(echo "$LATEST_LINE" | grep -o '"estimated_current":[0-9]*' | grep -o '[0-9]*$' || echo 0)
    TOTAL_REDUCTION=$(echo "$LATEST_LINE" | grep -o '"reduction_tokens":[0-9]*' | grep -o '[0-9]*$' || echo 0)
    REDUCTION_RATE=$(echo "$LATEST_LINE" | grep -o '"reduction_rate_pct":[0-9]*' | grep -o '[0-9]*$' || echo 0)
    AVG_SESSION_TIME=$(echo "$LATEST_LINE" | grep -o '"avg_session_min":[0-9]*' | grep -o '[0-9]*$' || echo 0)
    BLOCK_RATE=$(echo "$LATEST_LINE" | grep -o '"block_rate_pct":[0-9]*' | grep -o '[0-9]*$' || echo 0)

    echo "[INFO] Loaded validation results from metrics_final.jsonl"
else
    echo "[WARN] metrics_final.jsonl not found, using default values"
fi

# --- Calculate Phase Achievement ---
PHASE1_STATUS="PASS"
PHASE2_STATUS="PASS"
PHASE3_STATUS="PASS"
PHASE4_STATUS="PASS"

# Determine overall phase status from requirements
if [ "$REQ900_STATUS" != "PASS" ]; then
    PHASE1_STATUS="FAIL"
fi
if [ "$REQ902_STATUS" != "PASS" ]; then
    PHASE2_STATUS="FAIL"
fi
if [ "$REQ903_STATUS" != "PASS" ]; then
    PHASE3_STATUS="FAIL"
fi
if [ "$REQ901_STATUS" != "PASS" ]; then
    PHASE4_STATUS="FAIL"
fi

# --- Risk Assessment ---
RISK_LEVEL="LOW"
RISK_ITEMS=()

if [ "$OVERALL_STATUS" != "PASS" ]; then
    RISK_LEVEL="HIGH"
    RISK_ITEMS+=("Some requirements not met")
fi

if [ "$BLOCK_RATE" -ge 1 ]; then
    RISK_LEVEL="MEDIUM"
    RISK_ITEMS+=("Block rate ≥1%")
fi

if [ "$REDUCTION_RATE" -lt 55 ]; then
    RISK_LEVEL="HIGH"
    RISK_ITEMS+=("Reduction rate <55%")
fi

if [ ${#RISK_ITEMS[@]} -eq 0 ]; then
    RISK_ITEMS+=("No significant risks identified")
fi

# --- Generate Approval Document ---
cat > "$REPORT_OUTPUT" << EOF
# Release Approval Document

## Release Information

| Field | Value |
|-------|-------|
| **Version** | **$VERSION** |
| **Release Date** | **$RELEASE_DATE** |
| **Generated** | $TIMESTAMP |
| **Overall Status** | **$OVERALL_STATUS** |
| **Risk Level** | **$RISK_LEVEL** |

---

## Requirements Validation (REQ-900~903)

| Requirement | Description | Target | Status |
|-------------|-------------|--------|--------|
| **REQ-900** | Initial Context Token Consumption | ≤40K tokens | **$REQ900_STATUS** |
| **REQ-901** | Session Duration | ≥120 minutes | **$REQ901_STATUS** |
| **REQ-902** | Token Reduction Rate | ≥55% | **$REQ902_STATUS** |
| **REQ-903** | Hook Error Rate | <1% | **$REQ903_STATUS** |

### Detailed Metrics

| Metric | Value | Target | Met |
|--------|-------|--------|-----|
| Baseline Tokens | ${BASELINE_TOKENS} | - | - |
| Current Tokens (estimated) | ${ESTIMATED_CURRENT} | ≤40,000 | $([ "$ESTIMATED_CURRENT" -le 40000 ] && echo "✓" || echo "✗") |
| Token Reduction | ${TOTAL_REDUCTION} | ≥35,000 | $([ "$TOTAL_REDUCTION" -ge 35000 ] && echo "✓" || echo "✗") |
| Reduction Rate | ${REDUCTION_RATE}% | ≥55% | $([ "$REDUCTION_RATE" -ge 55 ] && echo "✓" || echo "✗") |
| Avg Session Time | ${AVG_SESSION_TIME} min | ≥120 min | $([ "$AVG_SESSION_TIME" -ge 120 ] && echo "✓" || echo "✗") |
| Hook Block Rate | ${BLOCK_RATE}% | <1% | $([ "$BLOCK_RATE" -lt 1 ] && echo "✓" || echo "✗") |

---

## Phase Achievement Status

| Phase | Description | Status | Key Deliverables |
|-------|-------------|--------|------------------|
| **Phase 1** | Foundation (Week 1-3) | **$PHASE1_STATUS** | Skills optimization, MCP deferred loading, command reduction |
| **Phase 2** | Compression (Week 4-6) | **$PHASE2_STATUS** | Context compression, history optimization, dynamic tuning |
| **Phase 3** | Intelligence (Week 7-9) | **$PHASE3_STATUS** | Progressive disclosure, hook optimization, Tier 3 integration |
| **Phase 4** | Quality Assurance (Week 10-12) | **$PHASE4_STATUS** | Metrics, dashboard, anomaly detection, canary, rollback |

### Phase 1 Achievements
- Skill model invocation disabled (99 skills)
- MCP server deferred loading (8 servers)
- Command consolidation (82 commands)
- **Reduction**: ~35,000 tokens

### Phase 2 Achievements
- Context compression engine
- History-aware optimization
- Dynamic compression ratio tuning
- **Reduction**: ~3,000 tokens

### Phase 3 Achievements
- Progressive skill disclosure
- Hook fast-path optimization
- Unified hook architecture
- **Reduction**: ~6,800 tokens

### Phase 4 Achievements
- Session metrics collector (REQ-904)
- Weekly dashboard generator (REQ-905)
- Anomaly detector (REQ-906)
- Canary controller (REQ-907)
- Rollback manager (REQ-908)

---

## Risk Assessment

**Risk Level**: **$RISK_LEVEL**

### Identified Risks

EOF

# Add risk items
for risk in "${RISK_ITEMS[@]}"; do
    echo "- $risk" >> "$REPORT_OUTPUT"
done

cat >> "$REPORT_OUTPUT" << EOF

### Mitigation Strategies

- **Canary Deployment**: Start with 10% traffic, monitor for 48 hours
- **Automated Rollback**: Configured in canary-controller.js
- **Manual Rollback**: Available via scripts/rollback-manager.sh
- **Monitoring**: Weekly dashboard + anomaly detection active

---

## Quality Gates

| Gate | Requirement | Status |
|------|-------------|--------|
| Token consumption | ≤40K | $([ "$REQ900_STATUS" = "PASS" ] && echo "✓ PASS" || echo "✗ FAIL") |
| Session duration | ≥120 min | $([ "$REQ901_STATUS" = "PASS" ] && echo "✓ PASS" || echo "✗ FAIL") |
| Reduction rate | ≥55% | $([ "$REQ902_STATUS" = "PASS" ] && echo "✓ PASS" || echo "✗ FAIL") |
| Error rate | <1% | $([ "$REQ903_STATUS" = "PASS" ] && echo "✓ PASS" || echo "✗ FAIL") |

---

## Deployment Plan

### Phase 1: Canary (10% traffic, 48 hours)
- Deploy to canary environment
- Monitor metrics via dashboard
- Check for anomalies
- Decision: proceed/rollback

### Phase 2: Partial (50% traffic, 72 hours)
- Expand to 50% of sessions
- Continue monitoring
- Validate no quality degradation
- Decision: proceed/rollback

### Phase 3: Full Release (100% traffic)
- Complete rollout
- Monitor for 7 days
- Archive baseline metrics
- Document lessons learned

---

## Rollback Procedures

### Automated Rollback
- Trigger: Quality degradation detected by anomaly-detector.js
- Action: canary-controller.js automatically reverts to previous version
- Notification: Alert logged to alerts.jsonl

### Manual Rollback
\`\`\`bash
# Quick restore to latest backup
bash scripts/restore.sh

# Or select specific backup
bash scripts/rollback-manager.sh list
bash scripts/rollback-manager.sh restore <backup-name>
\`\`\`

---

## Approval Section

### Technical Approval

**Status**: $([ "$OVERALL_STATUS" = "PASS" ] && echo "✓ APPROVED" || echo "⚠ PENDING")

| Reviewer | Role | Date | Status |
|----------|------|------|--------|
| System Validation | Automated | $TIMESTAMP | $OVERALL_STATUS |
| Technical Lead | Manual | ___________ | __________ |

### Release Decision

- [ ] **APPROVE** - Proceed with canary deployment
- [ ] **REJECT** - Address failures and re-validate
- [ ] **DEFER** - Request additional review/testing

**Decision Date**: ___________

**Approved By**: ___________

**Notes**:
```




```

---

## References

- **SDD Document**: kiro/specs/context-optimization/sdd.md
- **Validation Script**: scripts/validate-final.sh
- **Metrics**: .claude/hooks/data/metrics_final.jsonl
- **Full Report**: .claude/reports/final_validation_report.md

---

## Appendix: System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│ Context Optimization Architecture v2.20.0               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tier 1: Foundation (35K tokens)                        │
│    ├─ Skills: disable model invocation                 │
│    ├─ Commands: consolidation                          │
│    └─ MCP: deferred loading                            │
│                                                         │
│  Tier 2: Compression (3K tokens)                        │
│    ├─ Context compression engine                       │
│    ├─ History optimization                             │
│    └─ Dynamic tuning                                   │
│                                                         │
│  Tier 3: Intelligence (6.8K tokens)                     │
│    ├─ Progressive disclosure                           │
│    ├─ Hook optimization                                │
│    └─ Unified architecture                             │
│                                                         │
│  Phase 4: Quality Assurance                             │
│    ├─ Metrics collector (REQ-904)                      │
│    ├─ Dashboard generator (REQ-905)                    │
│    ├─ Anomaly detector (REQ-906)                       │
│    ├─ Canary controller (REQ-907)                      │
│    └─ Rollback manager (REQ-908)                       │
│                                                         │
│  Total Reduction: ${TOTAL_REDUCTION} tokens (${REDUCTION_RATE}%)                  │
│  Target: 35K tokens (55%)                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
\`\`\`

**Document Version**: 1.0
**Generated**: $TIMESTAMP

EOF

echo ""
echo "Release approval document generated: $REPORT_OUTPUT"
echo ""
echo "Summary:"
echo "  Version: $VERSION"
echo "  Overall: $OVERALL_STATUS"
echo "  Risk Level: $RISK_LEVEL"
echo "  REQ-900: $REQ900_STATUS | REQ-901: $REQ901_STATUS | REQ-902: $REQ902_STATUS | REQ-903: $REQ903_STATUS"
echo ""

if [ "$OVERALL_STATUS" = "PASS" ]; then
    echo "✓ Release APPROVED for canary deployment"
    exit 0
else
    echo "⚠ Release requires review before deployment"
    exit 1
fi
