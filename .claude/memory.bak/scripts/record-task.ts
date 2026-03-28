#!/usr/bin/env tsx

/**
 * AIT42 Task Recording Script
 * Records task execution to memory system
 */

import { Command } from 'commander';
import * as path from 'path';
import { TaskRecord } from './types';
import {
  writeYAMLWithLock,
  generateTaskId,
  getNextTaskSequence,
  sanitizeForFilename
} from './utils';

const program = new Command();

program
  .name('record-task')
  .description('Record task execution to AIT42 memory')
  .requiredOption('--description <string>', 'Task description')
  .requiredOption('--agents <agents...>', 'Selected agents (space-separated)')
  .requiredOption('--success <boolean>', 'Task success flag')
  .requiredOption('--quality-score <number>', 'Quality score (0-100)')
  .option('--task-type <string>', 'Task type', 'implementation')
  .option('--duration-ms <number>', 'Duration in milliseconds', '0')
  .option('--errors <errors...>', 'Error messages', [])
  .option('--warnings <warnings...>', 'Warning messages', [])
  .option('--tags <tags...>', 'Tags', [])
  // AIT42 v2.0.0: AutoPatch incident options
  .option('--incident-error-log <string>', 'Error log for incident')
  .option('--incident-error-code <string>', 'Error code')
  .option('--incident-root-cause <string>', 'Root cause analysis')
  .option('--incident-patch-files <files...>', 'Files modified by patch', [])
  .option('--incident-patch-diff <string>', 'Git diff of patch')
  .option('--incident-patch-success <boolean>', 'Patch success flag', 'false')
  .parse(process.argv);

const options = program.opts();

async function recordTask() {
  console.log('🧠 Recording task to memory system...');

  // Use process.cwd() as project root (should be run from AIT42 root)
  const projectRoot = process.cwd();
  const tasksDir = path.join(projectRoot, '.claude/memory/tasks');

  // Generate task ID
  const sequence = getNextTaskSequence(tasksDir);
  const taskId = generateTaskId(sequence);
  const sanitizedDesc = sanitizeForFilename(options.description);
  const fileName = `${taskId}-${sanitizedDesc}.yaml`;
  const filePath = path.join(tasksDir, fileName);

  // Build task record
  const taskRecord: TaskRecord = {
    id: taskId,
    timestamp: new Date().toISOString(),
    request: options.description,
    task_type: options.taskType,
    selected_agents: options.agents,
    duration_ms: parseInt(options.durationMs, 10),
    success: options.success === 'true',
    quality_score: parseFloat(options.qualityScore),
    errors: options.errors,
    warnings: options.warnings,
    tags: options.tags,
  };

  // AIT42 v2.0.0: Add incident data if provided
  if (options.incidentErrorLog) {
    taskRecord.incident = {
      error_log: options.incidentErrorLog,
      error_code: options.incidentErrorCode,
      root_cause: options.incidentRootCause,
    };

    if (options.incidentPatchDiff) {
      taskRecord.incident.applied_patch = {
        files_modified: options.incidentPatchFiles || [],
        diff: options.incidentPatchDiff,
        success: options.incidentPatchSuccess === 'true',
      };
    }
  }

  // Write to file
  try {
    await writeYAMLWithLock(filePath, taskRecord);
    console.log(`✅ Task recorded: ${fileName}`);
    console.log(`   ID: ${taskId}`);
    console.log(`TASK_ID: ${taskId}`);  // ✅ Machine-readable output for coordinator
    console.log(`   Agents: ${options.agents.join(', ')}`);
    console.log(`   Success: ${taskRecord.success}`);
    console.log(`   Quality: ${taskRecord.quality_score}/100`);
  } catch (error) {
    console.error(`❌ Failed to record task:`);
    console.error(error);
    process.exit(1);
  }
}

recordTask().catch(console.error);
