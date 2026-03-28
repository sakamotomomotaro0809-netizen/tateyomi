/**
 * Overlay Configuration System Unit Tests
 *
 * Tests for configuration merging with priority: overlay > local > base
 */

import * as fs from 'fs';
import {
  mergeConfigs,
  loadBaseConfig,
  loadLocalConfig,
  loadOverlayConfig,
  loadMergedConfig,
  getRolloutConfig,
  getOverlayPath,
} from '../../src/proxy-mcp/internal/overlay';
import type { InternalMcpsConfig, LocalMcpsConfig, InternalMcpDefinition } from '../../src/proxy-mcp/router/types';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Overlay Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('mergeConfigs', () => {
    const baseConfig: InternalMcpsConfig = {
      version: '1.0.0',
      mcps: [
        {
          name: 'github',
          enabled: true,
          transport: 'stdio',
          tags: ['source-control'],
          shortDescription: 'GitHub integration',
          dangerousOperations: [],
          allowlist: ['*'],
        } as InternalMcpDefinition,
        {
          name: 'slack',
          enabled: false,
          transport: 'stdio',
          tags: ['communication'],
          shortDescription: 'Slack integration',
          dangerousOperations: [],
          allowlist: ['*'],
        } as InternalMcpDefinition,
      ],
      routerConfig: {
        ruleFirst: true,
        semanticThreshold: 0.7,
        topK: 5,
        fallback: 'require_clarify',
      },
    };

    it('should return base mcps when no overrides', () => {
      const result = mergeConfigs(baseConfig, null, null);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('github');
      expect(result[0].enabled).toBe(true);
      expect(result[1].name).toBe('slack');
      expect(result[1].enabled).toBe(false);
    });

    it('should apply local overrides', () => {
      const localConfig: LocalMcpsConfig = {
        mcps: [{ name: 'slack', enabled: true }],
      };

      const result = mergeConfigs(baseConfig, localConfig, null);

      expect(result.find((m) => m.name === 'slack')?.enabled).toBe(true);
      expect(result.find((m) => m.name === 'github')?.enabled).toBe(true);
    });

    it('should apply overlay overrides with highest priority', () => {
      const localConfig: LocalMcpsConfig = {
        mcps: [{ name: 'github', enabled: false }],
      };

      const overlayConfig = {
        mcps: [{ name: 'github', enabled: true }],
      };

      const result = mergeConfigs(baseConfig, localConfig, overlayConfig);

      // Overlay should win
      expect(result.find((m) => m.name === 'github')?.enabled).toBe(true);
    });

    it('should merge versionPin from overrides', () => {
      const overlayConfig = {
        mcps: [{ name: 'github', versionPin: '2.0.0' }],
      };

      const result = mergeConfigs(baseConfig, null, overlayConfig);

      expect(result.find((m) => m.name === 'github')?.versionPin).toBe('2.0.0');
    });

    it('should merge requiredEnv from overrides', () => {
      const overlayConfig = {
        mcps: [{ name: 'github', requiredEnv: ['GITHUB_TOKEN'] }],
      };

      const result = mergeConfigs(baseConfig, null, overlayConfig);

      expect(result.find((m) => m.name === 'github')?.requiredEnv).toEqual(['GITHUB_TOKEN']);
    });

    it('should store rollout config in result', () => {
      const overlayConfig = {
        mcps: [
          {
            name: 'github',
            rollout: { mode: 'canary' as const, canaryPercent: 25 },
          },
        ],
      };

      const result = mergeConfigs(baseConfig, null, overlayConfig);
      const github = result.find((m) => m.name === 'github') as InternalMcpDefinition & { rollout?: { mode: string } };

      expect(github?.rollout?.mode).toBe('canary');
    });

    it('should handle empty mcps arrays', () => {
      const emptyBase: InternalMcpsConfig = {
        version: '1.0.0',
        mcps: [],
        routerConfig: {
          ruleFirst: true,
          semanticThreshold: 0.7,
          topK: 5,
          fallback: 'require_clarify',
        },
      };

      const result = mergeConfigs(emptyBase, null, null);
      expect(result).toEqual([]);
    });

    it('should merge allowlist from local override', () => {
      const localConfig: LocalMcpsConfig = {
        mcps: [{ name: 'github', allowlist: ['get_*', 'list_*'] }],
      };

      const result = mergeConfigs(baseConfig, localConfig, null);

      expect(result[0].allowlist).toEqual(['get_*', 'list_*']);
    });

    it('should merge allowlist from overlay override', () => {
      const overlayConfig = {
        mcps: [{ name: 'github', allowlist: ['create_*'] }],
      };

      const result = mergeConfigs(baseConfig, null, overlayConfig);

      expect(result[0].allowlist).toEqual(['create_*']);
    });

    it('should not modify base when override name not found', () => {
      const localConfig: LocalMcpsConfig = {
        mcps: [{ name: 'unknown-mcp', enabled: true }],
      };

      const result = mergeConfigs(baseConfig, localConfig, null);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('github');
    });
  });

  describe('loadBaseConfig', () => {
    it('should load config from file', () => {
      const config: InternalMcpsConfig = {
        version: '1.0.0',
        mcps: [
          {
            name: 'github',
            enabled: true,
            transport: 'stdio',
            tags: [],
            shortDescription: 'test',
            dangerousOperations: [],
          } as InternalMcpDefinition,
        ],
        routerConfig: { ruleFirst: true, semanticThreshold: 0.7, topK: 5, fallback: 'require_clarify' },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

      const result = loadBaseConfig();

      expect(result.mcps).toHaveLength(1);
      expect(result.mcps[0].name).toBe('github');
    });

    it('should return default config when file not found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadBaseConfig();

      expect(result.version).toBe('1.0.0');
      expect(result.mcps).toEqual([]);
    });

    it('should return default config on read error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = loadBaseConfig();

      expect(result.mcps).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('loadLocalConfig', () => {
    it('should load local config from file', () => {
      const config: LocalMcpsConfig = {
        mcps: [{ name: 'github', enabled: false }],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

      const result = loadLocalConfig();

      expect(result?.mcps).toHaveLength(1);
      expect(result?.mcps[0].enabled).toBe(false);
    });

    it('should return null when file not found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadLocalConfig();

      expect(result).toBeNull();
    });

    it('should return null on read error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = loadLocalConfig();

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('loadOverlayConfig', () => {
    it('should return null when env var not set', () => {
      delete process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;

      const result = loadOverlayConfig();

      expect(result).toBeNull();
    });

    it('should load overlay config from env path', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/config/overlay.json';

      const config = { mcps: [{ name: 'github', enabled: true }] };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

      const result = loadOverlayConfig();

      expect(result?.mcps).toHaveLength(1);
    });

    it('should return null when overlay file not found', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/config/overlay.json';
      mockFs.existsSync.mockReturnValue(false);

      const result = loadOverlayConfig();

      expect(result).toBeNull();
    });

    it('should return null when JSON parse fails', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/overlay.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json{');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = loadOverlayConfig();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getRolloutConfig', () => {
    it('should return null when no overlay', () => {
      delete process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;

      const result = getRolloutConfig('github');

      expect(result).toBeNull();
    });

    it('should return rollout config for mcp', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/overlay.json';

      const overlay = {
        mcps: [{ name: 'github', rollout: { mode: 'canary', canaryPercent: 10 } }],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(overlay));

      const result = getRolloutConfig('github');

      expect(result?.mode).toBe('canary');
      expect(result?.canaryPercent).toBe(10);
    });

    it('should return null for unknown mcp', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/overlay.json';

      const overlay = {
        mcps: [{ name: 'github', rollout: { mode: 'canary' } }],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(overlay));

      const result = getRolloutConfig('unknown-mcp');

      expect(result).toBeNull();
    });

    it('should return null when mcp has no rollout config', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/overlay.json';

      const overlay = {
        mcps: [{ name: 'github', enabled: true }],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(overlay));

      const result = getRolloutConfig('github');

      expect(result).toBeNull();
    });
  });

  describe('getOverlayPath', () => {
    it('should return env var value', () => {
      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/custom/path.json';

      expect(getOverlayPath()).toBe('/custom/path.json');
    });

    it('should return null when not set', () => {
      delete process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;

      expect(getOverlayPath()).toBeNull();
    });
  });

  describe('loadMergedConfig', () => {
    it('should merge all three config sources', () => {
      const baseConfig: InternalMcpsConfig = {
        version: '1.0.0',
        mcps: [
          {
            name: 'github',
            enabled: true,
            transport: 'stdio',
            tags: [],
            shortDescription: 'test',
            dangerousOperations: [],
          } as InternalMcpDefinition,
        ],
        routerConfig: { ruleFirst: true, semanticThreshold: 0.7, topK: 5, fallback: 'require_clarify' },
      };

      const localConfig: LocalMcpsConfig = {
        mcps: [{ name: 'github', enabled: false }],
      };

      const overlayConfig = {
        mcps: [{ name: 'github', enabled: true, versionPin: '3.0.0' }],
      };

      // Mock file reads
      let callCount = 0;
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return JSON.stringify(baseConfig);
        if (callCount === 2) return JSON.stringify(localConfig);
        return JSON.stringify(overlayConfig);
      });

      process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH = '/etc/overlay.json';

      const result = loadMergedConfig();

      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(true);  // overlay wins
      expect(result[0].versionPin).toBe('3.0.0');
    });

    it('should work with base only', () => {
      const baseConfig: InternalMcpsConfig = {
        version: '1.0.0',
        mcps: [
          {
            name: 'github',
            enabled: true,
            transport: 'stdio',
            tags: [],
            shortDescription: 'test',
            dangerousOperations: [],
          } as InternalMcpDefinition,
        ],
        routerConfig: { ruleFirst: true, semanticThreshold: 0.7, topK: 5, fallback: 'require_clarify' },
      };

      mockFs.existsSync.mockImplementation((path) => {
        return String(path).includes('internal-mcps.json') && !String(path).includes('local');
      });
      mockFs.readFileSync.mockReturnValue(JSON.stringify(baseConfig));

      delete process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;

      const result = loadMergedConfig();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('github');
    });
  });
});
