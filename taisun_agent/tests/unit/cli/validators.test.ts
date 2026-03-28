/**
 * Unit tests for CLI validators
 *
 * Tests validation logic for:
 * - Project names (kebab-case)
 * - Email addresses
 * - API keys
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateProjectName,
  validateEmail,
  validateApiKey
} from '../../../cli/validators/index';

describe('validateProjectName', () => {
  describe('valid project names', () => {
    it('should accept lowercase kebab-case names', () => {
      const result = validateProjectName('my-project');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept names with numbers', () => {
      const result = validateProjectName('project-123');
      expect(result.valid).toBe(true);
    });

    it('should accept single word names', () => {
      const result = validateProjectName('project');
      expect(result.valid).toBe(true);
    });

    it('should accept long valid names', () => {
      const result = validateProjectName('my-awesome-project-name');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid project names', () => {
    it('should reject names with uppercase letters', () => {
      const result = validateProjectName('MyProject');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject names with underscores', () => {
      const result = validateProjectName('my_project');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject names starting with numbers', () => {
      const result = validateProjectName('123-project');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letter');
    });

    it('should reject names starting with hyphen', () => {
      const result = validateProjectName('-project');
      expect(result.valid).toBe(false);
    });

    it('should reject names ending with hyphen', () => {
      const result = validateProjectName('project-');
      expect(result.valid).toBe(false);
    });

    it('should reject empty names', () => {
      const result = validateProjectName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject names with special characters', () => {
      const result = validateProjectName('my@project');
      expect(result.valid).toBe(false);
    });

    it('should reject names that are too short', () => {
      const result = validateProjectName('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 characters');
    });

    it('should reject reserved npm package names', () => {
      const result = validateProjectName('node_modules');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });
  });
});

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with dots', () => {
      const result = validateEmail('first.last@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example.com');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject email without @', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid email');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('user name@example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });

    it('should reject email with multiple @ signs', () => {
      const result = validateEmail('user@@example.com');
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateApiKey', () => {
  describe('OpenAI API keys', () => {
    it('should accept valid OpenAI key format', () => {
      const result = validateApiKey('sk-proj-abc123def456ghi789', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should accept legacy OpenAI key format', () => {
      const result = validateApiKey('sk-abc123def456ghi789', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should reject OpenAI key with wrong prefix', () => {
      const result = validateApiKey('pk-abc123def456', 'openai');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sk-');
    });

    it('should reject short OpenAI key', () => {
      const result = validateApiKey('sk-short', 'openai');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });
  });

  describe('Anthropic API keys', () => {
    it('should accept valid Anthropic key format', () => {
      const result = validateApiKey('sk-ant-abc123def456ghi789', 'anthropic');
      expect(result.valid).toBe(true);
    });

    it('should reject Anthropic key with wrong prefix', () => {
      const result = validateApiKey('sk-proj-abc123', 'anthropic');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sk-ant-');
    });
  });

  describe('generic API keys', () => {
    it('should accept any non-empty key for unknown provider', () => {
      const result = validateApiKey('any-key-format-123', 'custom');
      expect(result.valid).toBe(true);
    });

    it('should reject empty key', () => {
      const result = validateApiKey('', 'custom');
      expect(result.valid).toBe(false);
    });

    it('should accept optional keys (empty allowed)', () => {
      const result = validateApiKey('', 'custom', { optional: true });
      expect(result.valid).toBe(true);
    });
  });
});
