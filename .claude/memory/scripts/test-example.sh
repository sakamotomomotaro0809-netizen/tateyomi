#!/bin/bash

# AIT42 Memory System Test Script
# Demonstrates usage of record-task and update-agent-stats

set -e

echo "========================================"
echo "AIT42 Memory System Test Script"
echo "========================================"
echo ""

# Test 1: Record a successful task
echo "Test 1: Recording successful implementation task..."
npm run memory:record-task -- \
  --description "Implement user authentication API" \
  --agents backend-developer api-developer \
  --success true \
  --quality-score 95 \
  --task-type implementation \
  --duration-ms 12500 \
  --tags security api authentication

echo ""
echo "Test 2: Update backend-developer stats..."
npm run memory:update-stats -- \
  --agent backend-developer \
  --quality-score 95 \
  --success true \
  --task-id "2025-11-13-001" \
  --task-type implementation \
  --duration-ms 12500

echo ""
echo "Test 3: Update api-developer stats..."
npm run memory:update-stats -- \
  --agent api-developer \
  --quality-score 95 \
  --success true \
  --task-id "2025-11-13-001" \
  --task-type implementation \
  --duration-ms 12500

echo ""
echo "Test 4: Record a failed task..."
npm run memory:record-task -- \
  --description "Fix authentication bug" \
  --agents bug-fixer \
  --success false \
  --quality-score 60 \
  --task-type bug-fix \
  --duration-ms 8000 \
  --errors "Timeout exceeded" "Database connection failed" \
  --warnings "Deprecated API usage" \
  --tags bug security

echo ""
echo "Test 5: Update bug-fixer stats (failed task)..."
npm run memory:update-stats -- \
  --agent bug-fixer \
  --quality-score 60 \
  --success false \
  --task-id "2025-11-13-002" \
  --task-type bug-fix \
  --duration-ms 8000

echo ""
echo "========================================"
echo "All tests completed successfully!"
echo "========================================"
echo ""
echo "Check created files:"
echo "  Tasks: ls -lh .claude/memory/tasks/"
echo "  Stats: ls -lh .claude/memory/agents/"
