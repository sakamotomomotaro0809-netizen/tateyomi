#!/bin/bash
# TAISUN v2 - Phase 1 Diagnostics Script
# Runs comprehensive system diagnostics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  TAISUN v2 - System Diagnostics"
echo "=============================================="
echo ""
echo "📅 Date: $(date)"
echo "💻 Host: $(hostname)"
echo "🖥️  OS: $(uname -s) $(uname -r)"
echo ""

# ============================================================
# 1. System Resources
# ============================================================
echo -e "${BLUE}1️⃣  System Resources${NC}"
echo "-------------------------------------------"

echo "Memory:"
if command -v free &>/dev/null; then
    free -h 2>/dev/null || echo "  Unable to check memory"
elif [ "$(uname)" = "Darwin" ]; then
    echo "  Total: $(sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 " GB"}')"
fi

echo ""
echo "Disk Space:"
df -h "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5" used)"}'

echo ""
echo "Docker Resources:"
if command -v docker &>/dev/null; then
    docker system df 2>/dev/null | head -5 || echo "  Docker not accessible"
else
    echo "  Docker not installed"
fi

echo ""

# ============================================================
# 2. Service Status
# ============================================================
echo -e "${BLUE}2️⃣  Service Status${NC}"
echo "-------------------------------------------"

echo "Docker Containers:"
if command -v docker &>/dev/null && docker info &>/dev/null; then
    RUNNING=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$(docker ps -aq 2>/dev/null | wc -l | tr -d ' ')
    echo "  Running: $RUNNING / Total: $TOTAL"

    echo ""
    echo "  TAISUN Containers:"
    docker ps --filter "name=taisun" --format "    {{.Names}}: {{.Status}}" 2>/dev/null || echo "    None running"
else
    echo "  Docker daemon not running"
fi

echo ""

# ============================================================
# 3. Network Connectivity
# ============================================================
echo -e "${BLUE}3️⃣  Network Connectivity${NC}"
echo "-------------------------------------------"

check_endpoint() {
    local name=$1
    local url=$2
    if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} $name: reachable"
    else
        echo -e "  ${RED}❌${NC} $name: unreachable"
    fi
}

check_endpoint "Gotenberg" "http://localhost:3000/health"
check_endpoint "Stirling-PDF" "http://localhost:8080/api/v1/info"
check_endpoint "GitHub API" "https://api.github.com"

echo ""

# ============================================================
# 4. Configuration Validation
# ============================================================
echo -e "${BLUE}4️⃣  Configuration Validation${NC}"
echo "-------------------------------------------"

echo "Environment Variables:"
if [ -f "$PROJECT_ROOT/.env" ]; then
    VAR_COUNT=$(grep -c "^[A-Z]" "$PROJECT_ROOT/.env" 2>/dev/null || echo "0")
    echo "  .env: $VAR_COUNT variables defined"
else
    echo "  .env: not found"
fi

echo ""
echo "MCP Configuration:"
if [ -f "$PROJECT_ROOT/.mcp.json" ]; then
    if command -v jq &>/dev/null; then
        SERVER_COUNT=$(jq '.mcpServers | length' "$PROJECT_ROOT/.mcp.json" 2>/dev/null || echo "?")
        echo "  MCP Servers: $SERVER_COUNT configured"
    else
        SERVER_COUNT=$(grep -c '"command"' "$PROJECT_ROOT/.mcp.json" 2>/dev/null || echo "?")
        echo "  MCP Servers: ~$SERVER_COUNT configured"
    fi
else
    echo "  .mcp.json: not found"
fi

echo ""

# ============================================================
# 5. Node.js Environment
# ============================================================
echo -e "${BLUE}5️⃣  Node.js Environment${NC}"
echo "-------------------------------------------"

if command -v node &>/dev/null; then
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"

    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        DEP_COUNT=$(ls -1 "$PROJECT_ROOT/node_modules" 2>/dev/null | wc -l | tr -d ' ')
        echo "  Dependencies: $DEP_COUNT packages installed"
    else
        echo "  Dependencies: not installed (run 'npm install')"
    fi
else
    echo "  Node.js: not installed"
fi

echo ""

# ============================================================
# 6. Git Repository Status
# ============================================================
echo -e "${BLUE}6️⃣  Git Repository Status${NC}"
echo "-------------------------------------------"

cd "$PROJECT_ROOT"
if [ -d ".git" ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo "  Branch: $BRANCH"

    MODIFIED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo "  Modified files: $MODIFIED"

    LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null | head -c 60)
    echo "  Last commit: $LAST_COMMIT"
else
    echo "  Not a git repository"
fi

echo ""

# ============================================================
# 7. TAISUN Components
# ============================================================
echo -e "${BLUE}7️⃣  TAISUN Components${NC}"
echo "-------------------------------------------"

if [ -d "$PROJECT_ROOT/.claude" ]; then
    AGENTS=$(ls -1 "$PROJECT_ROOT/.claude/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')
    SKILLS=$(ls -1d "$PROJECT_ROOT/.claude/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
    COMMANDS=$(ls -1 "$PROJECT_ROOT/.claude/commands"/*.md 2>/dev/null | wc -l | tr -d ' ')

    echo "  Agents: $AGENTS"
    echo "  Skills: $SKILLS"
    echo "  Commands: $COMMANDS"

    if [ -d "$PROJECT_ROOT/.claude/memory" ]; then
        echo "  Memory: enabled"
    else
        echo "  Memory: disabled"
    fi
else
    echo "  .claude directory not found"
fi

echo ""
echo "=============================================="
echo "  Diagnostics Complete"
echo "=============================================="
