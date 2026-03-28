# AIT42 Memory System Scripts

TypeScript scripts for managing the AIT42 memory system.

## Overview

This directory contains TypeScript utilities for recording task executions and updating agent performance statistics in the AIT42 memory system.

## Files

- **types.ts** - Type definitions for TaskRecord, AgentStats, etc.
- **utils.ts** - Utility functions (file locking, YAML I/O, atomic writes)
- **record-task.ts** - CLI script to record task execution
- **update-agent-stats.ts** - CLI script to update agent statistics

## Installation

```bash
# Install dependencies
npm install

# Dependencies:
# - tsx: TypeScript execution
# - commander: CLI argument parsing
# - js-yaml: YAML parsing/serialization
# - proper-lockfile: File locking for concurrent access
```

## Usage

### Record Task Execution

```bash
npm run memory:record-task -- \
  --description "Implement user authentication API" \
  --agents backend-developer api-developer \
  --success true \
  --quality-score 95 \
  --task-type implementation \
  --duration-ms 12500 \
  --tags security api authentication
```

**Required Options:**
- `--description <string>` - Task description
- `--agents <agents...>` - Selected agents (space-separated)
- `--success <boolean>` - Task success flag (true/false)
- `--quality-score <number>` - Quality score (0-100)

**Optional Options:**
- `--task-type <string>` - Task type (default: "implementation")
- `--duration-ms <number>` - Duration in milliseconds (default: 0)
- `--errors <errors...>` - Error messages
- `--warnings <warnings...>` - Warning messages
- `--tags <tags...>` - Tags for categorization

**Output Contract:**

Exit codes:
- `0`: Success
- `1`: Error (with error message on stderr)

Stdout format (machine-readable):
```
TASK_ID: 2025-11-13-042
✅ Task recorded successfully
```

Files created:
- `.claude/memory/tasks/YYYY-MM-DD-NNN-description.yaml`

Task ID format: `YYYY-MM-DD-NNN` (e.g., `2025-11-13-042`)

### Update Agent Statistics

```bash
npm run memory:update-stats -- \
  --agent backend-developer \
  --quality-score 95 \
  --success true \
  --task-id 2025-11-13-042 \
  --task-type implementation \
  --duration-ms 12500
```

**Required Options:**
- `--agent <string>` - Agent name
- `--quality-score <number>` - Quality score (0-100)
- `--success <boolean>` - Task success flag (true/false)

**Optional Options:**
- `--task-id <string>` - Task ID (default: "unknown")
- `--task-type <string>` - Task type (default: "implementation")
- `--duration-ms <number>` - Duration in milliseconds (default: 0)

**Output Contract:**

Exit codes:
- `0`: Success
- `1`: Error (with error message on stderr)

Stdout format (machine-readable):
```
✅ Stats updated successfully for: backend-developer
   Total tasks: 43
   Success rate: 95.3%
   Avg quality: 92.7
```

Files modified:
- `.claude/memory/agents/{agent}-stats.yaml` (updated with rolling averages)
- `.claude/memory/agents/{agent}-stats.yaml.bak` (backup of previous version)

Statistics updated:
- Rolling averages for quality score and duration
- Success rate (successful_tasks / total_tasks)
- Recent tasks list (last 10 tasks)
- Specializations (task type counts)
- Trends (delta from previous values)

## Features

### Concurrency Safety

All file operations use `proper-lockfile` to prevent race conditions:
- **Read Lock**: Shared lock for reading YAML files
- **Write Lock**: Exclusive lock for writing YAML files
- **Retry Logic**: Automatic retry with exponential backoff

### Atomic Writes

File writes are atomic to prevent corruption:
1. Write to temporary file (`.tmp.{timestamp}`)
2. Atomic rename to target file
3. Cleanup on error

### Statistics Calculation

**Rolling Average** (fixed bug in v1.0.0):
```typescript
newAvg = ((oldAvg * oldCount) + newValue) / (oldCount + 1)
```

**Success Rate**:
```typescript
successRate = successfulTasks / totalTasks
```

**Trends** (simple delta from previous):
```typescript
trend = currentValue - previousValue
```

## Data Structure

### TaskRecord (tasks/YYYY-MM-DD-NNN-description.yaml)

```yaml
id: 2025-11-13-042
timestamp: 2025-11-13T07:45:23.123Z
request: Implement user authentication API
task_type: implementation
selected_agents:
  - backend-developer
  - api-developer
duration_ms: 12500
success: true
quality_score: 95
errors: []
warnings: []
tags:
  - security
  - api
  - authentication
```

### AgentStats (agents/{agent}-stats.yaml)

```yaml
agent_name: backend-developer
total_tasks: 42
successful_tasks: 40
failed_tasks: 2
success_rate: 0.952
avg_quality_score: 92.5
avg_duration_ms: 10234
last_updated: 2025-11-13T07:45:23.456Z
recent_tasks:
  - task_id: 2025-11-13-042
    quality_score: 95
    success: true
    timestamp: 2025-11-13T07:45:23.123Z
trends:
  success_rate_trend: 0.024
  quality_score_trend: 2.5
  avg_duration_trend: -1234
specializations:
  implementation: 30
  bug-fix: 8
  refactoring: 4
```

## Error Handling

All scripts handle errors gracefully:
- **Exit Code 1**: Error occurred (e.g., file not found, lock timeout)
- **Exit Code 0**: Success
- **Console Output**: Detailed error messages with stack traces

Example error:
```
❌ Failed to update stats: Error: ENOENT: no such file or directory
```

## Output Contracts (For Coordinator Integration)

This section specifies the exact output format that the Coordinator (`.claude/agents/00-ait42-coordinator.md`) can rely on when invoking these scripts.

### record-task.ts Output Contract

**Exit Codes:**
- `0`: Task recorded successfully
- `1`: Error occurred (check stderr for details)

**Stdout Format:**
```
TASK_ID: YYYY-MM-DD-NNN
✅ Task recorded successfully
```

**Parsing Example (for Coordinator):**
```bash
TASK_OUTPUT=$(npx tsx .claude/memory/scripts/record-task.ts [...args] 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  TASK_ID=$(echo "$TASK_OUTPUT" | grep "^TASK_ID:" | awk '{print $2}')
  echo "✅ Task recorded successfully (ID: ${TASK_ID})"
else
  echo "❌ Failed to record task"
  echo "$TASK_OUTPUT"
fi
```

**Machine-Readable Line Format:**
- Line 1: `TASK_ID: <id>` (always first line on success)
- Line 2+: Human-readable success message

**Stderr (on error):**
```
Error: <error-type>: <error-message>
    at <stack-trace>
```

**Files Created:**
- `.claude/memory/tasks/YYYY-MM-DD-NNN-description.yaml`

### update-agent-stats.ts Output Contract

**Exit Codes:**
- `0`: Stats updated successfully
- `1`: Error occurred (check stderr for details)

**Stdout Format:**
```
✅ Stats updated successfully for: <agent-name>
   Total tasks: <number>
   Success rate: <percentage>%
   Avg quality: <number>
```

**Parsing Example (for Coordinator):**
```bash
STATS_OUTPUT=$(npx tsx .claude/memory/scripts/update-agent-stats.ts [...args] 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Agent stats updated"
else
  echo "❌ Failed to update stats"
  echo "$STATS_OUTPUT"
fi
```

**Machine-Readable Values (extractable):**
```bash
# Extract total tasks
TOTAL=$(echo "$STATS_OUTPUT" | grep "Total tasks:" | awk '{print $3}')

# Extract success rate
SUCCESS_RATE=$(echo "$STATS_OUTPUT" | grep "Success rate:" | awk '{print $3}' | tr -d '%')

# Extract avg quality
AVG_QUALITY=$(echo "$STATS_OUTPUT" | grep "Avg quality:" | awk '{print $3}')
```

**Stderr (on error):**
```
Error: <error-type>: <error-message>
    at <stack-trace>
```

**Files Modified:**
- `.claude/memory/agents/{agent}-stats.yaml` (updated)
- `.claude/memory/agents/{agent}-stats.yaml.bak` (backup)

### Common Error Patterns

**ENOENT (File Not Found):**
```
Exit Code: 1
Stderr: Error: ENOENT: no such file or directory, open '.claude/memory/agents/new-agent-stats.yaml'
```
**Note**: Fixed in v1.0.0 (auto-creates files)

**Lock Timeout:**
```
Exit Code: 1
Stderr: Error: Lock file is already being held
```
**Cause**: Another process is holding the lock
**Solution**: Retry after 1-2 seconds

**Invalid Arguments:**
```
Exit Code: 1
Stderr: error: required option '--agents <agents...>' not specified
```
**Cause**: Missing required CLI arguments

**YAML Parse Error:**
```
Exit Code: 1
Stderr: Error: bad indentation of a mapping entry (line X, column Y)
```
**Cause**: Corrupted YAML file (should be prevented by atomic writes)

### Integration Best Practices

1. **Always check exit codes** before parsing output
2. **Capture both stdout and stderr** for debugging (`2>&1`)
3. **Extract TASK_ID** from machine-readable line (not filename)
4. **Implement retry logic** for lock timeouts (max 3 retries)
5. **Log full output** on error for troubleshooting
6. **Don't parse human-readable lines** (may change format)
7. **Use machine-readable prefixes** (`TASK_ID:`, etc.)

### Example: Complete Integration in Coordinator

```bash
# Step 7.1: Record Task
TASK_OUTPUT=$(npx tsx .claude/memory/scripts/record-task.ts \
  --description "${TASK_DESCRIPTION}" \
  --agents ${SELECTED_AGENTS[@]} \
  --success ${SUCCESS_FLAG} \
  --quality-score ${QUALITY_SCORE} \
  --task-type "${TASK_TYPE}" \
  --duration-ms ${DURATION_MS} 2>&1)

if [ $? -eq 0 ]; then
  # Extract task ID from machine-readable output
  TASK_ID=$(echo "$TASK_OUTPUT" | grep "^TASK_ID:" | awk '{print $2}')
  echo "✅ Task recorded successfully (ID: ${TASK_ID})"

  # Step 7.2: Update Agent Stats
  for agent in "${SELECTED_AGENTS[@]}"; do
    npx tsx .claude/memory/scripts/update-agent-stats.ts \
      --agent "${agent}" \
      --quality-score ${QUALITY_SCORE} \
      --success ${SUCCESS_FLAG} \
      --task-id "${TASK_ID}" \
      --task-type "${TASK_TYPE}" \
      --duration-ms ${DURATION_MS} 2>&1

    if [ $? -ne 0 ]; then
      echo "⚠️  Warning: Failed to update stats for ${agent}"
    fi
  done
else
  echo "❌ Failed to record task"
  echo "$TASK_OUTPUT"
fi
```

## Maintenance

### Backup Files

Backup files are created automatically:
- Location: `{original-file}.bak`
- Created before every write operation
- Manual cleanup required (not auto-deleted)

### Cleanup Old Tasks

Retention policy (from `.claude/memory/config.yaml`):
```yaml
retention:
  max_tasks: 1000
  max_age_days: 90
```

Cleanup script (TODO):
```bash
npm run memory:cleanup
```

## Development

### Type Safety

All scripts use TypeScript strict mode:
- `strict: true`
- `forceConsistentCasingInFileNames: true`
- `skipLibCheck: true`

### Testing

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Test record-task script
npm run memory:record-task -- \
  --description "Test task" \
  --agents test-agent \
  --success true \
  --quality-score 100

# Test update-stats script
npm run memory:update-stats -- \
  --agent test-agent \
  --quality-score 100 \
  --success true
```

## Troubleshooting

### Lock Timeout

If you see lock timeout errors:
```
Error: Lock file is already being held
```

**Solution**:
1. Check for stale lock files: `find .claude/memory -name "*.lock"`
2. Remove stale locks (if process is not running): `rm .claude/memory/**/*.lock`
3. Increase retry attempts in `utils.ts`

### File Permissions

If you see permission errors:
```
Error: EACCES: permission denied
```

**Solution**:
```bash
chmod -R 755 /home/user/AIT42/.claude/memory
```

### Missing Dependencies

If you see module not found errors:
```
Error: Cannot find module 'commander'
```

**Solution**:
```bash
npm install
```

## Version History

- **v1.0.0** (2025-11-13)
  - Initial implementation
  - Task recording script
  - Agent statistics update script
  - File locking with proper-lockfile
  - Atomic writes
  - Rolling average calculation (fixed bug)

## References

- [AIT42 Memory System](../README.md)
- [CLAUDE.md](/home/user/AIT42/CLAUDE.md) - Project documentation
- [Memory System Architecture](./.claude/memory/README.md)

## License

MIT License - See [LICENSE](/home/user/AIT42/LICENSE)
