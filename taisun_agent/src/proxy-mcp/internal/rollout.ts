/**
 * Rollout Logic for Canary Deployments
 *
 * Deterministic canary selection based on runId + mcpName hash
 */

import * as crypto from 'crypto';
import { RolloutConfig, getRolloutConfig } from './overlay';

/**
 * Check if an MCP is enabled for a given runId based on rollout config
 *
 * @param mcpName - Name of the internal MCP
 * @param runId - Run ID for deterministic canary selection
 * @returns true if the MCP should be enabled for this runId
 */
export function isRolloutEnabled(mcpName: string, runId: string): boolean {
  const rollout = getRolloutConfig(mcpName);

  // No rollout config = use base enabled state
  if (!rollout) {
    return true;
  }

  switch (rollout.mode) {
    case 'off':
      return false;

    case 'full':
      return true;

    case 'canary':
      return isInCanary(mcpName, runId, rollout);

    default:
      return true;
  }
}

/**
 * Deterministic canary selection
 *
 * Uses sha256 hash of runId:mcpName to generate a bucket (0-99)
 * Returns true if bucket < canaryPercent
 */
export function isInCanary(mcpName: string, runId: string, rollout: RolloutConfig): boolean {
  // Check allowlist first
  if (rollout.allowlist?.runIds?.includes(runId)) {
    return true;
  }

  const canaryPercent = rollout.canaryPercent ?? 0;
  if (canaryPercent <= 0) {
    return false;
  }
  if (canaryPercent >= 100) {
    return true;
  }

  const bucket = calculateBucket(mcpName, runId);
  return bucket < canaryPercent;
}

/**
 * Calculate deterministic bucket (0-99) from mcpName and runId
 */
export function calculateBucket(mcpName: string, runId: string): number {
  const input = `${runId}:${mcpName}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // Take first 8 hex chars and convert to number, then mod 100
  const hashValue = parseInt(hash.slice(0, 8), 16);
  return hashValue % 100;
}

/**
 * Get rollout status summary for all MCPs
 */
export function getRolloutSummary(): Record<string, { mode: string; percent?: number }> {
  // This would need to iterate over all MCPs, but for now return empty
  // as we don't have access to the full MCP list here
  return {};
}

/**
 * Format rollout status for display
 */
export function formatRolloutStatus(mcpName: string): string {
  const rollout = getRolloutConfig(mcpName);
  if (!rollout) {
    return 'default';
  }

  switch (rollout.mode) {
    case 'off':
      return 'off';
    case 'full':
      return 'full (100%)';
    case 'canary':
      return `canary (${rollout.canaryPercent ?? 0}%)`;
    default:
      return 'unknown';
  }
}
