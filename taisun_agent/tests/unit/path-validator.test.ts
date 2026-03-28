/**
 * Path Validator Tests
 *
 * Tests for absolute path enforcement based on Anthropic's SWE-bench best practices
 */

import {
  validatePath,
  normalizePath,
  enforceAbsolutePath,
  toAbsolutePath,
  isPathWithinDirectory,
  getFileExtension,
  validatePaths,
  DEFAULT_PATH_CONFIG,
  PathValidatorConfig,
} from '../../src/proxy-mcp/internal/path-validator';

describe('Path Validator', () => {
  describe('validatePath', () => {
    describe('absolute path enforcement', () => {
      it('should accept valid absolute paths', () => {
        const result = validatePath('/Users/project/src/index.ts');
        expect(result.valid).toBe(true);
        expect(result.normalizedPath).toBe('/Users/project/src/index.ts');
      });

      it('should reject relative paths by default', () => {
        const result = validatePath('src/index.ts');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Relative path not allowed');
        expect(result.suggestion).toContain('Use absolute path');
      });

      it('should reject paths starting with ./', () => {
        const result = validatePath('./src/index.ts');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Relative path not allowed');
      });

      it('should allow relative paths when configured', () => {
        const config: PathValidatorConfig = {
          ...DEFAULT_PATH_CONFIG,
          allowRelative: true,
        };
        const result = validatePath('src/index.ts', config);
        expect(result.valid).toBe(true);
      });
    });

    describe('empty and invalid paths', () => {
      it('should reject empty path', () => {
        const result = validatePath('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Path is empty');
      });

      it('should reject whitespace-only path', () => {
        const result = validatePath('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Path is empty');
      });
    });

    describe('path traversal prevention', () => {
      it('should reject path with .. traversal', () => {
        const result = validatePath('/Users/project/../../../etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked for security');
      });

      it('should normalize and accept safe paths with ..', () => {
        const result = validatePath('/Users/project/src/../lib/utils.ts');
        expect(result.valid).toBe(true);
        expect(result.normalizedPath).toBe('/Users/project/lib/utils.ts');
      });
    });

    describe('security blocked paths', () => {
      it('should block /etc/passwd', () => {
        const result = validatePath('/etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked for security');
      });

      it('should block /etc/shadow', () => {
        const result = validatePath('/etc/shadow');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked for security');
      });

      it('should block .ssh directory access', () => {
        const result = validatePath('/Users/user/.ssh/id_rsa');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked for security');
      });
    });

    describe('depth limit', () => {
      it('should reject paths exceeding max depth', () => {
        const deepPath = '/' + Array(60).fill('dir').join('/') + '/file.ts';
        const result = validatePath(deepPath);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds maximum');
      });

      it('should accept paths within depth limit', () => {
        const normalPath = '/Users/project/src/components/Button.tsx';
        const result = validatePath(normalPath);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('normalizePath', () => {
    it('should remove duplicate slashes', () => {
      expect(normalizePath('/Users//project///src/index.ts')).toBe('/Users/project/src/index.ts');
    });

    it('should resolve . (current directory)', () => {
      expect(normalizePath('/Users/./project/./src/index.ts')).toBe('/Users/project/src/index.ts');
    });

    it('should resolve .. (parent directory)', () => {
      expect(normalizePath('/Users/project/src/../lib/utils.ts')).toBe('/Users/project/lib/utils.ts');
    });

    it('should not go above root', () => {
      expect(normalizePath('/Users/../../../etc')).toBe('/etc');
    });

    it('should handle trailing slash', () => {
      expect(normalizePath('/Users/project/')).toBe('/Users/project');
    });

    it('should handle empty path', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should handle root path', () => {
      expect(normalizePath('/')).toBe('/');
    });
  });

  describe('enforceAbsolutePath', () => {
    it('should return normalized path for valid absolute paths', () => {
      const result = enforceAbsolutePath('/Users/project/src/index.ts');
      expect(result).toBe('/Users/project/src/index.ts');
    });

    it('should throw error for relative paths', () => {
      expect(() => enforceAbsolutePath('src/index.ts')).toThrow('Relative path not allowed');
    });

    it('should include context in error message', () => {
      expect(() => enforceAbsolutePath('src/index.ts', 'Edit Tool')).toThrow('[Edit Tool]');
    });

    it('should throw error for blocked paths', () => {
      expect(() => enforceAbsolutePath('/etc/passwd')).toThrow('blocked for security');
    });
  });

  describe('toAbsolutePath', () => {
    it('should convert relative path to absolute', () => {
      const result = toAbsolutePath('src/index.ts', '/Users/project');
      expect(result).toBe('/Users/project/src/index.ts');
    });

    it('should keep absolute path unchanged', () => {
      const result = toAbsolutePath('/absolute/path/file.ts', '/Users/project');
      expect(result).toBe('/absolute/path/file.ts');
    });

    it('should throw error if base directory is relative', () => {
      expect(() => toAbsolutePath('src/index.ts', 'relative/base')).toThrow(
        'Base directory must be absolute'
      );
    });

    it('should normalize the result', () => {
      const result = toAbsolutePath('../lib/utils.ts', '/Users/project/src');
      expect(result).toBe('/Users/project/lib/utils.ts');
    });
  });

  describe('isPathWithinDirectory', () => {
    it('should return true for path within directory', () => {
      expect(isPathWithinDirectory('/Users/project/src/index.ts', '/Users/project')).toBe(true);
    });

    it('should return true for exact directory match', () => {
      expect(isPathWithinDirectory('/Users/project', '/Users/project')).toBe(true);
    });

    it('should return false for path outside directory', () => {
      expect(isPathWithinDirectory('/etc/passwd', '/Users/project')).toBe(false);
    });

    it('should return false for path traversal attempt', () => {
      expect(isPathWithinDirectory('/Users/project/../etc/passwd', '/Users/project')).toBe(false);
    });

    it('should handle similar prefixes correctly', () => {
      // /Users/project-other should not be within /Users/project
      expect(isPathWithinDirectory('/Users/project-other/file.ts', '/Users/project')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract simple extension', () => {
      expect(getFileExtension('/path/to/file.ts')).toBe('ts');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('/path/to/file.test.ts')).toBe('ts');
    });

    it('should return empty for no extension', () => {
      expect(getFileExtension('/path/to/Makefile')).toBe('');
    });

    it('should handle dotfiles', () => {
      expect(getFileExtension('/path/to/.gitignore')).toBe('');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('/path/to/File.TSX')).toBe('tsx');
    });
  });

  describe('validatePaths', () => {
    it('should separate valid and invalid paths', () => {
      const paths = [
        '/Users/project/src/index.ts', // valid
        'relative/path.ts', // invalid
        '/Users/project/lib/utils.ts', // valid
        '/etc/passwd', // invalid (blocked)
      ];

      const { valid, invalid } = validatePaths(paths);

      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(2);
      expect(valid[0].normalizedPath).toBe('/Users/project/src/index.ts');
      expect(invalid[0].error).toContain('Relative path not allowed');
    });

    it('should return empty arrays for empty input', () => {
      const { valid, invalid } = validatePaths([]);
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(0);
    });
  });
});
