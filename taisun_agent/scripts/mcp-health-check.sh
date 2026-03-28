#!/bin/bash
#
# MCP Health Check Script v2
# Auto-detects servers from .mcp.json and validates env vars
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MCP_CONFIG="$PROJECT_ROOT/.mcp.json"

echo "=========================================="
echo "  MCP Server Health Check v2"
echo "=========================================="
echo ""

if [ ! -f "$MCP_CONFIG" ]; then
    echo -e "${RED}Error: .mcp.json not found at $MCP_CONFIG${NC}"
    exit 1
fi

# Load environment variables safely
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required. Install with: brew install jq${NC}"
    exit 1
fi

TOTAL=0
READY=0
DISABLED=0
MISSING_ENV=0

# Get all server names (excluding _comment* keys)
SERVERS=$(jq -r '.mcpServers | keys[] | select(startswith("_comment") | not)' "$MCP_CONFIG" 2>/dev/null)

for SERVER in $SERVERS; do
    TOTAL=$((TOTAL + 1))

    IS_DISABLED=$(jq -r ".mcpServers[\"$SERVER\"].disabled // false" "$MCP_CONFIG")
    DESCRIPTION=$(jq -r ".mcpServers[\"$SERVER\"].description // \"No description\"" "$MCP_CONFIG")
    CATEGORY=$(jq -r ".mcpServers[\"$SERVER\"].category // \"general\"" "$MCP_CONFIG")
    COST_WARNING=$(jq -r ".mcpServers[\"$SERVER\"].cost_warning // false" "$MCP_CONFIG")

    if [ "$IS_DISABLED" = "true" ]; then
        echo -e "${YELLOW}[$CATEGORY] $SERVER (DISABLED)${NC}"
        DISABLED=$((DISABLED + 1))
    else
        echo -e "${CYAN}[$CATEGORY] $SERVER${NC}"
    fi
    echo "  $DESCRIPTION"

    if [ "$COST_WARNING" = "true" ]; then
        echo -e "  ${YELLOW}! Cost warning: API calls may incur charges${NC}"
    fi

    # Auto-detect env vars from the server's env config
    SERVER_OK=true
    ENV_KEYS=$(jq -r ".mcpServers[\"$SERVER\"].env // {} | keys[]" "$MCP_CONFIG" 2>/dev/null)

    for ENV_KEY in $ENV_KEYS; do
        ENV_REF=$(jq -r ".mcpServers[\"$SERVER\"].env[\"$ENV_KEY\"]" "$MCP_CONFIG")
        VAR_NAME=$(echo "$ENV_REF" | sed -E 's/^\$\{([^:}]+)(:-[^}]*)?\}$/\1/')

        if [ -n "$VAR_NAME" ] && [ "$VAR_NAME" != "$ENV_REF" ]; then
            VALUE="${!VAR_NAME:-}"
            if [ -z "$VALUE" ] || echo "$VALUE" | grep -qE '^(your_|sk-xxx|xxx)'; then
                echo -e "  ${RED}MISSING: $VAR_NAME${NC}"
                SERVER_OK=false
            else
                echo -e "  ${GREEN}OK: $VAR_NAME${NC}"
            fi
        fi
    done

    # Special checks for local MCP server binaries
    case $SERVER in
        "taisun-proxy")
            DIST_FILE="$PROJECT_ROOT/dist/proxy-mcp/server.js"
            if [ -f "$DIST_FILE" ]; then
                echo -e "  ${GREEN}OK: dist/proxy-mcp/server.js${NC}"
            else
                echo -e "  ${RED}MISSING: dist/proxy-mcp/server.js (run: npm run build)${NC}"
                SERVER_OK=false
            fi
            ;;
        "line-bot"|"voice-ai"|"ai-sdr")
            SERVER_DIST=$(jq -r ".mcpServers[\"$SERVER\"].args[0]" "$MCP_CONFIG")
            if [ -f "$PROJECT_ROOT/$SERVER_DIST" ]; then
                echo -e "  ${GREEN}OK: $SERVER_DIST${NC}"
            else
                echo -e "  ${RED}MISSING: $SERVER_DIST (run: npm run build)${NC}"
                SERVER_OK=false
            fi
            ;;
        "youtube")
            YOUTUBE_PATH=$(jq -r ".mcpServers[\"$SERVER\"].args[0]" "$MCP_CONFIG")
            if [ -f "$YOUTUBE_PATH" ]; then
                echo -e "  ${GREEN}OK: youtube MCP binary${NC}"
            else
                echo -e "  ${RED}MISSING: $YOUTUBE_PATH${NC}"
                SERVER_OK=false
            fi
            ;;
    esac

    if $SERVER_OK; then
        if [ "$IS_DISABLED" != "true" ]; then
            READY=$((READY + 1))
        fi
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        MISSING_ENV=$((MISSING_ENV + 1))
        echo -e "  Status: ${RED}NEEDS CONFIG${NC}"
    fi
    echo ""
done

echo "=========================================="
echo "  Summary"
echo "=========================================="
echo -e "  Total Servers:    $TOTAL"
echo -e "  ${GREEN}Ready:            $READY${NC}"
echo -e "  ${YELLOW}Disabled:         $DISABLED${NC}"
echo -e "  ${RED}Needs Config:     $MISSING_ENV${NC}"
echo ""

if [ $MISSING_ENV -gt 0 ]; then
    echo -e "${YELLOW}Run 'bash scripts/validate-env.sh' for env var details.${NC}"
fi
