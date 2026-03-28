/**
 * CLI Integration Tests
 *
 * Tests the complete CLI workflow
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { runEnvironmentCheck } from '../../../cli/wizard/steps/environment';
import { loadFrameworks, getFrameworkById } from '../../../cli/wizard/steps/framework';
import { loadFeatures, getCompatibleFeatures } from '../../../cli/wizard/steps/features';
import { FileGenerator } from '../../../cli/generator';

describe('CLI Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '../../../.test-output');

  beforeEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Environment Check', () => {
    it('should pass environment check on valid system', async () => {
      const result = await runEnvironmentCheck();

      expect(result.passed).toBe(true);
      expect(result.checks.node.passed).toBe(true);
      expect(result.checks.npm.passed).toBe(true);
      expect(result.checks.git.passed).toBe(true);
    });

    it('should detect Node.js version', async () => {
      const result = await runEnvironmentCheck();

      expect(result.checks.node.version).toBeDefined();
      expect(result.checks.node.version).toMatch(/^v\d+\.\d+\.\d+$/);
    });
  });

  describe('Framework Loading', () => {
    it('should load all frameworks', () => {
      const frameworks = loadFrameworks();

      expect(frameworks).toBeDefined();
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks.length).toBeGreaterThan(0);
    });

    it('should load Express framework', () => {
      const express = getFrameworkById('express');

      expect(express).toBeDefined();
      expect(express?.name).toBe('Express');
      expect(express?.language).toBe('typescript');
    });

    it('should load Next.js framework', () => {
      const nextjs = getFrameworkById('nextjs');

      expect(nextjs).toBeDefined();
      expect(nextjs?.name).toBe('Next.js');
      expect(nextjs?.type).toBe('fullstack');
    });
  });

  describe('Feature Loading', () => {
    it('should load all features', () => {
      const features = loadFeatures();

      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should filter features by language', () => {
      const tsFeatures = getCompatibleFeatures('typescript');
      const pyFeatures = getCompatibleFeatures('python');

      expect(tsFeatures.length).toBeGreaterThan(0);
      expect(pyFeatures.length).toBeGreaterThan(0);

      // TypeScript should have testing-jest
      expect(tsFeatures.some(f => f.id === 'testing-jest')).toBe(true);

      // Python should have testing-pytest
      expect(pyFeatures.some(f => f.id === 'testing-pytest')).toBe(true);
    });
  });

  describe('File Generation', () => {
    it('should generate complete Express project', async () => {
      const projectName = 'test-express-project';
      const outputDir = path.join(testOutputDir, projectName);

      const express = getFrameworkById('express');
      expect(express).toBeDefined();

      const features = getCompatibleFeatures('typescript').slice(0, 2);

      const generator = new FileGenerator();
      const results = await generator.generateAll({
        projectName,
        description: 'Test Express project',
        author: 'test@example.com',
        framework: express!,
        features,
        apiKeys: {},
        outputDir
      });

      // Check that files were generated
      expect(results.length).toBeGreaterThan(0);

      // Check for specific files
      const packageJson = results.find(r => r.path.endsWith('package.json'));
      expect(packageJson).toBeDefined();
      expect(packageJson?.success).toBe(true);

      const tsconfig = results.find(r => r.path.endsWith('tsconfig.json'));
      expect(tsconfig).toBeDefined();
      expect(tsconfig?.success).toBe(true);

      const readme = results.find(r => r.path.endsWith('README.md'));
      expect(readme).toBeDefined();
      expect(readme?.success).toBe(true);

      // Verify files exist on disk
      expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, '.gitignore'))).toBe(true);
    });

    it('should generate valid package.json', async () => {
      const projectName = 'test-package-json';
      const outputDir = path.join(testOutputDir, projectName);

      const express = getFrameworkById('express');
      const generator = new FileGenerator();

      await generator.generateAll({
        projectName,
        description: 'Test project',
        author: 'test@example.com',
        framework: express!,
        features: [],
        apiKeys: {},
        outputDir
      });

      const packageJsonPath = path.join(outputDir, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.name).toBe(projectName);
      expect(packageJson.description).toBe('Test project');
      expect(packageJson.author).toBe('test@example.com');
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
    });

    it('should generate src/index.ts for Express', async () => {
      const projectName = 'test-src-index';
      const outputDir = path.join(testOutputDir, projectName);

      const express = getFrameworkById('express');
      const generator = new FileGenerator();

      await generator.generateAll({
        projectName,
        description: 'Test project',
        author: 'test@example.com',
        framework: express!,
        features: [],
        apiKeys: {},
        outputDir
      });

      const indexPath = path.join(outputDir, 'src', 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('import express');
      expect(content).toContain('app.listen');
    });
  });

  describe('Complete Workflow', () => {
    it('should complete full initialization workflow', async () => {
      // Step 1: Environment check
      const envCheck = await runEnvironmentCheck();
      expect(envCheck.passed).toBe(true);

      // Step 2: Load frameworks
      const frameworks = loadFrameworks();
      expect(frameworks.length).toBeGreaterThan(0);

      // Step 3: Select framework
      const selectedFramework = frameworks.find(f => f.id === 'express');
      expect(selectedFramework).toBeDefined();

      // Step 4: Load compatible features
      const compatibleFeatures = getCompatibleFeatures(selectedFramework!.language);
      expect(compatibleFeatures.length).toBeGreaterThan(0);

      // Step 5: Generate project
      const projectName = 'complete-workflow-test';
      const outputDir = path.join(testOutputDir, projectName);

      const generator = new FileGenerator();
      const results = await generator.generateAll({
        projectName,
        description: 'Complete workflow test',
        author: 'test@example.com',
        framework: selectedFramework!,
        features: compatibleFeatures.slice(0, 2),
        apiKeys: { openai: true },
        outputDir
      });

      // Verify all files generated successfully
      const failedFiles = results.filter(r => !r.success);
      expect(failedFiles.length).toBe(0);

      // Verify project structure
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, '.clauderc.json'))).toBe(true);
    });
  });
});
