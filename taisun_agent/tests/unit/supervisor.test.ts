/**
 * Supervisor Unit Tests (M6)
 *
 * Tests for LangGraph-based supervisor with human approval
 */

import {
  checkDangerousPatterns,
  requiresApproval,
  validatePlan,
  DANGEROUS_PATTERNS,
} from '../../src/proxy-mcp/supervisor';
import { skillRun, skillRunAsync } from '../../src/proxy-mcp/tools/skill';
import { MemoryService } from '../../src/proxy-mcp/memory';

describe('Supervisor', () => {
  describe('Policy', () => {
    describe('checkDangerousPatterns', () => {
      it('should detect "delete" pattern', () => {
        const patterns = checkDangerousPatterns('please delete all records');
        expect(patterns).toContain('delete');
      });

      it('should detect "deploy" pattern', () => {
        const patterns = checkDangerousPatterns('deploy to production');
        expect(patterns).toContain('deploy');
        expect(patterns).toContain('production');
      });

      it('should detect "secret" pattern', () => {
        const patterns = checkDangerousPatterns('get the api secret');
        expect(patterns).toContain('secret');
      });

      it('should detect "password" pattern', () => {
        const patterns = checkDangerousPatterns('reset user password');
        expect(patterns).toContain('password');
      });

      it('should detect "billing" pattern', () => {
        const patterns = checkDangerousPatterns('update billing info');
        expect(patterns).toContain('billing');
      });

      it('should detect "admin" pattern', () => {
        const patterns = checkDangerousPatterns('grant admin access');
        expect(patterns).toContain('admin');
      });

      it('should detect "captcha" pattern', () => {
        const patterns = checkDangerousPatterns('bypass captcha check');
        expect(patterns).toContain('captcha');
        expect(patterns).toContain('bypass');
      });

      it('should return empty array for safe input', () => {
        const patterns = checkDangerousPatterns('search for documentation');
        expect(patterns).toHaveLength(0);
      });

      it('should be case insensitive', () => {
        const patterns = checkDangerousPatterns('DELETE ALL');
        expect(patterns).toContain('delete');
      });
    });

    describe('requiresApproval', () => {
      it('should require approval for dangerous patterns', () => {
        const result = requiresApproval('delete production database');
        expect(result).toBe(true);
      });

      it('should not require approval for safe input', () => {
        const result = requiresApproval('search for files');
        expect(result).toBe(false);
      });

      it('should require approval when route action is require_human', () => {
        const result = requiresApproval('some input', {
          action: 'require_human',
          reason: 'test',
          confidence: 1.0,
        });
        expect(result).toBe(true);
      });

      it('should require approval when route has dangerous patterns', () => {
        const result = requiresApproval('some input', {
          action: 'allow',
          reason: 'test',
          confidence: 1.0,
          dangerousPatterns: ['delete'],
        });
        expect(result).toBe(true);
      });
    });

    describe('validatePlan', () => {
      it('should reject high-risk plan without approval', () => {
        const plan = {
          steps: [{ id: '1', action: 'delete', risk: 'high' as const }],
          estimatedRisk: 'high' as const,
          requiresApproval: true,
        };
        const result = validatePlan(plan, false);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('high risk');
      });

      it('should accept high-risk plan with approval', () => {
        const plan = {
          steps: [{ id: '1', action: 'delete', risk: 'high' as const }],
          estimatedRisk: 'high' as const,
          requiresApproval: true,
        };
        const result = validatePlan(plan, true);
        expect(result.valid).toBe(true);
      });

      it('should accept low-risk plan without approval', () => {
        const plan = {
          steps: [{ id: '1', action: 'search', risk: 'low' as const }],
          estimatedRisk: 'low' as const,
          requiresApproval: false,
        };
        const result = validatePlan(plan, false);
        expect(result.valid).toBe(true);
      });
    });

    describe('DANGEROUS_PATTERNS', () => {
      it('should include deployment patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('deploy');
        expect(DANGEROUS_PATTERNS).toContain('production');
        expect(DANGEROUS_PATTERNS).toContain('release');
      });

      it('should include destructive patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('delete');
        expect(DANGEROUS_PATTERNS).toContain('drop');
        expect(DANGEROUS_PATTERNS).toContain('destroy');
      });

      it('should include secret patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('secret');
        expect(DANGEROUS_PATTERNS).toContain('password');
        expect(DANGEROUS_PATTERNS).toContain('token');
      });

      it('should include billing patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('billing');
        expect(DANGEROUS_PATTERNS).toContain('payment');
      });

      it('should include access control patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('admin');
        expect(DANGEROUS_PATTERNS).toContain('permission');
      });

      it('should include abuse patterns', () => {
        expect(DANGEROUS_PATTERNS).toContain('captcha');
        expect(DANGEROUS_PATTERNS).toContain('bypass');
        expect(DANGEROUS_PATTERNS).toContain('spam');
      });
    });
  });

  describe('Skill Integration (sync check)', () => {
    describe('skillRun for supervisor', () => {
      it('should require input for supervisor', () => {
        const result = skillRun('supervisor');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Input is required');
      });

      it('should return ready status for safe input', () => {
        const result = skillRun('supervisor', { input: 'search for files' });

        expect(result.success).toBe(true);
        expect((result.data as { asyncRequired: boolean }).asyncRequired).toBe(true);
        expect((result.data as { status: string }).status).toBe('ready');
        expect((result.data as { requiresApproval: boolean }).requiresApproval).toBe(false);
      });

      it('should detect dangerous patterns in input', () => {
        const result = skillRun('supervisor', { input: 'delete production database' });

        expect(result.success).toBe(true);
        expect((result.data as { requiresApproval: boolean }).requiresApproval).toBe(true);
        expect((result.data as { dangerousPatterns: string[] }).dangerousPatterns).toBeDefined();
        expect((result.data as { dangerousPatterns: string[] }).dangerousPatterns).toContain('delete');
      });

      it('should include warning message for dangerous input', () => {
        const result = skillRun('supervisor', { input: 'bypass captcha' });

        expect(result.success).toBe(true);
        expect((result.data as { message: string }).message).toContain('Approval will be required');
      });
    });
  });

  describe('Skill Integration (async execution)', () => {
    beforeEach(() => {
      MemoryService.resetInstance();
    });

    afterEach(async () => {
      // Clean up any pending promises or timers
      await new Promise(resolve => setImmediate(resolve));
    });

    describe('skillRunAsync for supervisor', () => {
      it('should require input', async () => {
        const result = await skillRunAsync('supervisor', {});

        expect(result.success).toBe(false);
        expect(result.error).toContain('Input is required');
      });

      // Note: Full async tests would require mocking GitHub CLI
      // These tests verify the integration structure works correctly

      it('should run supervisor for safe input', async () => {
        const result = await skillRunAsync('supervisor', {
          input: 'search for documentation',
          skipApproval: true, // Skip for testing
        });

        // Should complete successfully for safe input
        expect(result.data).toBeDefined();
        expect((result.data as { runId: string }).runId).toBeDefined();
      });

      it('should detect dangerous input and require approval', async () => {
        const result = await skillRunAsync('supervisor', {
          input: 'delete all user data',
          skipApproval: false,
        });

        // Should pause for approval
        expect((result.data as { requiresApproval: boolean }).requiresApproval).toBe(true);
      });
    });
  });

  describe('Dangerous Pattern Coverage', () => {
    const testCases = [
      // Deployment
      { input: 'deploy app', pattern: 'deploy' },
      { input: 'push to production', pattern: 'production' },
      { input: 'release new version', pattern: 'release' },
      // Destructive
      { input: 'delete records', pattern: 'delete' },
      { input: 'drop table', pattern: 'drop' },
      { input: 'truncate data', pattern: 'truncate' },
      { input: 'remove user', pattern: 'remove' },
      { input: 'destroy resources', pattern: 'destroy' },
      { input: 'wipe storage', pattern: 'wipe' },
      // Secrets
      { input: 'get secret', pattern: 'secret' },
      { input: 'show credential', pattern: 'credential' },
      { input: 'get apikey', pattern: 'apikey' },
      { input: 'reset password', pattern: 'password' },
      { input: 'auth token', pattern: 'token' },
      // Billing
      { input: 'update billing', pattern: 'billing' },
      { input: 'process payment', pattern: 'payment' },
      { input: 'cancel subscription', pattern: 'subscription' },
      // Access control
      { input: 'grant role', pattern: 'role' },
      { input: 'admin access', pattern: 'admin' },
      { input: 'change permission', pattern: 'permission' },
      // Abuse
      { input: 'solve captcha', pattern: 'captcha' },
      { input: 'bypass security', pattern: 'bypass' },
      { input: 'send spam', pattern: 'spam' },
    ];

    testCases.forEach(({ input, pattern }) => {
      it(`should detect "${pattern}" in "${input}"`, () => {
        const patterns = checkDangerousPatterns(input);
        // Check that at least one pattern matches
        const found = patterns.some((p) => p.includes(pattern.replace(/_/g, '')));
        expect(found).toBe(true);
      });
    });
  });
});
