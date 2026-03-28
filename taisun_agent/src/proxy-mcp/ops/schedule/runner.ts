/**
 * Schedule Runner - P18
 *
 * Executes scheduled ops jobs (daily/weekly reports, digest)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ScheduleConfig,
  JobConfig,
  JobName,
  JobResult,
  RunOnceResult,
  DAY_OF_WEEK_MAP,
  JOB_NAMES,
} from './types';
import { ScheduleStateManager } from './state';
import {
  generateReport,
  formatReportMarkdown,
  getLast24hPeriod,
  getLast7dPeriod,
  postReportToIssue,
} from '../../observability';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'proxy-mcp', 'ops-schedule.json');

/**
 * Load schedule configuration
 *
 * Environment variable overrides:
 * - OPS_SCHEDULE_ENABLED=true: Override global enabled flag
 */
export function loadScheduleConfig(): ScheduleConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content) as ScheduleConfig;

    // Environment variable override for enabled flag
    if (process.env.OPS_SCHEDULE_ENABLED === 'true') {
      config.enabled = true;
    }

    return config;
  } catch (error) {
    console.error('[schedule-runner] Failed to load config:', error);
    return null;
  }
}

/**
 * Check if current time matches job schedule
 */
export function shouldRunJob(
  jobConfig: JobConfig,
  now: Date,
  _timezone: string
): boolean {
  if (!jobConfig.enabled) {
    return false;
  }

  // Parse scheduled time
  const [scheduledHour, scheduledMinute] = jobConfig.at.split(':').map(Number);

  // Get current time in timezone (simplified - uses offset)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check time match (within 1-minute window)
  const timeMatches =
    currentHour === scheduledHour && currentMinute === scheduledMinute;

  if (!timeMatches) {
    return false;
  }

  // For daily jobs, time match is sufficient
  if (jobConfig.cadence === 'daily') {
    return true;
  }

  // For weekly jobs, also check day of week
  if (jobConfig.cadence === 'weekly' && jobConfig.dow) {
    const currentDow = now.getDay();
    const scheduledDow = DAY_OF_WEEK_MAP[jobConfig.dow];
    return currentDow === scheduledDow;
  }

  return false;
}

/**
 * Apply redaction to content
 */
export function redactContent(
  content: string,
  patterns: string[],
  placeholder: string
): string {
  let redacted = content;

  // Built-in patterns for common secrets
  const builtInPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{36,}\b/g, // GitHub tokens
    /\bsk-[A-Za-z0-9]{48}\b/g, // OpenAI keys
    /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack tokens
    /\b[A-Za-z0-9]{32,}\b/g, // Generic long tokens (32+ chars)
  ];

  // Apply built-in patterns
  for (const pattern of builtInPatterns) {
    redacted = redacted.replace(pattern, placeholder);
  }

  // Apply custom patterns
  for (const patternStr of patterns) {
    try {
      const pattern = new RegExp(patternStr, 'g');
      redacted = redacted.replace(pattern, placeholder);
    } catch {
      // Skip invalid patterns
    }
  }

  return redacted;
}

/**
 * Execute a single job
 */
export async function executeJob(
  jobName: JobName,
  config: ScheduleConfig
): Promise<JobResult> {
  const startTime = Date.now();

  try {
    switch (jobName) {
      case 'daily_observability_report': {
        const period = getLast24hPeriod();
        const data = generateReport(period);
        let markdown = formatReportMarkdown(data);

        // Apply redaction
        markdown = redactContent(
          markdown,
          config.redaction.patterns,
          config.redaction.placeholder
        );

        const jobConfig = config.jobs[jobName];
        let postedToIssue = false;

        if (jobConfig.postToIssue && config.dashboardIssue) {
          const postResult = await postReportToIssue(data, markdown);
          postedToIssue = postResult.success;
        }

        return {
          jobName,
          success: true,
          summary: `Daily report: ${data.totalEvents} events, ${(data.successRate * 100).toFixed(1)}% success`,
          durationMs: Date.now() - startTime,
          postedToIssue,
        };
      }

      case 'weekly_observability_report': {
        const period = getLast7dPeriod();
        const data = generateReport(period);
        let markdown = formatReportMarkdown(data);

        // Apply redaction
        markdown = redactContent(
          markdown,
          config.redaction.patterns,
          config.redaction.placeholder
        );

        const jobConfig = config.jobs[jobName];
        let postedToIssue = false;

        if (jobConfig.postToIssue && config.dashboardIssue) {
          const postResult = await postReportToIssue(data, markdown);
          postedToIssue = postResult.success;
        }

        return {
          jobName,
          success: true,
          summary: `Weekly report: ${data.totalEvents} events, ${(data.successRate * 100).toFixed(1)}% success`,
          durationMs: Date.now() - startTime,
          postedToIssue,
        };
      }

      case 'weekly_improvement_digest': {
        // Check if digest module is available (P17)
        try {
          // Dynamic import to avoid hard dependency on P17
          const digestPath = path.join(
            process.cwd(),
            'dist',
            'src',
            'proxy-mcp',
            'ops',
            'digest',
            'index.js'
          );

          if (!fs.existsSync(digestPath)) {
            return {
              jobName,
              success: true,
              summary: 'Digest module not available (P17 not installed)',
              durationMs: Date.now() - startTime,
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const digest = require(digestPath);
          if (typeof digest.generateWeeklyDigest === 'function') {
            const result = await digest.generateWeeklyDigest();

            const jobConfig = config.jobs[jobName];
            let postedToIssue = false;

            if (
              jobConfig.postToIssue &&
              config.dashboardIssue &&
              typeof digest.postDigestToIssue === 'function'
            ) {
              const postResult = await digest.postDigestToIssue(
                result,
                config.dashboardIssue
              );
              postedToIssue = postResult?.success ?? false;
            }

            return {
              jobName,
              success: true,
              summary: `Weekly digest generated`,
              durationMs: Date.now() - startTime,
              postedToIssue,
            };
          }

          return {
            jobName,
            success: true,
            summary: 'Digest function not found (P17 incomplete)',
            durationMs: Date.now() - startTime,
          };
        } catch (error) {
          // P17 digest module error - report as skipped, not failed
          console.warn('[schedule-runner] Digest module error:', error);
          return {
            jobName,
            success: false,
            skipped: true, // Distinguish from hard failure
            summary: 'Digest module not available (optional dependency)',
            durationMs: Date.now() - startTime,
          };
        }
      }

      default:
        return {
          jobName,
          success: false,
          error: `Unknown job: ${jobName}`,
          durationMs: Date.now() - startTime,
        };
    }
  } catch (error) {
    return {
      jobName,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Run once: check and execute all due jobs
 */
export async function runOnce(now: Date = new Date()): Promise<RunOnceResult> {
  const config = loadScheduleConfig();

  if (!config) {
    return {
      ran: [],
      skipped: [...JOB_NAMES],
      errors: [{ jobName: 'daily_observability_report', error: 'Config not found' }],
    };
  }

  if (!config.enabled) {
    return {
      ran: [],
      skipped: [...JOB_NAMES],
      errors: [],
    };
  }

  const stateManager = new ScheduleStateManager(
    path.join(process.cwd(), config.stateDir)
  );

  const result: RunOnceResult = {
    ran: [],
    skipped: [],
    errors: [],
  };

  for (const jobName of JOB_NAMES) {
    const jobConfig = config.jobs[jobName];

    if (!jobConfig.enabled) {
      result.skipped.push(jobName);
      continue;
    }

    // Check if already run in current period
    if (stateManager.wasRunInCurrentPeriod(jobName, jobConfig.cadence, now)) {
      result.skipped.push(jobName);
      continue;
    }

    // Check if time matches
    if (!shouldRunJob(jobConfig, now, config.timezone)) {
      result.skipped.push(jobName);
      continue;
    }

    // Execute job
    console.log(`[schedule-runner] Executing job: ${jobName}`);
    const jobResult = await executeJob(jobName, config);

    if (jobResult.success) {
      stateManager.recordSuccess(jobName);
      result.ran.push(jobResult);
    } else {
      stateManager.recordFailure(jobName, jobResult.error || 'Unknown error');
      result.errors.push({ jobName, error: jobResult.error || 'Unknown error' });
    }
  }

  return result;
}

/**
 * Run loop: continuously check for due jobs
 */
export async function runLoop(
  intervalMs: number = 60000,
  signal?: AbortSignal
): Promise<void> {
  console.log('[schedule-runner] Starting loop...');

  const runCycle = async () => {
    const now = new Date();
    console.log(`[schedule-runner] Checking jobs at ${now.toISOString()}`);
    const result = await runOnce(now);

    if (result.ran.length > 0) {
      console.log(`[schedule-runner] Ran ${result.ran.length} jobs:`, result.ran.map((r) => r.jobName));
    }
    if (result.errors.length > 0) {
      console.error('[schedule-runner] Errors:', result.errors);
    }
  };

  // Initial run
  await runCycle();

  // Set up interval
  const interval = setInterval(async () => {
    if (signal?.aborted) {
      clearInterval(interval);
      console.log('[schedule-runner] Loop stopped (aborted)');
      return;
    }
    await runCycle();
  }, intervalMs);

  // Handle abort signal
  if (signal) {
    signal.addEventListener('abort', () => {
      clearInterval(interval);
      console.log('[schedule-runner] Loop stopped (signal)');
    });
  }
}
