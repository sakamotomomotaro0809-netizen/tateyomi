/**
 * AIT42 Memory System Utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as lockfile from 'proper-lockfile';

/**
 * Atomic file write with lock
 */
export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create temp file
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    // Write to temp file
    fs.writeFileSync(tempPath, content, 'utf8');

    // Atomic rename
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

/**
 * Read YAML file with lock
 */
export async function readYAMLWithLock<T>(filePath: string): Promise<T> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Acquire read lock
  const release = await lockfile.lock(filePath, {
    stale: 5000,
    realpath: false,  // Don't resolve symlinks
    retries: { retries: 3, minTimeout: 100 }
  });

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) as T;
  } finally {
    await release();
  }
}

/**
 * Write YAML file with lock
 */
export async function writeYAMLWithLock(
  filePath: string,
  data: any
): Promise<void> {
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ✅ FIX: Create empty file if it doesn't exist (proper-lockfile requires file to exist)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  // Acquire write lock (let proper-lockfile handle lock file path automatically)
  const release = await lockfile.lock(filePath, {
    stale: 10000,
    realpath: false,  // Don't resolve symlinks
    retries: { retries: 5, minTimeout: 200 }
  });

  try {
    const content = yaml.dump(data, { lineWidth: -1, noRefs: true });
    await atomicWrite(filePath, content);
  } finally {
    await release();
  }
}

/**
 * Generate task ID
 */
export function generateTaskId(sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');

  return `${year}-${month}-${day}-${seq}`;
}

/**
 * Get next task sequence number
 */
export function getNextTaskSequence(tasksDir: string): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (!fs.existsSync(tasksDir)) {
    return 1;
  }

  const files = fs.readdirSync(tasksDir)
    .filter(f => f.startsWith(today) && f.endsWith('.yaml'));

  if (files.length === 0) {
    return 1;
  }

  // Extract sequence numbers
  const sequences = files.map(f => {
    const match = f.match(/-(\d{3})-/);
    return match ? parseInt(match[1], 10) : 0;
  });

  return Math.max(...sequences) + 1;
}

/**
 * Create backup
 */
export function createBackup(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, backupPath);
}

/**
 * Calculate rolling average
 */
export function calculateRollingAverage(
  oldAvg: number,
  oldCount: number,
  newValue: number
): number {
  if (oldCount === 0) {
    return newValue;
  }

  return ((oldAvg * oldCount) + newValue) / (oldCount + 1);
}

/**
 * Sanitize task description for filename
 */
export function sanitizeForFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}
