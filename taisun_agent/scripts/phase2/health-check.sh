#!/bin/bash
# TAISUN v2 - Phase 2 Monitoring Health Check

set -euo pipefail

PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
GRAFANA_PORT="${GRAFANA_PORT:-3001}"
LOKI_PORT="${LOKI_PORT:-3100}"
ALERTMANAGER_PORT="${ALERTMANAGER_PORT:-9093}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  TAISUN v2 - Monitoring Health Check"
echo "=============================================="
echo ""

HEALTHY=0
TOTAL=0

check_service() {
    local name=$1
    local url=$2
    TOTAL=$((TOTAL + 1))
    
    if curl -sf "$url" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
        HEALTHY=$((HEALTHY + 1))
    else
        echo -e "  ${RED}✗${NC} $name"
    fi
}

echo "Core Services:"
check_service "Prometheus" "http://localhost:${PROMETHEUS_PORT}/-/healthy"
check_service "Grafana" "http://localhost:${GRAFANA_PORT}/api/health"
check_service "Loki" "http://localhost:${LOKI_PORT}/ready"
check_service "Alertmanager" "http://localhost:${ALERTMANAGER_PORT}/-/healthy"

echo ""
echo "Exporters:"
check_service "Node Exporter" "http://localhost:${NODE_EXPORTER_PORT:-9100}/metrics"
check_service "cAdvisor" "http://localhost:${CADVISOR_PORT:-8081}/healthz"

echo ""
echo "-------------------------------------------"
if [ "$HEALTHY" -eq "$TOTAL" ]; then
    echo -e "${GREEN}All services healthy: $HEALTHY/$TOTAL${NC}"
else
    echo -e "${YELLOW}Services healthy: $HEALTHY/$TOTAL${NC}"
fi
