/**
 * Overlay Configuration System
 *
 * Loads and merges MCP configurations from multiple sources:
 * 1. Base: config/proxy-mcp/internal-mcps.json
 * 2. Overlay: TAISUN_INTERNAL_MCPS_OVERLAY_PATH env var
 * 3. Local: config/proxy-mcp/internal-mcps.local.json (fallback)
 *
 * Priority: overlay > local > base
 */

import * as fs from 'fs';
import * as path from 'path';
import { InternalMcpDefinition, InternalMcpsConfig, LocalMcpOverride, LocalMcpsConfig } from '../router/types';

const CONFIG_DIR = path.join(process.cwd(), 'config', 'proxy-mcp');
const BASE_CONFIG_PATH = path.join(CONFIG_DIR, 'internal-mcps.json');
const LOCAL_CONFIG_PATH = path.join(CONFIG_DIR, 'internal-mcps.local.json');

/**
 * Rollout configuration for canary deployments
 */
export interface RolloutConfig {
  mode: 'off' | 'canary' | 'full';
  canaryPercent?: number;
  allowlist?: {
    runIds?: string[];
    userIds?: string[];
    toolNames?: string[];
  };
}

/**
 * Extended MCP override with rollout support
 */
export interface McpOverrideWithRollout extends LocalMcpOverride {
  rollout?: RolloutConfig;
}

/**
 * Overlay config structure
 */
export interface OverlayConfig {
  mcps: McpOverrideWithRollout[];
}

/**
 * Load base configuration
 */
export function loadBaseConfig(): InternalMcpsConfig {
  try {
    if (fs.existsSync(BASE_CONFIG_PATH)) {
      const content = fs.readFileSync(BASE_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[overlay] Failed to load base config:', error);
  }
  return {
    version: '1.0.0',
    mcps: [],
    routerConfig: {
      ruleFirst: true,
      semanticThreshold: 0.7,
      topK: 5,
      fallback: 'require_clarify',
    },
  };
}

/**
 * Load overlay configuration from environment-specified path
 */
export function loadOverlayConfig(): OverlayConfig | null {
  const overlayPath = process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;
  if (!overlayPath) {
    return null;
  }

  try {
    if (fs.existsSync(overlayPath)) {
      const content = fs.readFileSync(overlayPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[overlay] Failed to load overlay config:', error);
  }
  return null;
}

/**
 * Load local configuration (fallback)
 */
export function loadLocalConfig(): LocalMcpsConfig | null {
  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      const content = fs.readFileSync(LOCAL_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[overlay] Failed to load local config:', error);
  }
  return null;
}

/**
 * Merge configurations with priority: overlay > local > base
 */
export function mergeConfigs(
  base: InternalMcpsConfig,
  local: LocalMcpsConfig | null,
  overlay: OverlayConfig | null
): InternalMcpDefinition[] {
  const result = base.mcps.map((mcp) => ({ ...mcp }));

  // Apply local overrides
  if (local?.mcps) {
    for (const override of local.mcps) {
      const existing = result.find((m) => m.name === override.name);
      if (existing) {
        if (override.enabled !== undefined) existing.enabled = override.enabled;
        if (override.versionPin) existing.versionPin = override.versionPin;
        if (override.requiredEnv) existing.requiredEnv = override.requiredEnv;
        if (override.allowlist) existing.allowlist = override.allowlist;
      }
    }
  }

  // Apply overlay overrides (highest priority)
  if (overlay?.mcps) {
    for (const override of overlay.mcps) {
      const existing = result.find((m) => m.name === override.name);
      if (existing) {
        if (override.enabled !== undefined) existing.enabled = override.enabled;
        if (override.versionPin) existing.versionPin = override.versionPin;
        if (override.requiredEnv) existing.requiredEnv = override.requiredEnv;
        if (override.allowlist) existing.allowlist = override.allowlist;
        // Store rollout config in metadata
        if (override.rollout) {
          (existing as InternalMcpDefinition & { rollout?: RolloutConfig }).rollout = override.rollout;
        }
      }
    }
  }

  return result;
}

/**
 * Load and merge all configurations
 */
export function loadMergedConfig(): InternalMcpDefinition[] {
  const base = loadBaseConfig();
  const local = loadLocalConfig();
  const overlay = loadOverlayConfig();
  return mergeConfigs(base, local, overlay);
}

/**
 * Get rollout config for a specific MCP
 */
export function getRolloutConfig(mcpName: string): RolloutConfig | null {
  const overlay = loadOverlayConfig();
  if (!overlay?.mcps) return null;

  const mcpOverride = overlay.mcps.find((m) => m.name === mcpName);
  return mcpOverride?.rollout || null;
}

/**
 * Get overlay path (for CLI tools)
 */
export function getOverlayPath(): string | null {
  return process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH || null;
}
