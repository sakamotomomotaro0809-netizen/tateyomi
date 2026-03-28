/**
 * Hybrid Router - Combines rule-based and semantic routing
 *
 * Priority:
 * 1. Safety rules (deny/require_human)
 * 2. Semantic matching (find best MCP)
 * 3. Fallback (require_human_or_clarify)
 */

import { RouteResult, RouterConfig, InternalMcpDefinition } from './types';
import { evaluateSafetyRules, isDangerousOperation } from './rules';
import { findMatchingMcps } from './semantic';

const DEFAULT_CONFIG: RouterConfig = {
  ruleFirst: true,
  semanticThreshold: 0.7,
  topK: 5,
  fallback: 'require_clarify',
};

/**
 * Main routing function
 * Returns routing decision for a given input
 */
export function route(
  input: string,
  mcps: InternalMcpDefinition[],
  config: Partial<RouterConfig> = {}
): RouteResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Check safety rules first (if ruleFirst is enabled)
  if (cfg.ruleFirst) {
    const safetyResult = evaluateSafetyRules(input);
    if (safetyResult) {
      return safetyResult;
    }
  }

  // Step 2: Find matching MCPs using semantic similarity
  const candidates = findMatchingMcps(input, mcps, cfg.semanticThreshold, cfg.topK);

  if (candidates.length === 0) {
    // No matches above threshold
    return {
      action: cfg.fallback,
      reason: `No MCP matched with confidence >= ${cfg.semanticThreshold}. Please clarify or confirm the intended action.`,
      candidates: [],
      confidence: 0,
    };
  }

  const bestMatch = candidates[0];

  // Step 3: Check if the best match involves dangerous operations
  const matchedMcp = mcps.find((m) => m.name === bestMatch.name);
  if (matchedMcp && matchedMcp.dangerousOperations.length > 0) {
    const hasDangerousOp = isDangerousOperation(
      matchedMcp.name,
      input,
      matchedMcp.dangerousOperations
    );
    if (hasDangerousOp) {
      return {
        action: 'require_human',
        reason: `Operation may involve dangerous action for ${matchedMcp.name}. Human confirmation required.`,
        matchedRule: 'dangerous_operation',
        candidates,
        confidence: bestMatch.score,
      };
    }
  }

  // Step 4: Return the best match
  return {
    action: 'allow',
    reason: `Matched ${bestMatch.name} with confidence ${(bestMatch.score * 100).toFixed(1)}%`,
    candidates,
    confidence: bestMatch.score,
  };
}

/**
 * Quick check if input is safe (no safety rules triggered)
 */
export function isSafe(input: string): boolean {
  const result = evaluateSafetyRules(input);
  return result === null;
}

/**
 * Get routing explanation (for debugging/logging)
 */
export function explainRoute(
  input: string,
  mcps: InternalMcpDefinition[],
  config: Partial<RouterConfig> = {}
): string {
  const result = route(input, mcps, config);

  let explanation = `Input: "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}"\n`;
  explanation += `Action: ${result.action}\n`;
  explanation += `Reason: ${result.reason}\n`;

  if (result.candidates && result.candidates.length > 0) {
    explanation += `Candidates:\n`;
    for (const candidate of result.candidates) {
      explanation += `  - ${candidate.name}: ${(candidate.score * 100).toFixed(1)}% [${candidate.tags.join(', ')}]\n`;
    }
  }

  if (result.matchedRule) {
    explanation += `Matched Rule: ${result.matchedRule}\n`;
  }

  return explanation;
}

// Re-export types and utilities
export * from './types';
export { evaluateSafetyRules, getSafetyCategories, SAFETY_RULES } from './rules';
export { findMatchingMcps, findBestMatch, calculateSimilarity } from './semantic';
