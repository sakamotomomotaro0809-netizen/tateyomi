#!/bin/bash
# AIT42 Integration Test Runner
# Version 1.0.0

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AIT42 v1.4.0 Integration Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Logging
LOG_FILE="logs/integration-test-$(date +%Y%m%d-%H%M%S).log"
mkdir -p logs

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Test 1: Memory Read
test_memory_read() {
    echo -n "Test 1: Memory Read... "
    log "Running Test 1: Memory Read"

    if [ -f ".claude/memory/agents/backend-developer-stats.yaml" ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: Agent stats file exists"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - Agent stats file missing"
        log "✗ FAIL: Agent stats file missing"
        ((FAILED++))
    fi
}

# Test 2: YAML Validity
test_yaml_validity() {
    echo -n "Test 2: YAML Validity... "
    log "Running Test 2: YAML Validity"

    local invalid_count=0
    for file in .claude/memory/**/*.yaml; do
        if [ -f "$file" ]; then
            if ! python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
                log "Invalid YAML: $file"
                ((invalid_count++))
            fi
        fi
    done

    if [ $invalid_count -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All YAML files valid"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $invalid_count invalid YAML files"
        log "✗ FAIL: $invalid_count invalid YAML files"
        ((FAILED++))
    fi
}

# Test 3: Agent Stats Calculation
test_agent_stats_calculation() {
    echo -n "Test 3: Agent Stats Calculation... "
    log "Running Test 3: Agent Stats Calculation"

    local stats_file=".claude/memory/agents/backend-developer-stats.yaml"

    if [ ! -f "$stats_file" ]; then
        echo -e "${YELLOW}SKIP${NC} - Stats file not found"
        log "⊘ SKIP: Stats file not found"
        ((SKIPPED++))
        return
    fi

    # Read stats
    total=$(grep "^total_tasks:" "$stats_file" | awk '{print $2}')
    success=$(grep "^successful_tasks:" "$stats_file" | awk '{print $2}')
    rate=$(grep "^success_rate:" "$stats_file" | awk '{print $2}')

    if [ -z "$total" ] || [ "$total" -eq 0 ]; then
        echo -e "${YELLOW}SKIP${NC} - No tasks yet"
        log "⊘ SKIP: No tasks yet"
        ((SKIPPED++))
        return
    fi

    # Calculate expected
    expected=$(echo "scale=3; $success / $total" | bc)

    # Compare (allow 0.001 tolerance)
    diff=$(echo "$rate - $expected" | bc | tr -d '-')
    if (( $(echo "$diff < 0.001" | bc -l) )); then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: Success rate calculation correct (expected: $expected, got: $rate)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - Expected: $expected, Got: $rate"
        log "✗ FAIL: Success rate mismatch (expected: $expected, got: $rate)"
        ((FAILED++))
    fi
}

# Test 4: Task Record Format
test_task_record_format() {
    echo -n "Test 4: Task Record Format... "
    log "Running Test 4: Task Record Format"

    local task_file=".claude/memory/tasks/2025-11-04-001-api-implementation.yaml"

    if [ ! -f "$task_file" ]; then
        echo -e "${YELLOW}SKIP${NC} - Sample task not found"
        log "⊘ SKIP: Sample task file not found"
        ((SKIPPED++))
        return
    fi

    local required_fields=("id" "timestamp" "request" "task_type" "selected_agents" "success" "quality_score")
    local missing=0

    for field in "${required_fields[@]}"; do
        if ! grep -q "^$field:" "$task_file" 2>/dev/null; then
            echo -e "${RED}FAIL${NC} - Missing field: $field"
            log "✗ FAIL: Missing required field: $field"
            ((missing++))
        fi
    done

    if [ $missing -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All required fields present"
        ((PASSED++))
    else
        ((FAILED++))
    fi
}

# Test 5: Performance - Read Speed
test_performance_read() {
    echo -n "Test 5: Performance - Read Speed... "
    log "Running Test 5: Performance - Read Speed"

    local stats_file=".claude/memory/agents/backend-developer-stats.yaml"

    if [ ! -f "$stats_file" ]; then
        echo -e "${YELLOW}SKIP${NC} - Stats file not found"
        log "⊘ SKIP: Stats file not found"
        ((SKIPPED++))
        return
    fi

    start=$(date +%s%3N)
    cat "$stats_file" > /dev/null
    end=$(date +%s%3N)

    duration=$((end - start))

    if [ $duration -lt 10 ]; then
        echo -e "${GREEN}PASS${NC} (${duration}ms)"
        log "✓ PASS: Read speed acceptable (${duration}ms < 10ms)"
        ((PASSED++))
    else
        echo -e "${YELLOW}SLOW${NC} (${duration}ms > 10ms)"
        log "⚠ SLOW: Read speed acceptable but slow (${duration}ms)"
        ((PASSED++))
    fi
}

# Test 6: Backup Directory Exists
test_backup_directory() {
    echo -n "Test 6: Backup Directory... "
    log "Running Test 6: Backup Directory"

    if [ -d ".claude/memory-backup/" ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: Backup directory exists"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - Backup directory missing"
        log "✗ FAIL: Backup directory missing"
        ((FAILED++))
    fi
}

# Test 7: Config Validation
test_config_validation() {
    echo -n "Test 7: Config Validation... "
    log "Running Test 7: Config Validation"

    local config_file=".claude/memory/config.yaml"

    if [ -f "$config_file" ]; then
        if python3 -c "import yaml; yaml.safe_load(open('$config_file'))" 2>/dev/null; then
            echo -e "${GREEN}PASS${NC}"
            log "✓ PASS: Config file valid"
            ((PASSED++))
        else
            echo -e "${RED}FAIL${NC} - Invalid config YAML"
            log "✗ FAIL: Invalid config YAML"
            ((FAILED++))
        fi
    else
        echo -e "${RED}FAIL${NC} - Config file missing"
        log "✗ FAIL: Config file missing"
        ((FAILED++))
    fi
}

# Test 8: Recent Tasks Limit
test_recent_tasks_limit() {
    echo -n "Test 8: Recent Tasks Limit... "
    log "Running Test 8: Recent Tasks Limit"

    local stats_file=".claude/memory/agents/backend-developer-stats.yaml"

    if [ ! -f "$stats_file" ]; then
        echo -e "${YELLOW}SKIP${NC} - Stats file not found"
        log "⊘ SKIP: Stats file not found"
        ((SKIPPED++))
        return
    fi

    count=$(grep -A 20 "recent_tasks:" "$stats_file" | grep "  - id:" | wc -l | tr -d ' ')
    limit=$(grep "recent_tasks_limit:" .claude/memory/config.yaml | awk '{print $2}')

    if [ -z "$count" ]; then
        count=0
    fi

    if [ "$count" -le "$limit" ]; then
        echo -e "${GREEN}PASS${NC} ($count <= $limit)"
        log "✓ PASS: Recent tasks within limit ($count <= $limit)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - Recent tasks: $count, Limit: $limit"
        log "✗ FAIL: Recent tasks exceed limit ($count > $limit)"
        ((FAILED++))
    fi
}

# Test 9: Directory Structure
test_directory_structure() {
    echo -n "Test 9: Directory Structure... "
    log "Running Test 9: Directory Structure"

    local required_dirs=(
        ".claude/memory"
        ".claude/memory/tasks"
        ".claude/memory/agents"
        ".claude/memory-backup"
    )

    local missing=0
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log "Missing directory: $dir"
            ((missing++))
        fi
    done

    if [ $missing -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All required directories exist"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $missing directories missing"
        log "✗ FAIL: $missing required directories missing"
        ((FAILED++))
    fi
}

# Test 10: File Permissions
test_file_permissions() {
    echo -n "Test 10: File Permissions... "
    log "Running Test 10: File Permissions"

    local bad_perms=0

    # Check YAML files are readable
    for file in .claude/memory/**/*.yaml; do
        if [ -f "$file" ] && [ ! -r "$file" ]; then
            log "File not readable: $file"
            ((bad_perms++))
        fi
    done

    # Check directories are writable
    if [ ! -w ".claude/memory/tasks" ] || [ ! -w ".claude/memory/agents" ]; then
        log "Memory directories not writable"
        ((bad_perms++))
    fi

    if [ $bad_perms -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: File permissions correct"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $bad_perms permission issues"
        log "✗ FAIL: $bad_perms permission issues found"
        ((FAILED++))
    fi
}

# Test 11: Agent Count
test_agent_count() {
    echo -n "Test 11: Agent Count... "
    log "Running Test 11: Agent Count"

    local agent_count=$(ls -1 .claude/memory/agents/*-stats.yaml 2>/dev/null | wc -l | tr -d ' ')

    if [ "$agent_count" -gt 0 ]; then
        echo -e "${GREEN}PASS${NC} ($agent_count agents)"
        log "✓ PASS: $agent_count agent stats files found"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIP${NC} - No agent stats yet"
        log "⊘ SKIP: No agent stats files found"
        ((SKIPPED++))
    fi
}

# Test 12: Task Count
test_task_count() {
    echo -n "Test 12: Task Count... "
    log "Running Test 12: Task Count"

    local task_count=$(ls -1 .claude/memory/tasks/*.yaml 2>/dev/null | wc -l | tr -d ' ')

    if [ "$task_count" -gt 0 ]; then
        echo -e "${GREEN}PASS${NC} ($task_count tasks)"
        log "✓ PASS: $task_count task records found"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIP${NC} - No tasks yet"
        log "⊘ SKIP: No task records found"
        ((SKIPPED++))
    fi
}

# Test 13: Quality Score Range
test_quality_score_range() {
    echo -n "Test 13: Quality Score Range... "
    log "Running Test 13: Quality Score Range"

    local invalid_scores=0

    for file in .claude/memory/tasks/*.yaml; do
        if [ -f "$file" ]; then
            score=$(grep "^quality_score:" "$file" | awk '{print $2}')
            if [ -n "$score" ]; then
                if [ "$score" -lt 0 ] || [ "$score" -gt 100 ]; then
                    log "Invalid quality score in $file: $score"
                    ((invalid_scores++))
                fi
            fi
        fi
    done

    if [ $invalid_scores -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All quality scores within range (0-100)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $invalid_scores invalid scores"
        log "✗ FAIL: $invalid_scores quality scores out of range"
        ((FAILED++))
    fi
}

# Test 14: Success Rate Range
test_success_rate_range() {
    echo -n "Test 14: Success Rate Range... "
    log "Running Test 14: Success Rate Range"

    local invalid_rates=0

    for file in .claude/memory/agents/*-stats.yaml; do
        if [ -f "$file" ]; then
            rate=$(grep "^success_rate:" "$file" | awk '{print $2}')
            if [ -n "$rate" ]; then
                # Check if rate is between 0.0 and 1.0
                if (( $(echo "$rate < 0.0 || $rate > 1.0" | bc -l) )); then
                    log "Invalid success rate in $file: $rate"
                    ((invalid_rates++))
                fi
            fi
        fi
    done

    if [ $invalid_rates -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All success rates within range (0.0-1.0)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $invalid_rates invalid rates"
        log "✗ FAIL: $invalid_rates success rates out of range"
        ((FAILED++))
    fi
}

# Test 15: Timestamp Format
test_timestamp_format() {
    echo -n "Test 15: Timestamp Format... "
    log "Running Test 15: Timestamp Format"

    local invalid_timestamps=0

    for file in .claude/memory/tasks/*.yaml; do
        if [ -f "$file" ]; then
            timestamp=$(grep "^timestamp:" "$file" | cut -d: -f2- | tr -d ' "')
            if [ -n "$timestamp" ]; then
                # Basic ISO 8601 format check (YYYY-MM-DDTHH:MM:SSZ)
                if ! echo "$timestamp" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'; then
                    log "Invalid timestamp format in $file: $timestamp"
                    ((invalid_timestamps++))
                fi
            fi
        fi
    done

    if [ $invalid_timestamps -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        log "✓ PASS: All timestamps in ISO 8601 format"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} - $invalid_timestamps invalid timestamps"
        log "✗ FAIL: $invalid_timestamps timestamps in wrong format"
        ((FAILED++))
    fi
}

# Run all tests
echo "Running integration tests..."
echo ""

test_directory_structure
test_memory_read
test_yaml_validity
test_config_validation
test_agent_stats_calculation
test_task_record_format
test_performance_read
test_backup_directory
test_recent_tasks_limit
test_file_permissions
test_agent_count
test_task_count
test_quality_score_range
test_success_rate_range
test_timestamp_format

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log "Test Summary: Passed: $PASSED, Failed: $FAILED, Skipped: $SKIPPED"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    log "✅ All tests passed!"
    echo ""
    echo "Log file: $LOG_FILE"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    log "❌ Some tests failed"
    echo ""
    echo "Log file: $LOG_FILE"
    echo "Review the log for details."
    exit 1
fi
