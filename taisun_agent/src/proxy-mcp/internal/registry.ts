/**
 * Internal MCP Registry - Manages internal MCP definitions
 *
 * P6 Update: Uses overlay system for production enablement
 * Priority: overlay > local > base
 */

import * as path from 'path';
import { InternalMcpDefinition, InternalMcpsConfig, RouterConfig } from '../router/types';
import { loadMergedConfig, loadBaseConfig, getRolloutConfig, RolloutConfig } from './overlay';
import { isRolloutEnabled, formatRolloutStatus } from './rollout';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'proxy-mcp', 'internal-mcps.json');

let cachedConfig: InternalMcpsConfig | null = null;

/**
 * Load internal MCPs config from file (uses overlay system)
 */
export function loadConfig(_configPath: string = CONFIG_PATH): InternalMcpsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Use overlay system for merged configuration
    const baseConfig = loadBaseConfig();
    const mergedMcps = loadMergedConfig();

    cachedConfig = {
      ...baseConfig,
      mcps: mergedMcps,
    };

    return cachedConfig;
  } catch (error) {
    console.error('[registry] Failed to load internal MCPs config:', error);
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
}

/**
 * Clear cached config (for testing)
 */
export function clearCache(): void {
  cachedConfig = null;
}

/**
 * Get all registered MCPs
 */
export function getAllMcps(): InternalMcpDefinition[] {
  const config = loadConfig();
  return config.mcps;
}

/**
 * Get enabled MCPs only
 */
export function getEnabledMcps(): InternalMcpDefinition[] {
  return getAllMcps().filter((mcp) => mcp.enabled);
}

/**
 * Get MCP by name
 */
export function getMcpByName(name: string): InternalMcpDefinition | undefined {
  return getAllMcps().find((mcp) => mcp.name === name);
}

/**
 * Get MCPs by tag
 */
export function getMcpsByTag(tag: string): InternalMcpDefinition[] {
  const tagLower = tag.toLowerCase();
  return getAllMcps().filter((mcp) => mcp.tags.some((t) => t.toLowerCase() === tagLower));
}

/**
 * Get router config
 */
export function getRouterConfig(): RouterConfig {
  const config = loadConfig();
  return config.routerConfig;
}

/**
 * Check if an MCP is enabled
 */
export function isMcpEnabled(name: string): boolean {
  const mcp = getMcpByName(name);
  return mcp?.enabled ?? false;
}

/**
 * Get MCP summary (for Claude context)
 */
export function getMcpSummary(): string {
  const mcps = getAllMcps();
  if (mcps.length === 0) {
    return 'No internal MCPs registered.';
  }

  const lines = ['Available internal MCPs:'];
  for (const mcp of mcps) {
    const status = mcp.enabled ? 'enabled' : 'disabled';
    const rollout = formatRolloutStatus(mcp.name);
    lines.push(`  - ${mcp.name} [${status}] (${rollout}): ${mcp.shortDescription}`);
  }
  return lines.join('\n');
}

/**
 * Check if an MCP is enabled for a specific runId (considers rollout)
 */
export function isMcpEnabledForRun(name: string, runId: string): boolean {
  const mcp = getMcpByName(name);
  if (!mcp?.enabled) {
    return false;
  }

  // Check rollout status
  return isRolloutEnabled(name, runId);
}

/**
 * Get rollout status for all MCPs
 */
export function getRolloutStatus(): Array<{
  name: string;
  enabled: boolean;
  rollout: string;
  rolloutConfig: RolloutConfig | null;
}> {
  const mcps = getAllMcps();
  return mcps.map((mcp) => ({
    name: mcp.name,
    enabled: mcp.enabled,
    rollout: formatRolloutStatus(mcp.name),
    rolloutConfig: getRolloutConfig(mcp.name),
  }));
}

/**
 * Get rollout summary for system_health
 */
export function getRolloutSummary(): {
  total: number;
  enabled: number;
  canary: number;
  full: number;
  off: number;
  overlayActive: boolean;
  mcps: Array<{ name: string; mode: 'off' | 'canary' | 'full'; canaryPercent?: number }>;
} {
  const mcps = getAllMcps();
  let enabled = 0;
  let canary = 0;
  let full = 0;
  let off = 0;

  const mcpStatuses: Array<{ name: string; mode: 'off' | 'canary' | 'full'; canaryPercent?: number }> = [];

  // Check if overlay is active
  const overlayPath = process.env.TAISUN_INTERNAL_MCPS_OVERLAY_PATH;
  const overlayActive = !!overlayPath;

  for (const mcp of mcps) {
    if (!mcp.enabled) {
      off++;
      mcpStatuses.push({ name: mcp.name, mode: 'off' });
      continue;
    }
    enabled++;

    const rollout = getRolloutConfig(mcp.name);
    if (!rollout || rollout.mode === 'full') {
      full++;
      mcpStatuses.push({ name: mcp.name, mode: 'full' });
    } else if (rollout.mode === 'canary') {
      canary++;
      mcpStatuses.push({ name: mcp.name, mode: 'canary', canaryPercent: rollout.canaryPercent });
    } else {
      off++;
      mcpStatuses.push({ name: mcp.name, mode: 'off' });
    }
  }

  return { total: mcps.length, enabled, canary, full, off, overlayActive, mcps: mcpStatuses };
}
