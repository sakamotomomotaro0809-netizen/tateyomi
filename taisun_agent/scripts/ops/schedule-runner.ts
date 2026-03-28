#!/usr/bin/env node
/* istanbul ignore file */
/**
 * Schedule Runner CLI - P18
 *
 * CLI for running scheduled ops jobs
 *
 * Usage:
 *   npx ts-node scripts/ops/schedule-runner.ts           # Run once
 *   npx ts-node scripts/ops/schedule-runner.ts --loop    # Run loop
 *   npx ts-node scripts/ops/schedule-runner.ts --status  # Show status
 */

import { runOnce, runLoop, loadScheduleConfig, ScheduleStateManager } from '../../src/proxy-mcp/ops/schedule';
import * as path from 'path';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Schedule Runner CLI - P18

Usage:
  schedule-runner.ts              Run once and exit
  schedule-runner.ts --loop       Run continuous loop
  schedule-runner.ts --status     Show current status
  schedule-runner.ts --help       Show this help

Options:
  --interval <ms>    Loop interval in milliseconds (default: 60000)
`);
    process.exit(0);
  }

  const config = loadScheduleConfig();

  if (!config) {
    console.error('Error: Config not found at config/proxy-mcp/ops-schedule.json');
    process.exit(1);
  }

  if (args.includes('--status')) {
    const stateManager = new ScheduleStateManager(
      path.join(process.cwd(), config.stateDir)
    );

    console.log('Schedule Status:');
    console.log('================');
    console.log(`Global enabled: ${config.enabled}`);
    console.log(`Timezone: ${config.timezone}`);
    console.log(`Dashboard Issue: ${config.dashboardIssue || 'Not configured'}`);
    console.log('');
    console.log('Jobs:');

    for (const [jobName, jobConfig] of Object.entries(config.jobs)) {
      const state = stateManager.getJobState(jobName as keyof typeof config.jobs);
      console.log(`  ${jobName}:`);
      console.log(`    Enabled: ${jobConfig.enabled}`);
      console.log(`    Cadence: ${jobConfig.cadence}`);
      console.log(`    At: ${jobConfig.at}${jobConfig.dow ? ` (${jobConfig.dow})` : ''}`);
      console.log(`    Last run: ${state.lastRunAt || 'Never'}`);
      console.log(`    Last status: ${state.lastStatus || 'N/A'}`);
      console.log(`    Run count: ${state.runCount}`);
      if (state.lastError) {
        console.log(`    Last error: ${state.lastError}`);
      }
    }
    process.exit(0);
  }

  if (args.includes('--loop')) {
    const intervalIndex = args.indexOf('--interval');
    const interval =
      intervalIndex !== -1 ? parseInt(args[intervalIndex + 1], 10) : 60000;

    console.log(`Starting schedule runner loop (interval: ${interval}ms)`);

    // Handle graceful shutdown
    const controller = new AbortController();

    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, stopping...');
      controller.abort();
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, stopping...');
      controller.abort();
    });

    await runLoop(interval, controller.signal);
  } else {
    // Run once
    console.log('Running schedule check...');
    const result = await runOnce();

    console.log('Result:');
    console.log(`  Ran: ${result.ran.length} jobs`);
    for (const job of result.ran) {
      console.log(`    - ${job.jobName}: ${job.summary}`);
    }
    console.log(`  Skipped: ${result.skipped.length} jobs`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      for (const err of result.errors) {
        console.log(`    - ${err.jobName}: ${err.error}`);
      }
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
