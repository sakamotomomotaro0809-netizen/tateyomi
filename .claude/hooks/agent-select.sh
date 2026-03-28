#!/bin/bash
# AIT42 Agent Select Hook
# Triggered: When Coordinator selects an agent
# Purpose: Log agent selection decisions for debugging

set -e

AGENT_NAME="${CLAUDE_AGENT_NAME:-unknown}"
SELECTION_REASON="${CLAUDE_SELECTION_REASON:-No reason provided}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/.claude/memory/logs"

mkdir -p "$LOG_DIR"

# Log agent selection
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_FILE="${LOG_DIR}/agent-selections.log"

echo "${TIMESTAMP} | Agent: ${AGENT_NAME} | Reason: ${SELECTION_REASON}" >> "$LOG_FILE"

# Rotate log file if too large (keep last 1000 lines)
if [ -f "$LOG_FILE" ]; then
    LINE_COUNT=$(wc -l < "$LOG_FILE")
    if [ "$LINE_COUNT" -gt 1000 ]; then
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
fi

exit 0
