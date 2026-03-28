#!/bin/bash
# AIT42 Task Start Hook
# Triggered: When any agent starts a task
# Purpose: Initialize task tracking, capture start time

set -e

# Color codes
BLUE='\033[0;34m'
NC='\033[0m'

AGENT_NAME="${CLAUDE_AGENT_NAME:-unknown}"
TASK_DESCRIPTION="${CLAUDE_TASK_DESCRIPTION:-No description}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MEMORY_DIR="${PROJECT_ROOT}/.claude/memory"

echo -e "${BLUE}🚀 [task-start hook] Agent: ${AGENT_NAME}${NC}"
echo "   Task: ${TASK_DESCRIPTION}"

# Create tmp directory for task tracking
TMP_DIR="${PROJECT_ROOT}/.claude/tmp"
mkdir -p "$TMP_DIR"

# Record start timestamp
START_TIME=$(date +%s%3N)  # milliseconds
echo "$START_TIME" > "${TMP_DIR}/task-start-time.txt"

# Record task metadata
cat > "${TMP_DIR}/task-metadata.txt" << EOF
AGENT_NAME=${AGENT_NAME}
TASK_DESCRIPTION=${TASK_DESCRIPTION}
START_TIME=${START_TIME}
EOF

echo -e "${BLUE}🚀 [task-start hook] Tracking initialized${NC}"
exit 0
