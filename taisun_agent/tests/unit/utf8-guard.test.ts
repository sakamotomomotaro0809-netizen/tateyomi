/**
 * Tests for utf8-guard.ts
 *
 * UTF-8 validation and mojibake detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  isTextFile,
  validateUtf8,
  findReplacementChars,
  hasBom,
  removeBom,
  getLineNumber,
  validateFile,
  runGuard,
} from '../../scripts/text/utf8-guard';

describe('utf8-guard', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utf8-guard-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isTextFile', () => {
    it('should identify TypeScript files', () => {
      expect(isTextFile('app.ts')).toBe(true);
      expect(isTextFile('component.tsx')).toBe(true);
    });

    it('should identify markdown files', () => {
      expect(isTextFile('README.md')).toBe(true);
      expect(isTextFile('docs/guide.md')).toBe(true);
    });

    it('should identify JSON files', () => {
      expect(isTextFile('package.json')).toBe(true);
      expect(isTextFile('config.json')).toBe(true);
    });

    it('should identify YAML files', () => {
      expect(isTextFile('config.yml')).toBe(true);
      expect(isTextFile('docker-compose.yaml')).toBe(true);
    });

    it('should reject binary files', () => {
      expect(isTextFile('image.png')).toBe(false);
      expect(isTextFile('video.mp4')).toBe(false);
      expect(isTextFile('archive.zip')).toBe(false);
    });
  });

  describe('validateUtf8', () => {
    it('should accept valid UTF-8', () => {
      const buffer = Buffer.from('Hello 世界 🌍', 'utf-8');
      expect(validateUtf8(buffer)).toEqual({ valid: true });
    });

    it('should accept Japanese text', () => {
      const buffer = Buffer.from('日本語テスト', 'utf-8');
      expect(validateUtf8(buffer)).toEqual({ valid: true });
    });

    it('should accept emoji', () => {
      const buffer = Buffer.from('🎉🎊🎁', 'utf-8');
      expect(validateUtf8(buffer)).toEqual({ valid: true });
    });

    it('should reject invalid UTF-8 sequences', () => {
      // Invalid continuation byte
      const invalidBuffer = Buffer.from([0xC0, 0x80]);
      const result = validateUtf8(invalidBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject truncated UTF-8 sequences', () => {
      // Start of 3-byte sequence without continuation
      const truncatedBuffer = Buffer.from([0xE0, 0xA0]);
      const result = validateUtf8(truncatedBuffer);
      expect(result.valid).toBe(false);
    });
  });

  describe('findReplacementChars', () => {
    it('should find U+FFFD positions', () => {
      const content = 'Hello\uFFFDWorld\uFFFD';
      const positions = findReplacementChars(content);
      expect(positions).toEqual([5, 11]);
    });

    it('should return empty array for clean content', () => {
      const content = 'Hello 日本語 World';
      expect(findReplacementChars(content)).toEqual([]);
    });

    it('should detect multiple adjacent U+FFFD', () => {
      const content = '\uFFFD\uFFFD\uFFFD';
      expect(findReplacementChars(content)).toEqual([0, 1, 2]);
    });
  });

  describe('hasBom', () => {
    it('should detect UTF-8 BOM', () => {
      const bufferWithBom = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      expect(hasBom(bufferWithBom)).toBe(true);
    });

    it('should return false for content without BOM', () => {
      const bufferWithoutBom = Buffer.from('Hello', 'utf-8');
      expect(hasBom(bufferWithoutBom)).toBe(false);
    });

    it('should handle empty buffer', () => {
      expect(hasBom(Buffer.from([]))).toBe(false);
    });
  });

  describe('removeBom', () => {
    it('should remove UTF-8 BOM', () => {
      const bufferWithBom = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x69]);
      const result = removeBom(bufferWithBom);
      expect(result.toString('utf-8')).toBe('Hi');
    });

    it('should not modify content without BOM', () => {
      const bufferWithoutBom = Buffer.from('Hello', 'utf-8');
      const result = removeBom(bufferWithoutBom);
      expect(result.toString('utf-8')).toBe('Hello');
    });
  });

  describe('getLineNumber', () => {
    it('should return correct line number', () => {
      const content = 'line1\nline2\nline3';
      expect(getLineNumber(content, 0)).toBe(1);
      expect(getLineNumber(content, 6)).toBe(2);
      expect(getLineNumber(content, 12)).toBe(3);
    });

    it('should handle single line', () => {
      const content = 'single line';
      expect(getLineNumber(content, 5)).toBe(1);
    });
  });

  describe('validateFile', () => {
    it('should pass valid UTF-8 file', () => {
      const filePath = path.join(tempDir, 'valid.txt');
      fs.writeFileSync(filePath, 'Hello 日本語 🌍', 'utf-8');

      const result = validateFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail file with U+FFFD', () => {
      const filePath = path.join(tempDir, 'mojibake.txt');
      fs.writeFileSync(filePath, 'Hello \uFFFD World', 'utf-8');

      const result = validateFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('U+FFFD');
    });

    it('should warn about BOM', () => {
      const filePath = path.join(tempDir, 'bom.txt');
      const contentWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from('Hello', 'utf-8'),
      ]);
      fs.writeFileSync(filePath, contentWithBom);

      const result = validateFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('UTF-8 BOM detected (use --fix-bom to remove)');
    });

    it('should fix BOM when requested', () => {
      const filePath = path.join(tempDir, 'bom-fix.txt');
      const contentWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from('Hello', 'utf-8'),
      ]);
      fs.writeFileSync(filePath, contentWithBom);

      const result = validateFile(filePath, { fixBom: true });
      expect(result.warnings).toContain('UTF-8 BOM removed');

      const fixedContent = fs.readFileSync(filePath);
      expect(hasBom(fixedContent)).toBe(false);
    });

    it('should handle non-existent file', () => {
      const result = validateFile('/non/existent/file.txt');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('File not found');
    });
  });

  describe('runGuard', () => {
    it('should validate multiple files', () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      fs.writeFileSync(file1, 'Valid content', 'utf-8');
      fs.writeFileSync(file2, 'Also valid 日本語', 'utf-8');

      const summary = runGuard([file1, file2]);

      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(0);
    });

    it('should count failures correctly', () => {
      const validFile = path.join(tempDir, 'valid.txt');
      const invalidFile = path.join(tempDir, 'invalid.txt');
      fs.writeFileSync(validFile, 'Valid', 'utf-8');
      fs.writeFileSync(invalidFile, 'Invalid \uFFFD', 'utf-8');

      const summary = runGuard([validFile, invalidFile]);

      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });
});
