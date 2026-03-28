/**
 * AIT42 Memory System - Utils Unit Tests
 * Tests all utility functions with comprehensive coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  calculateRollingAverage,
  generateTaskId,
  getNextTaskSequence,
  sanitizeForFilename,
  atomicWrite,
  readYAMLWithLock,
  writeYAMLWithLock,
  createBackup
} from '../utils';

// Test directory setup
const TEST_DIR = path.join(__dirname, '__test-temp__');

beforeAll(() => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('calculateRollingAverage', () => {
  test('should return new value for first task (count=0)', () => {
    const result = calculateRollingAverage(0, 0, 95);
    expect(result).toBe(95);
  });

  test('should calculate correct rolling average', () => {
    // Old avg: 90, count: 4, new: 88
    // Expected: (90*4 + 88) / 5 = 89.6
    const result = calculateRollingAverage(90, 4, 88);
    expect(result).toBeCloseTo(89.6, 1);
  });

  test('should handle negative values', () => {
    const result = calculateRollingAverage(10, 2, -5);
    expect(result).toBeCloseTo(5, 1); // (10*2 - 5) / 3 = 5
  });

  test('should handle large counts', () => {
    const result = calculateRollingAverage(85, 1000, 95);
    expect(result).toBeCloseTo(85.01, 2); // Weighted heavily toward old avg
  });

  test('should handle zero old average', () => {
    const result = calculateRollingAverage(0, 5, 100);
    expect(result).toBeCloseTo(16.67, 1); // (0*5 + 100) / 6
  });
});

describe('generateTaskId', () => {
  test('should generate ID in YYYY-MM-DD-NNN format', () => {
    const id = generateTaskId(42);
    expect(id).toMatch(/^\d{4}-\d{2}-\d{2}-042$/);
  });

  test('should pad sequence with zeros (1 digit)', () => {
    const id = generateTaskId(5);
    expect(id).toMatch(/-005$/);
  });

  test('should pad sequence with zeros (2 digits)', () => {
    const id = generateTaskId(42);
    expect(id).toMatch(/-042$/);
  });

  test('should handle 3-digit sequences', () => {
    const id = generateTaskId(123);
    expect(id).toMatch(/-123$/);
  });

  test('should use current date', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const id = generateTaskId(1);
    expect(id).toBe(`${year}-${month}-${day}-001`);
  });
});

describe('getNextTaskSequence', () => {
  const tasksDir = path.join(TEST_DIR, 'tasks');

  beforeEach(() => {
    if (fs.existsSync(tasksDir)) {
      fs.rmSync(tasksDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tasksDir, { recursive: true });
  });

  test('should return 1 for empty directory', () => {
    const seq = getNextTaskSequence(tasksDir);
    expect(seq).toBe(1);
  });

  test('should return 1 for non-existent directory', () => {
    const nonExistent = path.join(TEST_DIR, 'does-not-exist');
    const seq = getNextTaskSequence(nonExistent);
    expect(seq).toBe(1);
  });

  test('should increment from existing tasks', () => {
    const today = new Date().toISOString().slice(0, 10);

    // Create existing task files
    fs.writeFileSync(path.join(tasksDir, `${today}-001-test.yaml`), '');
    fs.writeFileSync(path.join(tasksDir, `${today}-002-test.yaml`), '');
    fs.writeFileSync(path.join(tasksDir, `${today}-003-test.yaml`), '');

    const seq = getNextTaskSequence(tasksDir);
    expect(seq).toBe(4);
  });

  test('should ignore tasks from different dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Create tasks from different dates
    fs.writeFileSync(path.join(tasksDir, `${today}-001-test.yaml`), '');
    fs.writeFileSync(path.join(tasksDir, `${yesterday}-005-old.yaml`), '');

    const seq = getNextTaskSequence(tasksDir);
    expect(seq).toBe(2); // Only counts today's tasks
  });

  test('should handle gaps in sequence', () => {
    const today = new Date().toISOString().slice(0, 10);

    // Create tasks with gaps
    fs.writeFileSync(path.join(tasksDir, `${today}-001-test.yaml`), '');
    fs.writeFileSync(path.join(tasksDir, `${today}-003-test.yaml`), '');
    fs.writeFileSync(path.join(tasksDir, `${today}-010-test.yaml`), '');

    const seq = getNextTaskSequence(tasksDir);
    expect(seq).toBe(11); // Should return max + 1
  });
});

describe('sanitizeForFilename', () => {
  test('should convert to lowercase and replace spaces', () => {
    const result = sanitizeForFilename('Create REST API');
    expect(result).toBe('create-rest-api');
  });

  test('should remove special characters', () => {
    const result = sanitizeForFilename('Fix bug #123! @urgent');
    expect(result).toBe('fix-bug-123-urgent');
  });

  test('should handle multiple consecutive spaces', () => {
    const result = sanitizeForFilename('Test    Multiple     Spaces');
    expect(result).toBe('test-multiple-spaces');
  });

  test('should limit length to 50 characters', () => {
    const longText = 'a'.repeat(100);
    const result = sanitizeForFilename(longText);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.length).toBe(50);
  });

  test('should handle empty string', () => {
    const result = sanitizeForFilename('');
    expect(result).toBe('');
  });

  test('should handle only special characters', () => {
    const result = sanitizeForFilename('!@#$%^&*()');
    expect(result).toBe('');
  });

  test('should preserve hyphens', () => {
    const result = sanitizeForFilename('Create user-authentication API');
    expect(result).toBe('create-user-authentication-api');
  });
});

describe('atomicWrite', () => {
  const testFile = path.join(TEST_DIR, 'atomic-test.txt');

  beforeEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test('should write file atomically', async () => {
    const content = 'test content';
    await atomicWrite(testFile, content);

    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.readFileSync(testFile, 'utf8')).toBe(content);
  });

  test('should create directory if not exists', async () => {
    const nestedFile = path.join(TEST_DIR, 'nested', 'dir', 'file.txt');
    await atomicWrite(nestedFile, 'content');

    expect(fs.existsSync(nestedFile)).toBe(true);
  });

  test('should overwrite existing file', async () => {
    fs.writeFileSync(testFile, 'old content');
    await atomicWrite(testFile, 'new content');

    expect(fs.readFileSync(testFile, 'utf8')).toBe('new content');
  });

  test('should handle empty content', async () => {
    await atomicWrite(testFile, '');
    expect(fs.readFileSync(testFile, 'utf8')).toBe('');
  });

  test('should not leave temp files on success', async () => {
    await atomicWrite(testFile, 'content');

    const tempFiles = fs.readdirSync(TEST_DIR).filter(f => f.includes('.tmp.'));
    expect(tempFiles.length).toBe(0);
  });
});

describe('readYAMLWithLock', () => {
  const yamlFile = path.join(TEST_DIR, 'read-test.yaml');

  beforeEach(() => {
    const data = { test: 'value', number: 42 };
    fs.writeFileSync(yamlFile, yaml.dump(data));
  });

  test('should read YAML file correctly', async () => {
    const data = await readYAMLWithLock<any>(yamlFile);
    expect(data.test).toBe('value');
    expect(data.number).toBe(42);
  });

  test('should throw error for non-existent file', async () => {
    const nonExistent = path.join(TEST_DIR, 'does-not-exist.yaml');
    await expect(readYAMLWithLock(nonExistent)).rejects.toThrow('File not found');
  });

  test('should handle complex nested structures', async () => {
    const complexData = {
      agent_name: 'test',
      stats: {
        total: 10,
        nested: {
          deep: 'value'
        }
      },
      array: [1, 2, 3]
    };
    fs.writeFileSync(yamlFile, yaml.dump(complexData));

    const result = await readYAMLWithLock<any>(yamlFile);
    expect(result.agent_name).toBe('test');
    expect(result.stats.nested.deep).toBe('value');
    expect(result.array).toEqual([1, 2, 3]);
  });
});

describe('writeYAMLWithLock', () => {
  const yamlFile = path.join(TEST_DIR, 'write-test.yaml');

  beforeEach(() => {
    if (fs.existsSync(yamlFile)) {
      fs.unlinkSync(yamlFile);
    }
  });

  test('should write YAML file correctly', async () => {
    const data = { test: 'value', number: 42 };
    await writeYAMLWithLock(yamlFile, data);

    expect(fs.existsSync(yamlFile)).toBe(true);
    const content = yaml.load(fs.readFileSync(yamlFile, 'utf8')) as any;
    expect(content.test).toBe('value');
    expect(content.number).toBe(42);
  });

  test('should create file if not exists (ISSUE-002 fix)', async () => {
    const newFile = path.join(TEST_DIR, 'new-file.yaml');
    const data = { test: 'data' };

    await writeYAMLWithLock(newFile, data);

    expect(fs.existsSync(newFile)).toBe(true);
    const content = yaml.load(fs.readFileSync(newFile, 'utf8')) as any;
    expect(content.test).toBe('data');
  });

  test('should create directory if not exists', async () => {
    const nestedFile = path.join(TEST_DIR, 'nested', 'write', 'test.yaml');
    await writeYAMLWithLock(nestedFile, { test: 'data' });

    expect(fs.existsSync(nestedFile)).toBe(true);
  });

  test('should handle concurrent writes with lock serialization', async () => {
    const data1 = { attempt: 1 };
    const data2 = { attempt: 2 };
    const data3 = { attempt: 3 };

    // Launch concurrent writes
    const writes = [
      writeYAMLWithLock(yamlFile, data1),
      writeYAMLWithLock(yamlFile, data2),
      writeYAMLWithLock(yamlFile, data3)
    ];

    await Promise.all(writes);

    // One of the writes should have succeeded
    expect(fs.existsSync(yamlFile)).toBe(true);
    const content = yaml.load(fs.readFileSync(yamlFile, 'utf8')) as any;
    expect([1, 2, 3]).toContain(content.attempt);
  });

  test('should overwrite existing file', async () => {
    await writeYAMLWithLock(yamlFile, { old: 'data' });
    await writeYAMLWithLock(yamlFile, { new: 'data' });

    const content = yaml.load(fs.readFileSync(yamlFile, 'utf8')) as any;
    expect(content.new).toBe('data');
    expect(content.old).toBeUndefined();
  });
});

describe('createBackup', () => {
  const originalFile = path.join(TEST_DIR, 'backup-test.txt');
  const backupFile = `${originalFile}.bak`;

  beforeEach(() => {
    if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
  });

  test('should create backup of existing file', () => {
    fs.writeFileSync(originalFile, 'original content');
    createBackup(originalFile);

    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.readFileSync(backupFile, 'utf8')).toBe('original content');
  });

  test('should not throw error for non-existent file', () => {
    expect(() => createBackup(originalFile)).not.toThrow();
    expect(fs.existsSync(backupFile)).toBe(false);
  });

  test('should overwrite existing backup', () => {
    fs.writeFileSync(originalFile, 'new content');
    fs.writeFileSync(backupFile, 'old backup');

    createBackup(originalFile);

    expect(fs.readFileSync(backupFile, 'utf8')).toBe('new content');
  });
});
