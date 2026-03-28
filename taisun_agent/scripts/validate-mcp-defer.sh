#!/usr/bin/env bash
# Validate MCP defer_loading configuration
# T2.1: Ensures all non-core MCPs have defer_loading and search_keywords

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MCP_JSON="$PROJECT_DIR/.mcp.json"
SETTINGS_JSON="$PROJECT_DIR/.claude/settings.json"

PASS=0
FAIL=0
WARN=0

echo "=== MCP defer_loading Validation ==="
echo "Date: $(date)"
echo ""

# Check 1: .mcp.json exists
if [ -f "$MCP_JSON" ]; then
    echo "[PASS] .mcp.json exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] .mcp.json not found"
    FAIL=$((FAIL + 1))
    exit 1
fi

# Check 2: Core MCPs have defer_loading: false
CORE_MCPS=("taisun-proxy" "playwright" "open-websearch")
CORE_OK=true
for mcp in "${CORE_MCPS[@]}"; do
    DEFER=$(python3 -c "
import json
with open('$MCP_JSON') as f:
    data = json.load(f)
servers = data.get('mcpServers', {})
if '$mcp' in servers:
    print(servers['$mcp'].get('defer_loading', 'MISSING'))
else:
    print('NOT_FOUND')
")
    if [ "$DEFER" = "False" ] || [ "$DEFER" = "false" ]; then
        : # OK
    else
        echo "[FAIL] Core MCP '$mcp' should have defer_loading: false (got: $DEFER)"
        CORE_OK=false
        FAIL=$((FAIL + 1))
    fi
done
if [ "$CORE_OK" = true ]; then
    echo "[PASS] Core MCPs (${#CORE_MCPS[@]}) have defer_loading: false"
    PASS=$((PASS + 1))
fi

# Check 3: Non-core MCPs have defer_loading: true
NON_CORE_RESULT=$(python3 -c "
import json
with open('$MCP_JSON') as f:
    data = json.load(f)
servers = data.get('mcpServers', {})
core = {'taisun-proxy', 'playwright', 'open-websearch'}
missing_defer = []
missing_keywords = []
total = 0
for name, cfg in servers.items():
    if name.startswith('_comment'):
        continue
    if name in core:
        continue
    total += 1
    if not cfg.get('defer_loading', False):
        missing_defer.append(name)
    if not cfg.get('search_keywords'):
        missing_keywords.append(name)
print(f'{total}|{len(missing_defer)}|{len(missing_keywords)}|{\",\".join(missing_defer)}|{\",\".join(missing_keywords)}')
")

IFS='|' read -r TOTAL MISSING_DEFER MISSING_KW DEFER_LIST KW_LIST <<< "$NON_CORE_RESULT"

if [ "$MISSING_DEFER" -eq 0 ]; then
    echo "[PASS] All $TOTAL non-core MCPs have defer_loading: true"
    PASS=$((PASS + 1))
else
    echo "[FAIL] $MISSING_DEFER MCPs missing defer_loading: $DEFER_LIST"
    FAIL=$((FAIL + 1))
fi

if [ "$MISSING_KW" -eq 0 ]; then
    echo "[PASS] All $TOTAL non-core MCPs have search_keywords"
    PASS=$((PASS + 1))
else
    echo "[WARN] $MISSING_KW MCPs missing search_keywords: $KW_LIST"
    WARN=$((WARN + 1))
fi

# Check 4: disabledMcpServers in settings.json
if [ -f "$SETTINGS_JSON" ]; then
    DISABLED_COUNT=$(python3 -c "
import json
with open('$SETTINGS_JSON') as f:
    data = json.load(f)
print(len(data.get('disabledMcpServers', [])))
")
    if [ "$DISABLED_COUNT" -gt 0 ]; then
        echo "[PASS] disabledMcpServers: $DISABLED_COUNT servers disabled"
        PASS=$((PASS + 1))
    else
        echo "[WARN] No MCPs disabled in settings.json"
        WARN=$((WARN + 1))
    fi
else
    echo "[WARN] settings.json not found"
    WARN=$((WARN + 1))
fi

# Check 5: Presets exist
PRESET_COUNT=0
for preset in "$PROJECT_DIR/.claude/presets/"*.json; do
    [ -f "$preset" ] && PRESET_COUNT=$((PRESET_COUNT + 1))
done
if [ "$PRESET_COUNT" -ge 3 ]; then
    echo "[PASS] $PRESET_COUNT MCP presets available"
    PASS=$((PASS + 1))
else
    echo "[WARN] Only $PRESET_COUNT presets (recommend 3+)"
    WARN=$((WARN + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo "Result: ALL CHECKS PASSED"
    exit 0
else
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
