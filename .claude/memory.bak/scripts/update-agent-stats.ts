#!/usr/bin/env tsx

/**
 * AIT42 Agent Statistics Update Script
 * Updates agent performance statistics
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { AgentStats, RecentTask } from './types';
import {
  readYAMLWithLock,
  writeYAMLWithLock,
  createBackup,
  calculateRollingAverage
} from './utils';

const program = new Command();

program
  .name('update-agent-stats')
  .description('Update agent performance statistics')
  .requiredOption('--agent <string>', 'Agent name')
  .requiredOption('--quality-score <number>', 'Quality score (0-100)')
  .requiredOption('--success <boolean>', 'Task success flag')
  .option('--task-id <string>', 'Task ID', 'unknown')
  .option('--task-type <string>', 'Task type', 'implementation')
  .option('--duration-ms <number>', 'Duration in milliseconds', '0')
  .parse(process.argv);

const options = program.opts();

async function updateAgentStats() {
  console.log(`📊 Updating stats for agent: ${options.agent}`);

  // Use process.cwd() as project root (should be run from AIT42 root)
  const projectRoot = process.cwd();
  const statsPath = path.join(
    projectRoot,
    `.claude/memory/agents/${options.agent}-stats.yaml`
  );

  // Create backup
  createBackup(statsPath);

  try {
    // Read existing stats
    let stats: AgentStats;

    if (!fs.existsSync(statsPath)) {
      // Initialize new agent stats
      console.log(`   Creating new stats file for ${options.agent}`);
      stats = {
        agent_name: options.agent,
        total_tasks: 0,
        successful_tasks: 0,
        failed_tasks: 0,
        success_rate: 0,
        avg_quality_score: 0,
        avg_duration_ms: 0,
        last_updated: new Date().toISOString(),
        recent_tasks: [],
        trends: {
          success_rate_trend: 0,
          quality_score_trend: 0,
          avg_duration_trend: 0
        },
        specializations: {}
      };
    } else {
      stats = await readYAMLWithLock<AgentStats>(statsPath);
    }

    // Update counters
    const oldTotalTasks = stats.total_tasks;
    stats.total_tasks += 1;

    const success = options.success === 'true';
    if (success) {
      stats.successful_tasks += 1;
    } else {
      stats.failed_tasks += 1;
    }

    // Recalculate metrics
    stats.success_rate = stats.successful_tasks / stats.total_tasks;

    const qualityScore = parseFloat(options.qualityScore);
    const durationMs = parseInt(options.durationMs, 10);

    // ✅ FIX: Save old values BEFORE updating (for trend calculation)
    const oldAvgQuality = stats.avg_quality_score;
    const oldAvgDuration = stats.avg_duration_ms;

    // Calculate rolling averages
    stats.avg_quality_score = calculateRollingAverage(
      stats.avg_quality_score,
      oldTotalTasks,
      qualityScore
    );

    stats.avg_duration_ms = calculateRollingAverage(
      stats.avg_duration_ms,
      oldTotalTasks,
      durationMs
    );

    // Update recent tasks (keep last 10)
    const recentTask: RecentTask = {
      task_id: options.taskId,
      quality_score: qualityScore,
      success: success,
      timestamp: new Date().toISOString()
    };

    stats.recent_tasks.unshift(recentTask);
    stats.recent_tasks = stats.recent_tasks.slice(0, 10);

    // Update specializations
    const taskType = options.taskType;
    if (!stats.specializations) {
      stats.specializations = {};
    }
    stats.specializations[taskType] = (stats.specializations[taskType] || 0) + 1;

    // Calculate trends (simple: compare with previous average)
    if (oldTotalTasks > 0) {
      const oldSuccessRate = (stats.successful_tasks - (success ? 1 : 0)) / oldTotalTasks;
      stats.trends.success_rate_trend = stats.success_rate - oldSuccessRate;

      // ✅ FIX: Use saved old values (not updated values)
      stats.trends.quality_score_trend = stats.avg_quality_score - oldAvgQuality;
      stats.trends.avg_duration_trend = stats.avg_duration_ms - oldAvgDuration;
    } else {
      // First task, no trends yet
      stats.trends.quality_score_trend = 0;
      stats.trends.success_rate_trend = 0;
      stats.trends.avg_duration_trend = 0;
    }

    // Update timestamp
    stats.last_updated = new Date().toISOString();

    // Write back
    await writeYAMLWithLock(statsPath, stats);

    console.log(`✅ Stats updated for ${options.agent}`);
    console.log(`   Total tasks: ${stats.total_tasks}`);
    console.log(`   Success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
    console.log(`   Avg quality: ${stats.avg_quality_score.toFixed(1)}/100`);
    console.log(`   Avg duration: ${stats.avg_duration_ms.toFixed(0)}ms`);
  } catch (error) {
    console.error(`❌ Failed to update stats: ${error}`);
    process.exit(1);
  }
}

updateAgentStats().catch(console.error);
