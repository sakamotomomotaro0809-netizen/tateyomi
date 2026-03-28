/**
 * Schedule Runner Types - P18
 *
 * Type definitions for scheduled ops jobs
 */

export type JobCadence = 'daily' | 'weekly';
export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface JobConfig {
  enabled: boolean;
  cadence: JobCadence;
  at: string; // HH:MM format
  dow?: DayOfWeek; // Only for weekly jobs
  postToIssue?: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  timezone: string;
  stateDir: string;
  dashboardIssue?: number | null;
  jobs: {
    daily_observability_report: JobConfig;
    weekly_observability_report: JobConfig;
    weekly_improvement_digest: JobConfig;
  };
  redaction: {
    patterns: string[];
    placeholder: string;
  };
}

export type JobName = keyof ScheduleConfig['jobs'];

export interface JobState {
  jobName: JobName;
  lastRunAt: string | null;
  lastStatus: 'ok' | 'fail' | 'skipped' | null;
  lastError?: string;
  consecutiveFailures: number;
  runCount: number;
}

export interface ScheduleState {
  version: 1;
  updatedAt: string;
  jobs: Record<JobName, JobState>;
}

export interface JobResult {
  jobName: JobName;
  success: boolean;
  /** Indicates job was skipped due to optional dependency unavailability */
  skipped?: boolean;
  refId?: string;
  summary?: string;
  error?: string;
  durationMs: number;
  postedToIssue?: boolean;
}

export interface RunOnceResult {
  ran: JobResult[];
  skipped: JobName[];
  errors: Array<{ jobName: JobName; error: string }>;
}

export const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const JOB_NAMES: JobName[] = [
  'daily_observability_report',
  'weekly_observability_report',
  'weekly_improvement_digest',
];
