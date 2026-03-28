/**
 * Semantic Router - Find matching MCPs based on meaning similarity
 *
 * Uses a simple TF-IDF-like approach for MVP.
 * Can be replaced with embedding-based similarity later.
 */

import { McpCandidate, InternalMcpDefinition } from './types';

/**
 * Tokenize and normalize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

// Note: termFrequency is reserved for future embedding-based similarity
// function termFrequency(token: string, tokens: string[]): number {
//   const count = tokens.filter((t) => t === token).length;
//   return count / tokens.length;
// }

/**
 * Calculate similarity score between query and MCP
 * Uses a combination of:
 * - Tag matching (high weight)
 * - Description token overlap (medium weight)
 * - Name matching (low weight)
 */
export function calculateSimilarity(query: string, mcp: InternalMcpDefinition): number {
  const queryTokens = tokenize(query);
  const descTokens = tokenize(mcp.shortDescription);
  const nameTokens = tokenize(mcp.name);
  // Note: allMcpTokens reserved for future embedding-based similarity
  // const allMcpTokens = [...descTokens, ...nameTokens, ...mcp.tags.map((t) => t.toLowerCase())];

  if (queryTokens.length === 0) {
    return 0;
  }

  let score = 0;

  // Tag matching (weight: 0.5)
  const tagMatches = queryTokens.filter((token) =>
    mcp.tags.some((tag) => tag.toLowerCase().includes(token) || token.includes(tag.toLowerCase()))
  );
  score += (tagMatches.length / queryTokens.length) * 0.5;

  // Description token overlap (weight: 0.35)
  const descMatches = queryTokens.filter((token) =>
    descTokens.some((dt) => dt.includes(token) || token.includes(dt))
  );
  score += (descMatches.length / queryTokens.length) * 0.35;

  // Name matching (weight: 0.15)
  const nameMatches = queryTokens.filter((token) =>
    nameTokens.some((nt) => nt.includes(token) || token.includes(nt))
  );
  score += (nameMatches.length / queryTokens.length) * 0.15;

  // Boost for exact tag matches
  const exactTagMatches = queryTokens.filter((token) =>
    mcp.tags.some((tag) => tag.toLowerCase() === token)
  );
  if (exactTagMatches.length > 0) {
    score += 0.2;
  }

  // Boost for MCP name appearing in query
  if (query.toLowerCase().includes(mcp.name.toLowerCase())) {
    score += 0.3;
  }

  return Math.min(score, 1.0);
}

/**
 * Find matching MCPs based on semantic similarity
 */
export function findMatchingMcps(
  query: string,
  mcps: InternalMcpDefinition[],
  threshold: number,
  topK: number
): McpCandidate[] {
  const candidates: McpCandidate[] = [];

  // Only consider enabled MCPs
  const enabledMcps = mcps.filter((mcp) => mcp.enabled);

  for (const mcp of enabledMcps) {
    const score = calculateSimilarity(query, mcp);

    if (score >= threshold) {
      candidates.push({
        name: mcp.name,
        score,
        shortDescription: mcp.shortDescription,
        tags: mcp.tags,
      });
    }
  }

  // Sort by score (highest first) and take top K
  return candidates.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Find best matching MCP
 */
export function findBestMatch(
  query: string,
  mcps: InternalMcpDefinition[],
  threshold: number
): McpCandidate | null {
  const candidates = findMatchingMcps(query, mcps, threshold, 1);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Normalize MCP description for indexing (future use with embeddings)
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
