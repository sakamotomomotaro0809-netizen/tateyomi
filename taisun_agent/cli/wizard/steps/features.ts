/**
 * Step 4: Feature Selection
 *
 * Allows user to select additional features
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Feature {
  id: string;
  name: string;
  description: string;
  languages: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  files?: Record<string, boolean>;
}

/**
 * Load available features
 */
export function loadFeatures(): Feature[] {
  const configPath = path.join(__dirname, '../../config/features.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.features;
}

/**
 * Get features compatible with a language
 */
export function getCompatibleFeatures(language: string): Feature[] {
  const features = loadFeatures();
  return features.filter(f => f.languages.includes(language));
}

/**
 * Get features by IDs
 */
export function getFeaturesByIds(ids: string[]): Feature[] {
  const features = loadFeatures();
  return features.filter(f => ids.includes(f.id));
}
