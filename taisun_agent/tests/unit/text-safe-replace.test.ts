/**
 * Tests for safe-replace.ts
 *
 * Unicode-safe text replacement functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readUtf8Fatal,
  hasReplacementChar,
  countReplacementChars,
  createBackup,
  writeAtomic,
  applyReplacements,
  processFile,
} from '../../scripts/text/safe-replace';

describe('safe-replace', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-replace-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readUtf8Fatal', () => {
    it('should read valid UTF-8 file', () => {
      const filePath = path.join(tempDir, 'valid.txt');
      fs.writeFileSync(filePath, 'Hello 世界 🌍', 'utf-8');

      const content = readUtf8Fatal(filePath);
      expect(content).toBe('Hello 世界 🌍');
    });

    it('should throw on invalid UTF-8', () => {
      const filePath = path.join(tempDir, 'invalid.txt');
      // Write invalid UTF-8 byte sequence
      const invalidBuffer = Buffer.from([0x80, 0x81, 0x82]);
      fs.writeFileSync(filePath, invalidBuffer);

      expect(() => readUtf8Fatal(filePath)).toThrow('Invalid UTF-8');
    });
  });

  describe('hasReplacementChar', () => {
    it('should detect U+FFFD', () => {
      expect(hasReplacementChar('Hello \uFFFD World')).toBe(true);
    });

    it('should return false for clean content', () => {
      expect(hasReplacementChar('Hello World 日本語')).toBe(false);
    });
  });

  describe('countReplacementChars', () => {
    it('should count multiple U+FFFD', () => {
      expect(countReplacementChars('\uFFFD\uFFFD\uFFFD')).toBe(3);
    });

    it('should return 0 for clean content', () => {
      expect(countReplacementChars('Clean content')).toBe(0);
    });
  });

  describe('applyReplacements', () => {
    it('should replace Japanese text safely', () => {
      const content = 'これは日本語のテストです。';
      const rules = [{ from: '日本語', to: 'にほんご' }];

      const { result, totalReplacements } = applyReplacements(content, rules);

      expect(result).toBe('これはにほんごのテストです。');
      expect(totalReplacements).toBe(1);
    });

    it('should handle multiple replacements', () => {
      const content = 'foo bar foo bar foo';
      const rules = [{ from: 'foo', to: 'baz' }];

      const { result, totalReplacements } = applyReplacements(content, rules);

      expect(result).toBe('baz bar baz bar baz');
      expect(totalReplacements).toBe(3);
    });

    it('should handle regex replacements', () => {
      const content = 'line1\nline2\nline3';
      const rules = [{ from: 'line\\d', to: 'LINE', regex: true }];

      const { result, totalReplacements } = applyReplacements(content, rules);

      expect(result).toBe('LINE\nLINE\nLINE');
      expect(totalReplacements).toBe(3);
    });

    it('should handle emoji (surrogate pairs)', () => {
      const content = 'Hello 🎉 World 🎊';
      const rules = [{ from: '🎉', to: '✨' }];

      const { result, totalReplacements } = applyReplacements(content, rules);

      expect(result).toBe('Hello ✨ World 🎊');
      expect(totalReplacements).toBe(1);
    });

    it('should handle mixed Japanese and emoji', () => {
      const content = 'おはよう🌅ございます';
      const rules = [{ from: 'おはよう', to: 'こんにちは' }];

      const { result, totalReplacements } = applyReplacements(content, rules);

      expect(result).toBe('こんにちは🌅ございます');
      expect(totalReplacements).toBe(1);
    });
  });

  describe('writeAtomic', () => {
    it('should write file atomically', () => {
      const filePath = path.join(tempDir, 'atomic.txt');
      const content = 'Test content 日本語';

      writeAtomic(filePath, content);

      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('should not leave temp file on success', () => {
      const filePath = path.join(tempDir, 'atomic2.txt');
      writeAtomic(filePath, 'content');

      const files = fs.readdirSync(tempDir);
      expect(files.filter(f => f.includes('.tmp.'))).toHaveLength(0);
    });
  });

  describe('createBackup', () => {
    it('should create backup file', () => {
      const filePath = path.join(tempDir, 'original.txt');
      fs.writeFileSync(filePath, 'Original content');

      const backupDir = path.join(tempDir, 'backups');
      const backupPath = createBackup(filePath, backupDir);

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.readFileSync(backupPath, 'utf-8')).toBe('Original content');
    });
  });

  describe('processFile', () => {
    it('should process file with Japanese content', () => {
      const filePath = path.join(tempDir, 'japanese.txt');
      fs.writeFileSync(filePath, 'こんにちは世界', 'utf-8');

      const result = processFile(
        filePath,
        [{ from: '世界', to: 'せかい' }],
        { dryRun: false, createBackup: false, backupDir: tempDir }
      );

      expect(result.replacements).toBe(1);
      expect(result.error).toBeUndefined();
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('こんにちはせかい');
    });

    it('should not modify file in dry-run mode', () => {
      const filePath = path.join(tempDir, 'dryrun.txt');
      fs.writeFileSync(filePath, 'Original', 'utf-8');

      const result = processFile(
        filePath,
        [{ from: 'Original', to: 'Modified' }],
        { dryRun: true, createBackup: false, backupDir: tempDir }
      );

      expect(result.replacements).toBe(1);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Original');
    });

    it('should create backup when enabled', () => {
      const filePath = path.join(tempDir, 'backup.txt');
      fs.writeFileSync(filePath, 'Content', 'utf-8');
      const backupDir = path.join(tempDir, 'backups');

      const result = processFile(
        filePath,
        [{ from: 'Content', to: 'New' }],
        { dryRun: false, createBackup: true, backupDir }
      );

      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath!)).toBe(true);
    });

    it('should handle CRLF line endings', () => {
      const filePath = path.join(tempDir, 'crlf.txt');
      fs.writeFileSync(filePath, 'line1\r\nline2\r\nline3', 'utf-8');

      const result = processFile(
        filePath,
        [{ from: 'line2', to: 'LINE2' }],
        { dryRun: false, createBackup: false, backupDir: tempDir }
      );

      expect(result.replacements).toBe(1);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('line1\r\nLINE2\r\nline3');
    });
  });
});
