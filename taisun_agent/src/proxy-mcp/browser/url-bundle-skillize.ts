/**
 * URL Bundle Skillize - P7.2
 *
 * Batch process URL bundle through skillize.
 * Rate-limited, dry-run by default, supervisor approval for writes.
 *
 * Input: refId pointing to normalized URL bundle
 * Output: summary + outputRefId with skillize results
 */

import { memoryAdd, memoryGetContent } from '../tools/memory';
import { MemoryNamespace } from '../memory/types';
import { recordEvent } from '../observability';
import { skillize } from '../skillize';
import { NormalizedUrl } from './url-bundle';

/** Memory content result data type */
interface MemoryContentData {
  id: string;
  content: string;
  contentLength: number;
}

/** Batch skillize configuration */
export interface BatchSkillizeConfig {
  /** Maximum URLs to process (default: 50) */
  maxUrls?: number;
  /** Rate limit delay between URLs in ms (default: 1000) */
  rateLimitMs?: number;
  /** Confirm write to disk (default: false = dry-run) */
  confirmWrite?: boolean;
  /** Template override (auto-detect if not specified) */
  template?: 'docs' | 'ecommerce' | 'internal-tool';
  /** Memory namespace for output (default: 'long-term') */
  namespace?: MemoryNamespace;
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
}

/** Default configuration */
export const DEFAULT_BATCH_SKILLIZE_CONFIG: Required<BatchSkillizeConfig> = {
  maxUrls: 50,
  rateLimitMs: 1000,
  confirmWrite: false,
  template: 'docs', // Will be overridden by auto-detect if not specified
  namespace: 'long-term',
  stopOnError: false,
};

/** Skillize result for a single URL */
export interface SkillizeUrlResult {
  url: string;
  success: boolean;
  refId?: string;
  skillName?: string;
  template?: string;
  error?: string;
}

/** Batch skillize result */
export interface BatchSkillizeResult {
  success: boolean;
  error?: string;
  outputRefId?: string;
  summary?: string;
  data?: {
    inputCount: number;
    processedCount: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    results: SkillizeUrlResult[];
    dryRun: boolean;
  };
}

/**
 * Batch skillize URL bundle
 *
 * Takes normalized URL bundle from memory, processes each URL through skillize,
 * stores results in memory, returns summary + outputRefId.
 *
 * @param inputRefId - Reference ID to normalized URL bundle in memory
 * @param config - Batch processing configuration
 * @returns Batch skillize result with outputRefId
 */
export async function batchSkillizeUrlBundle(
  inputRefId: string,
  config: Partial<BatchSkillizeConfig> = {}
): Promise<BatchSkillizeResult> {
  const fullConfig = { ...DEFAULT_BATCH_SKILLIZE_CONFIG, ...config };

  try {
    // Fetch normalized URL bundle from memory
    const memResult = await memoryGetContent(inputRefId);
    const memData = memResult.data as MemoryContentData | undefined;

    if (!memResult.success || !memData?.content) {
      return {
        success: false,
        error: `Failed to find URL bundle with refId: ${inputRefId}`,
      };
    }

    // Parse the normalized bundle
    let bundle: {
      urls?: NormalizedUrl[];
      domainGroups?: Array<{ domain: string; urls: NormalizedUrl[] }>;
    };

    try {
      bundle = JSON.parse(memData.content);
    } catch {
      return {
        success: false,
        error: 'Failed to parse URL bundle: invalid JSON',
      };
    }

    // Get URLs from bundle
    let urls: NormalizedUrl[] = [];

    if (bundle.urls && Array.isArray(bundle.urls)) {
      urls = bundle.urls;
    } else if (bundle.domainGroups && Array.isArray(bundle.domainGroups)) {
      // Flatten domain groups
      for (const group of bundle.domainGroups) {
        if (group.urls && Array.isArray(group.urls)) {
          urls.push(...group.urls);
        }
      }
    }

    if (urls.length === 0) {
      return {
        success: false,
        error: 'No URLs found in the bundle',
      };
    }

    // Apply max URL limit
    const urlsToProcess = urls.slice(0, fullConfig.maxUrls);
    const skippedCount = urls.length - urlsToProcess.length;

    // Process URLs with rate limiting
    const results: SkillizeUrlResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < urlsToProcess.length; i++) {
      const normalizedUrl = urlsToProcess[i];

      // Rate limiting (skip delay for first URL)
      if (i > 0 && fullConfig.rateLimitMs > 0) {
        await sleep(fullConfig.rateLimitMs);
      }

      try {
        const skillizeResult = await skillize(normalizedUrl.url, {
          confirmWrite: fullConfig.confirmWrite,
          namespace: fullConfig.namespace,
          // Only use template if explicitly provided, otherwise auto-detect
          template: config.template,
        });

        if (skillizeResult.success) {
          results.push({
            url: normalizedUrl.url,
            success: true,
            refId: skillizeResult.refId,
            skillName: skillizeResult.data?.skillName as string | undefined,
            template: skillizeResult.template,
          });
          successCount++;
        } else {
          results.push({
            url: normalizedUrl.url,
            success: false,
            error: skillizeResult.error,
          });
          failureCount++;

          if (fullConfig.stopOnError) {
            break;
          }
        }
      } catch (err) {
        results.push({
          url: normalizedUrl.url,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        failureCount++;

        if (fullConfig.stopOnError) {
          break;
        }
      }
    }

    // Store results in memory
    const outputData = {
      inputRefId,
      results,
      metadata: {
        inputCount: urls.length,
        processedCount: results.length,
        successCount,
        failureCount,
        skippedCount,
        dryRun: !fullConfig.confirmWrite,
        config: fullConfig,
        processedAt: new Date().toISOString(),
      },
    };

    const storeResult = await memoryAdd(
      JSON.stringify(outputData),
      fullConfig.namespace,
      {
        tags: ['url-bundle', 'skillize-batch', `success:${successCount}`, `fail:${failureCount}`],
        source: 'url-bundle.skillize',
      }
    );

    if (!storeResult.success) {
      return {
        success: false,
        error: `Failed to store results: ${storeResult.error}`,
      };
    }

    // Record observability event
    recordEvent('url_bundle_normalize', 'url-bundle-skillize', 'ok', {
      metadata: {
        inputCount: urls.length,
        processedCount: results.length,
        successCount,
        failureCount,
        dryRun: !fullConfig.confirmWrite,
      },
    });

    // Generate summary
    const successNames = results
      .filter((r) => r.success && r.skillName)
      .slice(0, 5)
      .map((r) => `  - ${r.skillName}`)
      .join('\n');

    const summary = `Batch Skillize ${fullConfig.confirmWrite ? '(WRITE)' : '(dry-run)'}:
Processed: ${results.length}/${urls.length} URLs
Success: ${successCount}, Failure: ${failureCount}${skippedCount > 0 ? `, Skipped: ${skippedCount}` : ''}

Generated skills:
${successNames || '  (none)'}${successCount > 5 ? '\n  ...' : ''}`;

    return {
      success: true,
      outputRefId: storeResult.referenceId,
      summary,
      data: {
        inputCount: urls.length,
        processedCount: results.length,
        successCount,
        failureCount,
        skippedCount,
        results,
        dryRun: !fullConfig.confirmWrite,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Batch skillize failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Sleep for given milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get batch skillize preview
 *
 * Returns preview of what would be processed without actually running skillize.
 *
 * @param inputRefId - Reference ID to normalized URL bundle
 * @param config - Configuration to apply
 */
export async function getBatchSkillizePreview(
  inputRefId: string,
  config: Partial<BatchSkillizeConfig> = {}
): Promise<{
  success: boolean;
  error?: string;
  preview?: {
    totalUrls: number;
    urlsToProcess: number;
    urlsToSkip: number;
    domains: Record<string, number>;
    estimatedTimeMs: number;
    config: Required<BatchSkillizeConfig>;
  };
}> {
  const fullConfig = { ...DEFAULT_BATCH_SKILLIZE_CONFIG, ...config };

  try {
    const memResult = await memoryGetContent(inputRefId);
    const memData = memResult.data as MemoryContentData | undefined;

    if (!memResult.success || !memData?.content) {
      return {
        success: false,
        error: `Failed to find URL bundle with refId: ${inputRefId}`,
      };
    }

    const bundle = JSON.parse(memData.content);
    let urls: NormalizedUrl[] = [];

    if (bundle.urls && Array.isArray(bundle.urls)) {
      urls = bundle.urls;
    } else if (bundle.domainGroups && Array.isArray(bundle.domainGroups)) {
      for (const group of bundle.domainGroups) {
        if (group.urls && Array.isArray(group.urls)) {
          urls.push(...group.urls);
        }
      }
    }

    const urlsToProcess = Math.min(urls.length, fullConfig.maxUrls);
    const urlsToSkip = urls.length - urlsToProcess;

    // Count by domain
    const domains: Record<string, number> = {};
    for (const url of urls.slice(0, fullConfig.maxUrls)) {
      domains[url.domain] = (domains[url.domain] || 0) + 1;
    }

    // Estimate time (rate limit + processing time ~2s per URL)
    const estimatedTimeMs = urlsToProcess * (fullConfig.rateLimitMs + 2000);

    return {
      success: true,
      preview: {
        totalUrls: urls.length,
        urlsToProcess,
        urlsToSkip,
        domains,
        estimatedTimeMs,
        config: fullConfig,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Preview failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
