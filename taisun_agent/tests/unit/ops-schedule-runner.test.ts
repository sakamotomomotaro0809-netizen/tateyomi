/**
 * Schedule Runner Tests - P18
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadScheduleConfig,
  shouldRunJob,
  redactContent,
  executeJob,
  runOnce,
} from '../../src/proxy-mcp/ops/schedule/runner';
import { JobConfig, ScheduleConfig } from '../../src/proxy-mcp/ops/schedule/types';

// Mock the observability module
jest.mock('../../src/proxy-mcp/observability', () => ({
  generateReport: jest.fn().mockReturnValue({
    period: { start: new Date(), end: new Date(), label: 'Test' },
    totalEvents: 100,
    successRate: 0.95,
    failureCount: 5,
    mcpMetrics: [],
    topErrors: [],
    topSkills: [],
    topTools: [],
    circuitSummary: { total: 0, closed: 0, open: 0, halfOpen: 0 },
    recommendations: [],
  }),
  formatReportMarkdown: jest.fn().mockReturnValue('# Test Report\n\nContent'),
  getLast24hPeriod: jest.fn().mockReturnValue({
    start: new Date(),
    end: new Date(),
    label: 'Daily (24h)',
  }),
  getLast7dPeriod: jest.fn().mockReturnValue({
    start: new Date(),
    end: new Date(),
    label: 'Weekly (7d)',
  }),
  postReportToIssue: jest.fn().mockResolvedValue({ success: true }),
}));

describe('shouldRunJob', () => {
  it('should return false when job is disabled', () => {
    const jobConfig: JobConfig = {
      enabled: false,
      cadence: 'daily',
      at: '09:00',
    };
    const now = new Date('2024-01-15T09:00:00');

    expect(shouldRunJob(jobConfig, now, 'Asia/Tokyo')).toBe(false);
  });

  it('should return true when time matches for daily job', () => {
    const jobConfig: JobConfig = {
      enabled: true,
      cadence: 'daily',
      at: '09:00',
    };
    const now = new Date('2024-01-15T09:00:00');

    expect(shouldRunJob(jobConfig, now, 'Asia/Tokyo')).toBe(true);
  });

  it('should return false when time does not match', () => {
    const jobConfig: JobConfig = {
      enabled: true,
      cadence: 'daily',
      at: '09:00',
    };
    const now = new Date('2024-01-15T10:00:00');

    expect(shouldRunJob(jobConfig, now, 'Asia/Tokyo')).toBe(false);
  });

  it('should check day of week for weekly jobs', () => {
    const jobConfig: JobConfig = {
      enabled: true,
      cadence: 'weekly',
      at: '09:00',
      dow: 'Mon',
    };
    // Monday at 09:00
    const monday = new Date('2024-01-15T09:00:00'); // This is a Monday

    expect(shouldRunJob(jobConfig, monday, 'Asia/Tokyo')).toBe(true);
  });

  it('should return false for wrong day of week', () => {
    const jobConfig: JobConfig = {
      enabled: true,
      cadence: 'weekly',
      at: '09:00',
      dow: 'Mon',
    };
    // Tuesday at 09:00
    const tuesday = new Date('2024-01-16T09:00:00'); // This is a Tuesday

    expect(shouldRunJob(jobConfig, tuesday, 'Asia/Tokyo')).toBe(false);
  });
});

describe('redactContent', () => {
  it('should redact email addresses', () => {
    const content = 'Contact: user@example.com for details';
    const result = redactContent(content, [], '[REDACTED]');

    expect(result).toBe('Contact: [REDACTED] for details');
  });

  it('should redact GitHub tokens', () => {
    const content = 'Token: ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const result = redactContent(content, [], '[REDACTED]');

    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('ghp_');
  });

  it('should redact OpenAI keys', () => {
    const content = 'API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const result = redactContent(content, [], '[REDACTED]');

    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('sk-');
  });

  it('should redact Slack tokens', () => {
    const content = 'Slack: xoxb-1234567890-abcdefgh';
    const result = redactContent(content, [], '[REDACTED]');

    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('xoxb-');
  });

  it('should apply custom patterns', () => {
    const content = 'Secret: MY_SECRET_123';
    const patterns = ['MY_SECRET_\\d+'];
    const result = redactContent(content, patterns, '[HIDDEN]');

    expect(result).toBe('Secret: [HIDDEN]');
  });

  it('should use custom placeholder', () => {
    const content = 'Email: test@test.com';
    const result = redactContent(content, [], '***');

    expect(result).toBe('Email: ***');
  });

  it('should skip invalid patterns', () => {
    const content = 'Normal text';
    const patterns = ['[invalid regex'];
    const result = redactContent(content, patterns, '[REDACTED]');

    expect(result).toBe('Normal text');
  });
});

describe('executeJob', () => {
  const mockConfig: ScheduleConfig = {
    enabled: true,
    timezone: 'Asia/Tokyo',
    stateDir: 'logs/test-schedule-state',
    dashboardIssue: null,
    jobs: {
      daily_observability_report: {
        enabled: true,
        cadence: 'daily',
        at: '09:00',
        postToIssue: false,
      },
      weekly_observability_report: {
        enabled: true,
        cadence: 'weekly',
        dow: 'Mon',
        at: '09:10',
        postToIssue: false,
      },
      weekly_improvement_digest: {
        enabled: true,
        cadence: 'weekly',
        dow: 'Mon',
        at: '09:20',
        postToIssue: false,
      },
    },
    redaction: {
      patterns: [],
      placeholder: '[REDACTED]',
    },
  };

  it('should execute daily_observability_report', async () => {
    const result = await executeJob('daily_observability_report', mockConfig);

    expect(result.success).toBe(true);
    expect(result.jobName).toBe('daily_observability_report');
    expect(result.summary).toContain('Daily report');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should execute weekly_observability_report', async () => {
    const result = await executeJob('weekly_observability_report', mockConfig);

    expect(result.success).toBe(true);
    expect(result.jobName).toBe('weekly_observability_report');
    expect(result.summary).toContain('Weekly report');
  });

  it('should handle weekly_improvement_digest gracefully when P17 is not installed', async () => {
    const result = await executeJob('weekly_improvement_digest', mockConfig);

    expect(result.success).toBe(true);
    expect(result.summary).toContain('not available');
  });
});

describe('runOnce', () => {
  const TEST_STATE_DIR = path.join(process.cwd(), 'logs', 'test-schedule-state-runner');
  const CONFIG_PATH = path.join(process.cwd(), 'config', 'proxy-mcp', 'ops-schedule.json');
  let originalConfig: string | null = null;

  beforeEach(() => {
    // Backup original config
    if (fs.existsSync(CONFIG_PATH)) {
      originalConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    }

    // Clean up test state directory
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig) {
      fs.writeFileSync(CONFIG_PATH, originalConfig);
    }

    // Clean up
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  it('should skip all jobs when globally disabled', async () => {
    const config: ScheduleConfig = {
      enabled: false,
      timezone: 'Asia/Tokyo',
      stateDir: TEST_STATE_DIR,
      dashboardIssue: null,
      jobs: {
        daily_observability_report: {
          enabled: true,
          cadence: 'daily',
          at: '09:00',
        },
        weekly_observability_report: {
          enabled: true,
          cadence: 'weekly',
          dow: 'Mon',
          at: '09:10',
        },
        weekly_improvement_digest: {
          enabled: true,
          cadence: 'weekly',
          dow: 'Mon',
          at: '09:20',
        },
      },
      redaction: {
        patterns: [],
        placeholder: '[REDACTED]',
      },
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));

    const result = await runOnce();

    expect(result.ran).toHaveLength(0);
    expect(result.skipped.length).toBeGreaterThan(0);
  });

  it('should skip jobs that are individually disabled', async () => {
    const config: ScheduleConfig = {
      enabled: true,
      timezone: 'Asia/Tokyo',
      stateDir: TEST_STATE_DIR,
      dashboardIssue: null,
      jobs: {
        daily_observability_report: {
          enabled: false,
          cadence: 'daily',
          at: '09:00',
        },
        weekly_observability_report: {
          enabled: false,
          cadence: 'weekly',
          dow: 'Mon',
          at: '09:10',
        },
        weekly_improvement_digest: {
          enabled: false,
          cadence: 'weekly',
          dow: 'Mon',
          at: '09:20',
        },
      },
      redaction: {
        patterns: [],
        placeholder: '[REDACTED]',
      },
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));

    const result = await runOnce();

    expect(result.ran).toHaveLength(0);
    expect(result.skipped).toContain('daily_observability_report');
    expect(result.skipped).toContain('weekly_observability_report');
    expect(result.skipped).toContain('weekly_improvement_digest');
  });
});

describe('loadScheduleConfig', () => {
  it('should load config from file', () => {
    const config = loadScheduleConfig();

    // Config should exist (we created it in P18-1)
    expect(config).not.toBeNull();
    expect(config?.enabled).toBeDefined();
    expect(config?.timezone).toBeDefined();
    expect(config?.jobs).toBeDefined();
  });

  it('should have safe defaults', () => {
    const config = loadScheduleConfig();

    expect(config?.enabled).toBe(false);
    expect(config?.jobs.daily_observability_report.enabled).toBe(false);
    expect(config?.jobs.weekly_observability_report.enabled).toBe(false);
    expect(config?.jobs.weekly_improvement_digest.enabled).toBe(false);
  });
});
