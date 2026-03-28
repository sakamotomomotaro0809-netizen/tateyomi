/**
 * Step 1: Environment Check
 *
 * Checks system requirements:
 * - Node.js version 18+
 * - npm availability
 * - git availability
 */

import { execSync } from 'child_process';

export interface EnvironmentCheckResult {
  passed: boolean;
  checks: {
    node: { passed: boolean; version?: string; error?: string };
    npm: { passed: boolean; version?: string; error?: string };
    git: { passed: boolean; version?: string; error?: string };
  };
}

/**
 * Run environment checks
 */
export async function runEnvironmentCheck(): Promise<EnvironmentCheckResult> {
  const result: EnvironmentCheckResult = {
    passed: true,
    checks: {
      node: { passed: false },
      npm: { passed: false },
      git: { passed: false }
    }
  };

  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);

    if (majorVersion >= 18) {
      result.checks.node = { passed: true, version: nodeVersion };
    } else {
      result.checks.node = {
        passed: false,
        version: nodeVersion,
        error: 'Node.js version 18 or higher is required'
      };
      result.passed = false;
    }
  } catch (error: any) {
    result.checks.node = { passed: false, error: 'Node.js not found' };
    result.passed = false;
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    result.checks.npm = { passed: true, version: npmVersion };
  } catch (error: any) {
    result.checks.npm = { passed: false, error: 'npm not found' };
    result.passed = false;
  }

  // Check git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    result.checks.git = { passed: true, version: gitVersion };
  } catch (error: any) {
    result.checks.git = { passed: false, error: 'git not found' };
    result.passed = false;
  }

  return result;
}
