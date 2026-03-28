/**
 * Schedule State Manager Tests - P18
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScheduleStateManager } from '../../src/proxy-mcp/ops/schedule/state';

describe('ScheduleStateManager', () => {
  const TEST_STATE_DIR = path.join(process.cwd(), 'logs', 'test-schedule-state');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create initial state when no file exists', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      const state = manager.getJobState('daily_observability_report');
      expect(state.jobName).toBe('daily_observability_report');
      expect(state.lastRunAt).toBeNull();
      expect(state.lastStatus).toBeNull();
      expect(state.runCount).toBe(0);
    });

    it('should create state directory if not exists', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);
      manager.recordSuccess('daily_observability_report');

      expect(fs.existsSync(TEST_STATE_DIR)).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should update job state on success', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordSuccess('daily_observability_report');

      const state = manager.getJobState('daily_observability_report');
      expect(state.lastStatus).toBe('ok');
      expect(state.lastRunAt).not.toBeNull();
      expect(state.runCount).toBe(1);
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should reset consecutive failures on success', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordFailure('daily_observability_report', 'test error');
      manager.recordFailure('daily_observability_report', 'test error');
      manager.recordSuccess('daily_observability_report');

      const state = manager.getJobState('daily_observability_report');
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should persist state to disk', () => {
      const manager1 = new ScheduleStateManager(TEST_STATE_DIR);
      manager1.recordSuccess('daily_observability_report');

      // Create new manager to read from disk
      const manager2 = new ScheduleStateManager(TEST_STATE_DIR);
      const state = manager2.getJobState('daily_observability_report');

      expect(state.lastStatus).toBe('ok');
      expect(state.runCount).toBe(1);
    });
  });

  describe('recordFailure', () => {
    it('should update job state on failure', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordFailure('weekly_observability_report', 'Connection error');

      const state = manager.getJobState('weekly_observability_report');
      expect(state.lastStatus).toBe('fail');
      expect(state.lastError).toBe('Connection error');
      expect(state.consecutiveFailures).toBe(1);
    });

    it('should increment consecutive failures', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordFailure('weekly_observability_report', 'error 1');
      manager.recordFailure('weekly_observability_report', 'error 2');
      manager.recordFailure('weekly_observability_report', 'error 3');

      const state = manager.getJobState('weekly_observability_report');
      expect(state.consecutiveFailures).toBe(3);
      expect(state.runCount).toBe(3);
    });
  });

  describe('wasRunInCurrentPeriod', () => {
    it('should return false when never run', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);
      const now = new Date();

      const result = manager.wasRunInCurrentPeriod('daily_observability_report', 'daily', now);

      expect(result).toBe(false);
    });

    it('should return false when last run was failed', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);
      const now = new Date();

      manager.recordFailure('daily_observability_report', 'error');
      const result = manager.wasRunInCurrentPeriod('daily_observability_report', 'daily', now);

      expect(result).toBe(false);
    });

    describe('daily cadence', () => {
      it('should return true when run today', () => {
        const manager = new ScheduleStateManager(TEST_STATE_DIR);
        const now = new Date();

        manager.recordSuccess('daily_observability_report');
        const result = manager.wasRunInCurrentPeriod('daily_observability_report', 'daily', now);

        expect(result).toBe(true);
      });

      it('should return false when run yesterday', () => {
        const manager = new ScheduleStateManager(TEST_STATE_DIR);
        const now = new Date();

        // Record success, then modify lastRunAt to yesterday
        manager.recordSuccess('daily_observability_report');

        // Read state file and modify
        const statePath = manager.getStatePath();
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        state.jobs.daily_observability_report.lastRunAt = yesterday.toISOString();
        fs.writeFileSync(statePath, JSON.stringify(state));

        // Reload manager
        const manager2 = new ScheduleStateManager(TEST_STATE_DIR);
        const result = manager2.wasRunInCurrentPeriod('daily_observability_report', 'daily', now);

        expect(result).toBe(false);
      });
    });

    describe('weekly cadence', () => {
      it('should return true when run this week', () => {
        const manager = new ScheduleStateManager(TEST_STATE_DIR);
        const now = new Date();

        manager.recordSuccess('weekly_observability_report');
        const result = manager.wasRunInCurrentPeriod('weekly_observability_report', 'weekly', now);

        expect(result).toBe(true);
      });

      it('should return false when run last week', () => {
        const manager = new ScheduleStateManager(TEST_STATE_DIR);
        const now = new Date();

        manager.recordSuccess('weekly_observability_report');

        // Modify lastRunAt to 8 days ago
        const statePath = manager.getStatePath();
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 8);
        state.jobs.weekly_observability_report.lastRunAt = lastWeek.toISOString();
        fs.writeFileSync(statePath, JSON.stringify(state));

        const manager2 = new ScheduleStateManager(TEST_STATE_DIR);
        const result = manager2.wasRunInCurrentPeriod('weekly_observability_report', 'weekly', now);

        expect(result).toBe(false);
      });
    });
  });

  describe('getAllJobStates', () => {
    it('should return all job states', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordSuccess('daily_observability_report');
      manager.recordFailure('weekly_observability_report', 'error');

      const allStates = manager.getAllJobStates();

      expect(allStates.daily_observability_report.lastStatus).toBe('ok');
      expect(allStates.weekly_observability_report.lastStatus).toBe('fail');
      expect(allStates.weekly_improvement_digest.lastStatus).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const manager = new ScheduleStateManager(TEST_STATE_DIR);

      manager.recordSuccess('daily_observability_report');
      manager.recordSuccess('weekly_observability_report');
      manager.reset();

      const state = manager.getJobState('daily_observability_report');
      expect(state.lastRunAt).toBeNull();
      expect(state.runCount).toBe(0);
    });
  });
});
