#!/bin/bash
# TAISUN v2 - Phase 1 Verification Script
# Verifies all components are properly configured

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  TAISUN v2 - Phase 1 Verification"
echo "=============================================="
echo ""

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    WARNINGS=$((WARNINGS + 1))
}

# ============================================================
# 1. Core Dependencies
# ============================================================
echo "1️⃣  Checking Core Dependencies..."

if command -v git &>/dev/null; then
    check_pass "Git installed ($(git --version | head -1))"
else
    check_fail "Git not found"
fi

if command -v docker &>/dev/null; then
    check_pass "Docker installed ($(docker --version | head -1))"
else
    check_fail "Docker not found"
fi

if command -v node &>/dev/null; then
    check_pass "Node.js installed ($(node --version))"
else
    check_fail "Node.js not found"
fi

if command -v npm &>/dev/null; then
    check_pass "npm installed ($(npm --version))"
else
    check_fail "npm not found"
fi

echo ""

# ============================================================
# 2. Project Structure
# ============================================================
echo "2️⃣  Checking Project Structure..."

if [ -f "$PROJECT_ROOT/package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json not found"
fi

if [ -d "$PROJECT_ROOT/.claude" ]; then
    check_pass ".claude directory exists"
else
    check_fail ".claude directory not found"
fi

if [ -d "$PROJECT_ROOT/.claude/agents" ]; then
    AGENT_COUNT=$(ls -1 "$PROJECT_ROOT/.claude/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')
    check_pass "Agents directory exists ($AGENT_COUNT agents)"
else
    check_fail "Agents directory not found"
fi

if [ -d "$PROJECT_ROOT/.claude/skills" ]; then
    SKILL_COUNT=$(ls -1d "$PROJECT_ROOT/.claude/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
    check_pass "Skills directory exists ($SKILL_COUNT skills)"
else
    check_fail "Skills directory not found"
fi

if [ -d "$PROJECT_ROOT/.claude/commands" ]; then
    CMD_COUNT=$(ls -1 "$PROJECT_ROOT/.claude/commands"/*.md 2>/dev/null | wc -l | tr -d ' ')
    check_pass "Commands directory exists ($CMD_COUNT commands)"
else
    check_fail "Commands directory not found"
fi

echo ""

# ============================================================
# 3. Configuration Files
# ============================================================
echo "3️⃣  Checking Configuration Files..."

if [ -f "$PROJECT_ROOT/.env" ]; then
    check_pass ".env file exists"
else
    check_warn ".env file not found (copy from .env.example)"
fi

if [ -f "$PROJECT_ROOT/.mcp.json" ]; then
    MCP_COUNT=$(grep -c '"command"' "$PROJECT_ROOT/.mcp.json" 2>/dev/null || echo "0")
    check_pass ".mcp.json exists ($MCP_COUNT MCP servers)"
else
    check_fail ".mcp.json not found"
fi

if [ -f "$PROJECT_ROOT/docker-compose.tools.yml" ]; then
    check_pass "docker-compose.tools.yml exists"
else
    check_warn "docker-compose.tools.yml not found (Phase 1 tools)"
fi

echo ""

# ============================================================
# 4. Document Processing Tools
# ============================================================
echo "4️⃣  Checking Document Processing Tools..."

if command -v pandoc &>/dev/null; then
    check_pass "Pandoc installed ($(pandoc --version | head -1))"
else
    check_warn "Pandoc not installed (optional for docs export)"
fi

if docker ps 2>/dev/null | grep -q "taisun-gotenberg"; then
    check_pass "Gotenberg container running"
else
    check_warn "Gotenberg container not running (run 'make tools-up')"
fi

if docker ps 2>/dev/null | grep -q "taisun-stirling-pdf"; then
    check_pass "Stirling-PDF container running"
else
    check_warn "Stirling-PDF container not running (run 'make tools-up')"
fi

echo ""

# ============================================================
# Summary
# ============================================================
echo "=============================================="
echo "  Verification Summary"
echo "=============================================="
echo -e "  ${GREEN}Passed${NC}:   $PASSED"
echo -e "  ${RED}Failed${NC}:   $FAILED"
echo -e "  ${YELLOW}Warnings${NC}: $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi
