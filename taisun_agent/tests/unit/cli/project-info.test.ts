/**
 * Unit tests for project info step
 */

import { describe, it, expect } from '@jest/globals';
import {
  getProjectInfoPrompts,
  validateProjectInfo
} from '../../../cli/wizard/steps/project-info';

describe('Project Info Step', () => {
  describe('getProjectInfoPrompts', () => {
    it('should return array of prompts', () => {
      const prompts = getProjectInfoPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBe(3);
    });

    it('should have project name prompt', () => {
      const prompts = getProjectInfoPrompts();
      const projectNamePrompt = prompts.find(p => p.name === 'projectName');

      expect(projectNamePrompt).toBeDefined();
      expect(projectNamePrompt?.type).toBe('input');
      expect(projectNamePrompt?.validate).toBeDefined();
    });

    it('should have description prompt', () => {
      const prompts = getProjectInfoPrompts();
      const descPrompt = prompts.find(p => p.name === 'description');

      expect(descPrompt).toBeDefined();
      expect(descPrompt?.default).toBe('A new project');
    });

    it('should have author prompt', () => {
      const prompts = getProjectInfoPrompts();
      const authorPrompt = prompts.find(p => p.name === 'author');

      expect(authorPrompt).toBeDefined();
      expect(authorPrompt?.validate).toBeDefined();
    });
  });

  describe('validateProjectInfo', () => {
    it('should validate complete project info', () => {
      const result = validateProjectInfo({
        projectName: 'my-project',
        description: 'A test project',
        author: 'test@example.com'
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject missing project name', () => {
      const result = validateProjectInfo({
        description: 'A test project',
        author: 'test@example.com'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Project name'))).toBe(true);
    });

    it('should reject invalid project name', () => {
      const result = validateProjectInfo({
        projectName: 'Invalid_Name',
        description: 'A test project',
        author: 'test@example.com'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing author', () => {
      const result = validateProjectInfo({
        projectName: 'my-project',
        description: 'A test project'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Author'))).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateProjectInfo({
        projectName: 'my-project',
        description: 'A test project',
        author: 'invalid-email'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('email') || e.includes('Email'))).toBe(true);
    });

    it('should accept missing description (optional)', () => {
      const result = validateProjectInfo({
        projectName: 'my-project',
        author: 'test@example.com'
      });

      expect(result.valid).toBe(true);
    });
  });
});
