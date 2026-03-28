#!/bin/bash
# AIT42 Task Complete Hook
# Triggered: When any agent completes a task
# Purpose: Automatically record task execution to Memory System

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hook metadata from Claude Code
AGENT_NAME="${CLAUDE_AGENT_NAME:-unknown}"
TASK_DESCRIPTION="${CLAUDE_TASK_DESCRIPTION:-No description}"
TASK_SUCCESS="${CLAUDE_TASK_SUCCESS:-false}"
TASK_DURATION_MS="${CLAUDE_TASK_DURATION_MS:-0}"
QUALITY_SCORE="${CLAUDE_QUALITY_SCORE:-0}"
TASK_TYPE="${CLAUDE_TASK_TYPE:-implementation}"

# Project root (where .claude/hooks.json exists)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MEMORY_DIR="${PROJECT_ROOT}/.claude/memory"
SCRIPTS_DIR="${MEMORY_DIR}/scripts"

echo -e "${BLUE}🧠 [task-complete hook] Recording to Memory System...${NC}"
echo "   Agent: ${AGENT_NAME}"
echo "   Success: ${TASK_SUCCESS}"
echo "   Quality: ${QUALITY_SCORE}/100"
echo "   Duration: ${TASK_DURATION_MS}ms"

# Check if Memory System scripts exist
if [ ! -f "${SCRIPTS_DIR}/record-task.ts" ]; then
    echo -e "${YELLOW}⚠️  Warning: Memory System scripts not found${NC}"
    echo "   Expected: ${SCRIPTS_DIR}/record-task.ts"
    echo "   Skipping memory recording (non-critical)"
    exit 0
fi

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: npx not found${NC}"
    echo "   Memory recording requires Node.js/npm"
    echo "   Skipping memory recording (non-critical)"
    exit 0
fi

# Extract errors and warnings from Claude Code output (if available)
ERRORS_FILE="${PROJECT_ROOT}/.claude/tmp/task-errors.txt"
WARNINGS_FILE="${PROJECT_ROOT}/.claude/tmp/task-warnings.txt"

ERRORS_ARGS=""
WARNINGS_ARGS=""

if [ -f "$ERRORS_FILE" ]; then
    while IFS= read -r line; do
        ERRORS_ARGS+=" --errors \"$line\""
    done < "$ERRORS_FILE"
fi

if [ -f "$WARNINGS_FILE" ]; then
    while IFS= read -r line; do
        WARNINGS_ARGS+=" --warnings \"$line\""
    done < "$WARNINGS_FILE"
fi

# Auto-capture git diff if enabled
AUTO_CAPTURE_FLAG=""
if [ "${AUTO_CAPTURE_DIFF:-false}" == "true" ]; then
    AUTO_CAPTURE_FLAG="--auto-capture-diff"
fi

# Record task to Memory System
cd "$PROJECT_ROOT"

RECORD_CMD="npx tsx ${SCRIPTS_DIR}/record-task.ts \
  --description \"${TASK_DESCRIPTION}\" \
  --agents ${AGENT_NAME} \
  --success ${TASK_SUCCESS} \
  --quality-score ${QUALITY_SCORE} \
  --duration-ms ${TASK_DURATION_MS} \
  --task-type ${TASK_TYPE} \
  ${AUTO_CAPTURE_FLAG} \
  ${ERRORS_ARGS} \
  ${WARNINGS_ARGS}"

if eval "$RECORD_CMD" 2>&1; then
    echo -e "${GREEN}✅ Task recorded to Memory System${NC}"

    # Update agent statistics
    UPDATE_CMD="npx tsx ${SCRIPTS_DIR}/update-agent-stats.ts \
      --agent ${AGENT_NAME} \
      --quality-score ${QUALITY_SCORE} \
      --success ${TASK_SUCCESS} \
      --task-id \$(ls -t ${MEMORY_DIR}/tasks/*.yaml | head -1 | xargs basename | cut -d'-' -f1-3) \
      --task-type ${TASK_TYPE} \
      --duration-ms ${TASK_DURATION_MS}"

    if eval "$UPDATE_CMD" 2>&1; then
        echo -e "${GREEN}✅ Agent stats updated${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Failed to update agent stats${NC}"
    fi

    # Check if consolidated stats regeneration is needed (every 10 tasks)
    TASK_COUNT=$(find "${MEMORY_DIR}/tasks" -name "*.yaml" -type f | wc -l | tr -d ' ')
    if [ $((TASK_COUNT % 10)) -eq 0 ]; then
        echo -e "${BLUE}🔄 Regenerating consolidated stats (task #${TASK_COUNT})...${NC}"
        if [ -f "${PROJECT_ROOT}/scripts/consolidate-agent-stats.py" ]; then
            cd "$PROJECT_ROOT"
            python3 scripts/consolidate-agent-stats.py 2>&1 || echo -e "${YELLOW}⚠️  Warning: Consolidation failed${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Warning: Failed to record task to Memory System${NC}"
    echo "   This is non-critical - task results are still valid"
fi

# Cleanup temp files
rm -f "$ERRORS_FILE" "$WARNINGS_FILE"

echo -e "${BLUE}🧠 [task-complete hook] Complete${NC}"
exit 0
