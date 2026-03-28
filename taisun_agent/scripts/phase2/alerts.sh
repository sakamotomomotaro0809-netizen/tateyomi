#!/bin/bash
# TAISUN v2 - Phase 2 Alerts Script

set -euo pipefail

ALERTMANAGER_PORT="${ALERTMANAGER_PORT:-9093}"
ALERTMANAGER_URL="http://localhost:${ALERTMANAGER_PORT}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=============================================="
echo "  TAISUN v2 - Active Alerts"
echo "=============================================="
echo ""

if ! curl -sf "${ALERTMANAGER_URL}/-/healthy" >/dev/null 2>&1; then
    echo "❌ Alertmanager is not available. Run 'make monitoring-up' first."
    exit 1
fi

ALERTS=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" 2>/dev/null)

if [ -z "$ALERTS" ] || [ "$ALERTS" = "[]" ]; then
    echo -e "${GREEN}✅ No active alerts${NC}"
    echo ""
    exit 0
fi

echo "$ALERTS" | jq -r '.[] | "\(.labels.severity | ascii_upcase): \(.labels.alertname)\n  Instance: \(.labels.instance // "N/A")\n  Summary: \(.annotations.summary // "N/A")\n  Started: \(.startsAt)\n"' 2>/dev/null || echo "Error parsing alerts"

CRITICAL=$(echo "$ALERTS" | jq '[.[] | select(.labels.severity == "critical")] | length' 2>/dev/null || echo "0")
WARNING=$(echo "$ALERTS" | jq '[.[] | select(.labels.severity == "warning")] | length' 2>/dev/null || echo "0")

echo "-------------------------------------------"
echo -e "  ${RED}Critical${NC}: $CRITICAL"
echo -e "  ${YELLOW}Warning${NC}:  $WARNING"
echo ""
echo "📊 Alertmanager: ${ALERTMANAGER_URL}"
