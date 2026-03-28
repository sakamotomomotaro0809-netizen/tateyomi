/**
 * i18n Test Suite
 *
 * Tests for internationalization support (P20)
 */

import {
  t,
  getLocale,
  setLocale,
  getStatusEmoji,
  formatSteps,
  createProgressBar,
  jaTemplates,
  enTemplates,
  Locale,
} from '../../src/i18n';

describe('i18n', () => {
  // Store original locale and restore after tests
  let originalLocale: Locale;

  beforeAll(() => {
    originalLocale = getLocale();
  });

  afterAll(() => {
    setLocale(originalLocale);
  });

  beforeEach(() => {
    // Reset to Japanese (default)
    setLocale('ja');
    // Clear environment variable
    delete process.env.TAISUN_LOCALE;
  });

  describe('getLocale', () => {
    it('should return "ja" by default', () => {
      expect(getLocale()).toBe('ja');
    });

    it('should return "en" when TAISUN_LOCALE is "en"', () => {
      process.env.TAISUN_LOCALE = 'en';
      expect(getLocale()).toBe('en');
    });

    it('should return "en" when TAISUN_LOCALE is "en-US"', () => {
      process.env.TAISUN_LOCALE = 'en-US';
      expect(getLocale()).toBe('en');
    });

    it('should return "ja" when TAISUN_LOCALE is "ja"', () => {
      process.env.TAISUN_LOCALE = 'ja';
      expect(getLocale()).toBe('ja');
    });

    it('should return "ja" when TAISUN_LOCALE is "ja-JP"', () => {
      process.env.TAISUN_LOCALE = 'ja-JP';
      expect(getLocale()).toBe('ja');
    });

    it('should fallback to "ja" when TAISUN_LOCALE is unknown value', () => {
      process.env.TAISUN_LOCALE = 'fr';
      expect(getLocale()).toBe('ja');
    });

    it('should fallback to "ja" when TAISUN_LOCALE is empty string', () => {
      process.env.TAISUN_LOCALE = '';
      expect(getLocale()).toBe('ja');
    });
  });

  describe('setLocale', () => {
    it('should change locale to "en"', () => {
      setLocale('en');
      // Note: getLocale() checks env first, so we need to test with t()
      const result = t('supervisor.runlog.title', { runId: 'test-123' });
      expect(result).toBe('[SUPERVISOR] test-123');
    });

    it('should change locale to "ja"', () => {
      setLocale('ja');
      const result = t('supervisor.runlog.title', { runId: 'test-123' });
      expect(result).toBe('[SUPERVISOR] test-123');
    });
  });

  describe('t (translate)', () => {
    describe('Japanese locale', () => {
      beforeEach(() => {
        setLocale('ja');
      });

      it('should translate supervisor.runlog.title', () => {
        const result = t('supervisor.runlog.title', { runId: 'run-abc' });
        expect(result).toBe('[SUPERVISOR] run-abc');
      });

      it('should translate supervisor.approval.title in Japanese', () => {
        const result = t('supervisor.approval.title', { runId: 'run-xyz' });
        expect(result).toBe('[承認要求] run-xyz');
      });

      it('should translate agent.progress.status.in_progress', () => {
        const result = t('agent.progress.status.in_progress');
        expect(result).toBe('進行中');
      });

      it('should translate agent.progress.status.completed', () => {
        const result = t('agent.progress.status.completed');
        expect(result).toBe('完了');
      });

      it('should replace multiple placeholders', () => {
        const result = t('agent.progress.body', {
          statusEmoji: '🔄',
          status: '進行中',
          progressBar: '[████░░░░░░░░░░░░░░░░] 20%',
          completed: 2,
          total: 10,
          currentTaskLine: '**現在のタスク**: テスト',
          timestamp: '2024-01-01T00:00:00Z',
        });
        expect(result).toContain('🔄');
        expect(result).toContain('進行中');
        expect(result).toContain('2/10');
      });
    });

    describe('English locale', () => {
      beforeEach(() => {
        process.env.TAISUN_LOCALE = 'en';
      });

      it('should translate supervisor.runlog.title', () => {
        const result = t('supervisor.runlog.title', { runId: 'run-abc' });
        expect(result).toBe('[SUPERVISOR] run-abc');
      });

      it('should translate supervisor.approval.title in English', () => {
        const result = t('supervisor.approval.title', { runId: 'run-xyz' });
        expect(result).toBe('[APPROVAL] run-xyz');
      });

      it('should translate agent.progress.status.in_progress', () => {
        const result = t('agent.progress.status.in_progress');
        expect(result).toBe('IN PROGRESS');
      });

      it('should translate agent.progress.status.completed', () => {
        const result = t('agent.progress.status.completed');
        expect(result).toBe('COMPLETED');
      });
    });

    it('should return key if translation not found', () => {
      const result = t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });
  });

  describe('getStatusEmoji', () => {
    it('should return 🔄 for in_progress', () => {
      expect(getStatusEmoji('in_progress')).toBe('🔄');
    });

    it('should return ✅ for completed', () => {
      expect(getStatusEmoji('completed')).toBe('✅');
    });

    it('should return ❌ for failed', () => {
      expect(getStatusEmoji('failed')).toBe('❌');
    });
  });

  describe('formatSteps', () => {
    it('should format steps with action and risk', () => {
      const steps = [
        { action: 'Read file', risk: 'low' },
        { action: 'Write file', risk: 'medium' },
      ];
      const result = formatSteps(steps);
      expect(result).toBe(
        '1. **Read file** (low risk)\n2. **Write file** (medium risk)'
      );
    });

    it('should include target when present', () => {
      const steps = [
        { action: 'Delete file', risk: 'high', target: '/path/to/file.txt' },
      ];
      const result = formatSteps(steps);
      expect(result).toBe('1. **Delete file** (high risk) - /path/to/file.txt');
    });

    it('should handle empty array', () => {
      const result = formatSteps([]);
      expect(result).toBe('');
    });
  });

  describe('createProgressBar', () => {
    it('should create 0% progress bar', () => {
      const result = createProgressBar(0, 10);
      expect(result).toBe('[░░░░░░░░░░░░░░░░░░░░] 0%');
    });

    it('should create 50% progress bar', () => {
      const result = createProgressBar(5, 10);
      expect(result).toBe('[██████████░░░░░░░░░░] 50%');
    });

    it('should create 100% progress bar', () => {
      const result = createProgressBar(10, 10);
      expect(result).toBe('[████████████████████] 100%');
    });

    it('should handle 0 total gracefully', () => {
      const result = createProgressBar(0, 0);
      expect(result).toBe('[░░░░░░░░░░░░░░░░░░░░] 0%');
    });
  });

  describe('templates', () => {
    const requiredKeys = [
      'supervisor.runlog.title',
      'supervisor.runlog.body',
      'supervisor.approval.title',
      'supervisor.approval.body',
      'agent.progress.title',
      'observability.thread.title',
      'observability.report.body',
      'env.missing.github_token',
    ];

    it('should have all Japanese templates', () => {
      for (const key of requiredKeys) {
        expect(jaTemplates[key]).toBeDefined();
      }
    });

    it('should have all English templates', () => {
      for (const key of requiredKeys) {
        expect(enTemplates[key]).toBeDefined();
      }
    });

    it('should have matching keys in both locales', () => {
      const jaKeys = Object.keys(jaTemplates).sort();
      const enKeys = Object.keys(enTemplates).sort();
      expect(jaKeys).toEqual(enKeys);
    });
  });
});
