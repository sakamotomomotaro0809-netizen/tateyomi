#!/bin/bash
# TAISUN Agent v2.11.0 - Update Script
#
# Usage: ./scripts/update.sh
#
# This script:
# 1. Pulls latest changes
# 2. Updates npm dependencies
# 3. Updates global skills
# 4. Verifies 13-Layer Defense System

set -e

echo "========================================"
echo "  TAISUN Agent v2.11.0 Update"
echo "  13-Layer Fidelity Defense System"
echo "========================================"
echo ""

# Check if git repo
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository"
    echo "Please run from the taisun_agent directory"
    exit 1
fi

echo "1. Checking current version..."
CURRENT_VERSION=$(cat package.json | grep '"version"' | head -1 | cut -d'"' -f4)
echo "   Current: $CURRENT_VERSION"

echo ""
echo "2. Pulling latest changes..."
git fetch origin
git pull origin main --ff-only || {
    echo "Warning: Could not fast-forward. Manual merge may be needed."
}

echo ""
echo "3. Updating dependencies..."
npm install

echo ""
echo "4. Setting up 7-Layer Defense System..."

# Make hooks executable
chmod +x .claude/hooks/*.sh 2>/dev/null || true
chmod +x .claude/hooks/*.js 2>/dev/null || true

# Create required directories
mkdir -p .claude/temp
mkdir -p .taisun/memory

# List of required hook files
REQUIRED_HOOKS=(
    "auto-memory-saver.js"
    "session-continue-guard.js"
    "skill-usage-guard.js"
    "file-creation-guard.js"
    "workflow-state-manager.js"
    "workflow-fidelity-guard.js"
    "deviation-approval-guard.js"
    "workflow-sessionstart-injector.js"
    "session-handoff-generator.js"
    "violation-recorder.js"
    "workflow-guard-bash.sh"
    "workflow-guard-write.sh"
)

echo "   Checking hooks..."
MISSING=0
for hook in "${REQUIRED_HOOKS[@]}"; do
    if [ -f ".claude/hooks/$hook" ]; then
        echo "   - $hook: OK"
    else
        echo "   - $hook: MISSING"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -gt 0 ]; then
    echo ""
    echo "Warning: $MISSING hook files are missing"
    echo "Some defense features may not work correctly"
fi

echo ""
echo "5. Updating Claude Code Skills..."

# Install skills to ~/.claude/skills/
TARGET_SKILLS="$HOME/.claude/skills"
SOURCE_SKILLS=".claude/skills"

if [ -d "$SOURCE_SKILLS" ]; then
    mkdir -p "$TARGET_SKILLS"

    # Skills to install globally
    SKILLS_TO_INSTALL=(
        "sdd-req100"
        "sdd-adr"
        "sdd-design"
        "sdd-full"
        "sdd-guardrails"
        "sdd-runbook"
        "sdd-slo"
        "sdd-tasks"
        "sdd-threat"
        "gpt-researcher"
        "research"
        "research-free"
        "mega-research"
        "dual-ai-review"
        "taiyo-analyzer"
        "lp-analysis"
        "nanobanana-pro"
        "agentic-vision"
        "anime-slide-generator"
        "world-research"
        "apify-research"
        "video-agent"
        "taiyo-style-lp"
        "taiyo-style-sales-letter"
    )

    INSTALLED=0
    for skill in "${SKILLS_TO_INSTALL[@]}"; do
        if [ -d "$SOURCE_SKILLS/$skill" ]; then
            if [ ! -d "$TARGET_SKILLS/$skill" ] || [ "$SOURCE_SKILLS/$skill/SKILL.md" -nt "$TARGET_SKILLS/$skill/SKILL.md" ] 2>/dev/null; then
                cp -R "$SOURCE_SKILLS/$skill" "$TARGET_SKILLS/"
                echo "   - $skill: updated"
                ((INSTALLED++))
            else
                echo "   - $skill: already up to date"
            fi
        fi
    done

    echo "   Total skills updated: $INSTALLED"
else
    echo "   Warning: Skills directory not found"
fi

echo ""
echo "6. Verifying update..."

# Check new version
NEW_VERSION=$(cat package.json | grep '"version"' | head -1 | cut -d'"' -f4)
echo "   - Version: $CURRENT_VERSION -> $NEW_VERSION"

# Check settings.json for 13-layer defense
if grep -q "13-Layer Defense\|7-Layer Defense" .claude/settings.json 2>/dev/null; then
    echo "   - 13-Layer Defense: configured"
else
    echo "   - 13-Layer Defense: NOT configured"
fi

# Check CLAUDE.md for contract
if grep -q "WORKFLOW FIDELITY CONTRACT" .claude/CLAUDE.md 2>/dev/null; then
    echo "   - Fidelity Contract: present"
else
    echo "   - Fidelity Contract: NOT found"
fi

# Test hook execution
echo ""
echo "7. Testing hooks..."
if echo '{"source":"test","cwd":"'$(pwd)'"}' | node .claude/hooks/workflow-sessionstart-injector.js 2>/dev/null; then
    echo "   - workflow-sessionstart-injector.js: OK"
else
    echo "   - workflow-sessionstart-injector.js: FAILED"
fi

echo ""
echo "========================================"
echo "  Update Complete!"
echo "========================================"
echo ""
echo "13-Layer Defense System v2.11.0:"
echo "  Layer 0: CLAUDE.md Contract (absolute rules)"
echo "  Layer 1: SessionStart State Injection"
echo "  Layer 2: Permission Gate (phase restrictions)"
echo "  Layer 3: Read-before-Write enforcement"
echo "  Layer 4: Baseline Lock (script protection)"
echo "  Layer 5: Skill Evidence (skill usage tracking)"
echo "  Layer 6: Deviation Approval (pre-approval required)"
echo "  Layer 7-12: Agent/Copy Safety/Input/Auto-Select/Lint/Quality"
echo ""
echo "Installed/Updated Skills:"
echo "  /nanobanana-pro - AI画像生成（無料）"
echo "  /agentic-vision - 画像・動画分析（無料）"
echo "  /anime-slide-generator - アニメ風スライド生成（Mac/Win/Linux対応）"
echo "  /research-free - APIキー不要リサーチ"
echo "  ... and more"
echo ""
