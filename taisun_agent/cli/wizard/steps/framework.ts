/**
 * Step 3: Framework Selection
 *
 * Allows user to select a framework
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Framework {
  id: string;
  name: string;
  language: string;
  type: string;
  versions: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

/**
 * Load available frameworks
 */
export function loadFrameworks(): Framework[] {
  const configPath = path.join(__dirname, '../../config/frameworks.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.frameworks;
}

/**
 * Get framework by ID
 */
export function getFrameworkById(id: string): Framework | undefined {
  const frameworks = loadFrameworks();
  return frameworks.find(f => f.id === id);
}

/**
 * Group frameworks by type
 */
export function groupFrameworksByType(): Map<string, Framework[]> {
  const frameworks = loadFrameworks();
  const grouped = new Map<string, Framework[]>();

  for (const framework of frameworks) {
    if (!grouped.has(framework.type)) {
      grouped.set(framework.type, []);
    }
    grouped.get(framework.type)!.push(framework);
  }

  return grouped;
}
