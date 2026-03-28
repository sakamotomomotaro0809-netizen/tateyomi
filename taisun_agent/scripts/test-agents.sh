#!/bin/bash

# TAISUN Agent - Agent System Test Script
# エージェント、スキル、フックの動作テスト

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
SKIPPED=0

log_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

log_skip() {
    echo -e "${YELLOW}⊘ SKIP:${NC} $1"
    ((SKIPPED++))
}

log_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

echo ""
echo "=========================================="
echo "  TAISUN Agent System Test"
echo "=========================================="
echo ""

# ============================================
# 1. Hook Syntax Validation
# ============================================
echo -e "${CYAN}=== Hook Syntax Validation ===${NC}"

for hook in "$PROJECT_ROOT"/.claude/hooks/*.js; do
    if [[ -f "$hook" ]]; then
        if node --check "$hook" 2>/dev/null; then
            log_pass "$(basename "$hook")"
        else
            log_fail "$(basename "$hook") - syntax error"
        fi
    fi
done

for hook in "$PROJECT_ROOT"/.claude/hooks/*.sh; do
    if [[ -f "$hook" ]]; then
        if bash -n "$hook" 2>/dev/null; then
            log_pass "$(basename "$hook")"
        else
            log_fail "$(basename "$hook") - syntax error"
        fi
    fi
done

echo ""

# ============================================
# 2. Agent Definition Validation
# ============================================
echo -e "${CYAN}=== Agent Definition Validation ===${NC}"

agent_count=0
valid_agents=0

for agent in "$PROJECT_ROOT"/.claude/agents/*.md; do
    if [[ -f "$agent" ]]; then
        ((agent_count++))
        name=$(basename "$agent" .md)

        # Skip CLAUDE.md files
        [[ "$name" == "CLAUDE" ]] && continue

        # Check if file has content
        if [[ -s "$agent" ]]; then
            ((valid_agents++))
        else
            log_fail "Agent '$name' is empty"
        fi
    fi
done

if [[ $agent_count -gt 0 ]]; then
    log_pass "Found $agent_count agents ($valid_agents with content)"
else
    log_fail "No agents found"
fi

echo ""

# ============================================
# 3. Skill Definition Validation
# ============================================
echo -e "${CYAN}=== Skill Definition Validation ===${NC}"

skill_count=0
valid_skills=0
missing_definition=0

for skill_dir in "$PROJECT_ROOT"/.claude/skills/*; do
    if [[ -d "$skill_dir" ]]; then
        ((skill_count++))
        skill_name=$(basename "$skill_dir")

        # Check for SKILL.md or skill.md
        if [[ -f "$skill_dir/SKILL.md" ]] || [[ -f "$skill_dir/skill.md" ]]; then
            ((valid_skills++))
        else
            log_fail "Skill '$skill_name' missing SKILL.md"
            ((missing_definition++))
        fi
    fi
done

if [[ $missing_definition -eq 0 ]]; then
    log_pass "All $skill_count skills have definitions"
else
    log_fail "$missing_definition skills missing definitions"
fi

echo ""

# ============================================
# 4. Hook Execution Test
# ============================================
echo -e "${CYAN}=== Hook Execution Test ===${NC}"

# Test agent-enforcement-guard
if echo '{"prompt": "test"}' | timeout 5 node "$PROJECT_ROOT/.claude/hooks/agent-enforcement-guard.js" > /dev/null 2>&1; then
    log_pass "agent-enforcement-guard executes without error"
else
    log_fail "agent-enforcement-guard failed to execute"
fi

# Test auto-memory-saver
if timeout 5 node "$PROJECT_ROOT/.claude/hooks/auto-memory-saver.js" < /dev/null > /dev/null 2>&1; then
    log_pass "auto-memory-saver executes without error"
else
    log_fail "auto-memory-saver failed to execute"
fi

echo ""

# ============================================
# 5. Settings.json Validation
# ============================================
echo -e "${CYAN}=== Settings Validation ===${NC}"

settings_file="$PROJECT_ROOT/.claude/settings.json"
if [[ -f "$settings_file" ]]; then
    if node -e "JSON.parse(require('fs').readFileSync('$settings_file', 'utf8'))" 2>/dev/null; then
        log_pass "settings.json is valid JSON"

        # Count hooks
        hook_count=$(node -e "
            const s = JSON.parse(require('fs').readFileSync('$settings_file', 'utf8'));
            let count = 0;
            for (const [event, hooks] of Object.entries(s.hooks || {})) {
                if (Array.isArray(hooks)) count += hooks.length;
                else if (typeof hooks === 'object' && hooks.hooks) count += hooks.hooks.length;
            }
            console.log(count);
        " 2>/dev/null || echo "0")
        log_info "Configured hooks: $hook_count"
    else
        log_fail "settings.json is invalid JSON"
    fi
else
    log_fail "settings.json not found"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
