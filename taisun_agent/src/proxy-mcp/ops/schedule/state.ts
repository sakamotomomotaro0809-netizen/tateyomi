/**
 * Schedule State Manager - P18
 *
 * Persists job state to prevent duplicate executions after restarts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScheduleState, JobState, JobName, JOB_NAMES } from './types';

const STATE_FILE = 'schedule-state.json';

/**
 * Create initial state for a job
 */
function createInitialJobState(jobName: JobName): JobState {
  return {
    jobName,
    lastRunAt: null,
    lastStatus: null,
    consecutiveFailures: 0,
    runCount: 0,
  };
}

/**
 * Create initial schedule state
 */
function createInitialState(): ScheduleState {
  const jobs: Record<JobName, JobState> = {} as Record<JobName, JobState>;
  for (const jobName of JOB_NAMES) {
    jobs[jobName] = createInitialJobState(jobName);
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    jobs,
  };
}

/**
 * Schedule State Manager
 */
export class ScheduleStateManager {
  private stateDir: string;
  private statePath: string;
  private state: ScheduleState;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.statePath = path.join(stateDir, STATE_FILE);
    this.state = this.load();
  }

  /**
   * Load state from disk
   */
  private load(): ScheduleState {
    try {
      if (!fs.existsSync(this.statePath)) {
        return createInitialState();
      }

      const content = fs.readFileSync(this.statePath, 'utf-8');
      const state = JSON.parse(content) as ScheduleState;

      // Ensure all jobs exist in state (for schema evolution)
      for (const jobName of JOB_NAMES) {
        if (!state.jobs[jobName]) {
          state.jobs[jobName] = createInitialJobState(jobName);
        }
      }

      return state;
    } catch (error) {
      console.error('[schedule-state] Failed to load state, using initial:', error);
      return createInitialState();
    }
  }

  /**
   * Save state to disk
   */
  private save(): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.stateDir)) {
        fs.mkdirSync(this.stateDir, { recursive: true });
      }

      this.state.updatedAt = new Date().toISOString();
      const content = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(this.statePath, content, 'utf-8');
    } catch (error) {
      console.error('[schedule-state] Failed to save state:', error);
    }
  }

  /**
   * Get job state
   */
  getJobState(jobName: JobName): JobState {
    return this.state.jobs[jobName] || createInitialJobState(jobName);
  }

  /**
   * Get all job states
   */
  getAllJobStates(): Record<JobName, JobState> {
    return { ...this.state.jobs };
  }

  /**
   * Record successful job run
   */
  recordSuccess(jobName: JobName): void {
    const jobState = this.state.jobs[jobName] || createInitialJobState(jobName);
    jobState.lastRunAt = new Date().toISOString();
    jobState.lastStatus = 'ok';
    jobState.consecutiveFailures = 0;
    jobState.runCount++;
    delete jobState.lastError;
    this.state.jobs[jobName] = jobState;
    this.save();
  }

  /**
   * Record failed job run
   */
  recordFailure(jobName: JobName, error: string): void {
    const jobState = this.state.jobs[jobName] || createInitialJobState(jobName);
    jobState.lastRunAt = new Date().toISOString();
    jobState.lastStatus = 'fail';
    jobState.consecutiveFailures++;
    jobState.runCount++;
    jobState.lastError = error;
    this.state.jobs[jobName] = jobState;
    this.save();
  }

  /**
   * Record skipped job run
   */
  recordSkipped(jobName: JobName): void {
    const jobState = this.state.jobs[jobName] || createInitialJobState(jobName);
    jobState.lastStatus = 'skipped';
    // Don't update lastRunAt for skipped runs
    this.state.jobs[jobName] = jobState;
    this.save();
  }

  /**
   * Check if job was already run in the current period
   */
  wasRunInCurrentPeriod(jobName: JobName, cadence: 'daily' | 'weekly', now: Date): boolean {
    const jobState = this.state.jobs[jobName];
    if (!jobState?.lastRunAt || jobState.lastStatus !== 'ok') {
      return false;
    }

    const lastRun = new Date(jobState.lastRunAt);

    if (cadence === 'daily') {
      // Check if run today
      return (
        lastRun.getFullYear() === now.getFullYear() &&
        lastRun.getMonth() === now.getMonth() &&
        lastRun.getDate() === now.getDate()
      );
    } else {
      // Check if run this week (same ISO week)
      return isSameISOWeek(lastRun, now);
    }
  }

  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.state = createInitialState();
    this.save();
  }

  /**
   * Get state file path (for testing/debugging)
   */
  getStatePath(): string {
    return this.statePath;
  }
}

/**
 * Check if two dates are in the same ISO week
 */
function isSameISOWeek(date1: Date, date2: Date): boolean {
  const getISOWeek = (date: Date): { year: number; week: number } => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: d.getFullYear(), week };
  };

  const w1 = getISOWeek(date1);
  const w2 = getISOWeek(date2);
  return w1.year === w2.year && w1.week === w2.week;
}
