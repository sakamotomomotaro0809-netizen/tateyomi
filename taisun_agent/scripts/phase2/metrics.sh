#!/bin/bash
# TAISUN v2 - Phase 2 Metrics Script

set -euo pipefail

PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
PROMETHEUS_URL="http://localhost:${PROMETHEUS_PORT}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

query_prometheus() {
    local query=$1
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=$(echo "$query" | jq -sRr @uri)" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A"
}

echo "=============================================="
echo "  TAISUN v2 - System Metrics"
echo "=============================================="
echo ""

if ! curl -sf "${PROMETHEUS_URL}/-/healthy" >/dev/null 2>&1; then
    echo "❌ Prometheus is not available. Run 'make monitoring-up' first."
    exit 1
fi

echo -e "${BLUE}📊 System Resources${NC}"
echo "-------------------------------------------"

CPU=$(query_prometheus '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)')
if [ "$CPU" != "N/A" ]; then
    CPU=$(printf "%.1f" "$CPU")
fi
echo "  CPU Usage:    ${CPU}%"

MEM=$(query_prometheus '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
if [ "$MEM" != "N/A" ]; then
    MEM=$(printf "%.1f" "$MEM")
fi
echo "  Memory Usage: ${MEM}%"

DISK=$(query_prometheus '(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100')
if [ "$DISK" != "N/A" ]; then
    DISK=$(printf "%.1f" "$DISK")
fi
echo "  Disk Free:    ${DISK}%"

echo ""
echo -e "${BLUE}📈 Prometheus Stats${NC}"
echo "-------------------------------------------"

TARGETS=$(query_prometheus 'count(up)')
echo "  Active Targets: ${TARGETS}"

ALERTS=$(query_prometheus 'count(ALERTS{alertstate="firing"})')
echo "  Firing Alerts:  ${ALERTS}"

echo ""
echo "-------------------------------------------"
echo "📊 Grafana: http://localhost:${GRAFANA_PORT:-3001}"
echo "📈 Prometheus: http://localhost:${PROMETHEUS_PORT}"
