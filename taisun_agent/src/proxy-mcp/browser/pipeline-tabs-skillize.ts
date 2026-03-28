/**
 * Pipeline: web_skillize_from_tabs - P7.3
 *
 * One-command pipeline: list_tabs_urls(CDP) -> normalize URL bundle -> batch skillize
 *
 * Features:
 * - Minimal output: summary + refId only (no URL lists in response)
 * - Dry-run default: confirmWrite=false
 * - CDP connection check with human-friendly error
 * - inputRefId option: skip tabs collection, use existing URL bundle
 * - All intermediate data stored in memory with refIds
 *
 * Output: pipeline-run record containing all intermediate refIds
 */

import { memoryAdd } from '../tools/memory';
import { MemoryNamespace } from '../memory/types';
import { recordEvent } from '../observability';
import { listTabsViaCDP } from './cdp';
import {
  normalizeUrlBundle as normalizeCore,
  UrlBundleConfig,
} from './url-bundle';
import {
  batchSkillizeUrlBundle as batchSkillizeCore,
  BatchSkillizeConfig,
} from './url-bundle-skillize';

/** Pipeline configuration */
export interface PipelineTabsSkillizeConfig {
  /** Skip tabs collection, use existing URL bundle refId */
  inputRefId?: string | null;
  /** Include only these domains */
  includeDomains?: string[] | null;
  /** Exclude these domains */
  excludeDomains?: string[] | null;
  /** Exclude URLs matching these patterns */
  excludeUrlPatterns?: string[] | null;
  /** Maximum URLs to process (default: 200) */
  maxUrls?: number;
  /** Per-domain limit (default: 50) */
  perDomainLimit?: number;
  /** Remove tracking parameters (default: true) */
  stripTracking?: boolean;
  /** Maximum URLs to fetch/skillize (default: 20) */
  maxFetch?: number;
  /** Concurrency for skillize (default: 3, but sequential for safety) */
  concurrency?: number;
  /** Rate limit between URLs in ms (default: 1000) */
  rateLimitMs?: number;
  /** Confirm write to disk (default: false = dry-run) */
  confirmWrite?: boolean;
  /** Memory namespace (default: 'long-term') */
  namespace?: MemoryNamespace;
}

/** Default configuration */
export const DEFAULT_PIPELINE_CONFIG: Required<Omit<PipelineTabsSkillizeConfig, 'inputRefId' | 'includeDomains' | 'excludeDomains' | 'excludeUrlPatterns'>> & {
  inputRefId: string | null;
  includeDomains: string[] | null;
  excludeDomains: string[] | null;
  excludeUrlPatterns: string[] | null;
} = {
  inputRefId: null,
  includeDomains: null,
  excludeDomains: null,
  excludeUrlPatterns: null,
  maxUrls: 200,
  perDomainLimit: 50,
  stripTracking: true,
  maxFetch: 20,
  concurrency: 3,
  rateLimitMs: 1000,
  confirmWrite: false,
  namespace: 'long-term',
};

/** Pipeline run record - stored in memory */
export interface PipelineRunRecord {
  pipelineId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  config: typeof DEFAULT_PIPELINE_CONFIG;
  stages: {
    tabs?: {
      refId: string;
      totalTabs: number;
      skipped?: boolean;
    };
    normalize?: {
      inputRefId: string;
      outputRefId: string;
      inputCount: number;
      outputCount: number;
      duplicatesRemoved: number;
    };
    skillize?: {
      inputRefId: string;
      outputRefId: string;
      processedCount: number;
      successCount: number;
      failureCount: number;
      dryRun: boolean;
    };
  };
  error?: string;
}

/** Pipeline result */
export interface PipelineResult {
  success: boolean;
  error?: string;
  refId?: string;
  summary?: string;
  requireHuman?: boolean;
  humanInstruction?: string;
}

/**
 * Run the full pipeline: tabs -> normalize -> skillize
 *
 * @param config Pipeline configuration
 * @returns Pipeline result with summary + refId
 */
export async function runPipelineTabsSkillize(
  config: Partial<PipelineTabsSkillizeConfig> = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fullConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };

  // Initialize run record
  const runRecord: PipelineRunRecord = {
    pipelineId,
    startedAt: new Date().toISOString(),
    status: 'running',
    config: fullConfig,
    stages: {},
  };

  try {
    let tabsRefId: string;
    let totalTabs = 0;

    // Stage 1: Get tabs (or use inputRefId)
    if (fullConfig.inputRefId) {
      // Skip tabs collection, use provided refId
      tabsRefId = fullConfig.inputRefId;
      runRecord.stages.tabs = {
        refId: tabsRefId,
        totalTabs: 0,
        skipped: true,
      };
    } else {
      // Collect tabs via CDP
      const tabsResult = await listTabsViaCDP();

      if (!tabsResult.success) {
        // CDP connection failed - return human-friendly error
        runRecord.status = 'failed';
        runRecord.error = tabsResult.error;
        await storeRunRecord(runRecord, fullConfig.namespace);

        return {
          success: false,
          error: tabsResult.error,
          requireHuman: true,
          humanInstruction: `Chrome CDP connection failed. Please ensure Chrome is running with debugging enabled:

1. Start Chrome with CDP:
   npm run chrome:debug:start

   Or manually:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222

2. Open the tabs you want to skillize

3. Run this pipeline again`,
        };
      }

      const tabsData = tabsResult.data!;
      totalTabs = tabsData.totalTabs;

      // Filter tabs by domain if configured
      let filteredTabs = tabsData.tabs;

      if (fullConfig.includeDomains && fullConfig.includeDomains.length > 0) {
        filteredTabs = filteredTabs.filter((tab) => {
          try {
            const hostname = new URL(tab.url).hostname;
            return fullConfig.includeDomains!.some((d) => hostname.includes(d));
          } catch {
            return false;
          }
        });
      }

      if (fullConfig.excludeDomains && fullConfig.excludeDomains.length > 0) {
        filteredTabs = filteredTabs.filter((tab) => {
          try {
            const hostname = new URL(tab.url).hostname;
            return !fullConfig.excludeDomains!.some((d) => hostname.includes(d));
          } catch {
            return true;
          }
        });
      }

      if (fullConfig.excludeUrlPatterns && fullConfig.excludeUrlPatterns.length > 0) {
        const patterns = fullConfig.excludeUrlPatterns.map((p) => new RegExp(p, 'i'));
        filteredTabs = filteredTabs.filter((tab) => {
          return !patterns.some((p) => p.test(tab.url));
        });
      }

      // Store tabs in memory
      const tabsMemResult = await memoryAdd(
        JSON.stringify({
          tabs: filteredTabs,
          totalTabs: filteredTabs.length,
          originalTotalTabs: totalTabs,
          collectedAt: new Date().toISOString(),
        }),
        fullConfig.namespace,
        {
          tags: ['pipeline', 'tabs', 'cdp'],
          source: 'pipeline.web_skillize_from_tabs',
        }
      );

      if (!tabsMemResult.success) {
        throw new Error(`Failed to store tabs: ${tabsMemResult.error}`);
      }

      tabsRefId = tabsMemResult.referenceId!;
      runRecord.stages.tabs = {
        refId: tabsRefId,
        totalTabs: filteredTabs.length,
      };
    }

    // Stage 2: Normalize URL bundle
    const normalizeConfig: Partial<UrlBundleConfig> = {
      maxUrls: fullConfig.maxUrls,
      removeUtm: fullConfig.stripTracking,
      normalizeTrailingSlash: true,
      groupByDomain: true,
      namespace: fullConfig.namespace,
    };

    const normalizeResult = await normalizeCore(tabsRefId, normalizeConfig);

    if (!normalizeResult.success) {
      throw new Error(`Normalize failed: ${normalizeResult.error}`);
    }

    runRecord.stages.normalize = {
      inputRefId: tabsRefId,
      outputRefId: normalizeResult.outputRefId!,
      inputCount: normalizeResult.data?.inputCount || 0,
      outputCount: normalizeResult.data?.outputCount || 0,
      duplicatesRemoved: normalizeResult.data?.duplicatesRemoved || 0,
    };

    // Stage 3: Batch skillize
    const skillizeConfig: Partial<BatchSkillizeConfig> = {
      maxUrls: fullConfig.maxFetch,
      rateLimitMs: fullConfig.rateLimitMs,
      confirmWrite: fullConfig.confirmWrite,
      namespace: fullConfig.namespace,
      stopOnError: false,
    };

    const skillizeResult = await batchSkillizeCore(
      normalizeResult.outputRefId!,
      skillizeConfig
    );

    if (!skillizeResult.success) {
      throw new Error(`Skillize failed: ${skillizeResult.error}`);
    }

    runRecord.stages.skillize = {
      inputRefId: normalizeResult.outputRefId!,
      outputRefId: skillizeResult.outputRefId!,
      processedCount: skillizeResult.data?.processedCount || 0,
      successCount: skillizeResult.data?.successCount || 0,
      failureCount: skillizeResult.data?.failureCount || 0,
      dryRun: skillizeResult.data?.dryRun ?? true,
    };

    // Complete run record
    runRecord.status = 'completed';
    runRecord.completedAt = new Date().toISOString();

    const runRefId = await storeRunRecord(runRecord, fullConfig.namespace);

    // Record observability event
    const durationMs = Date.now() - startTime;
    recordEvent('pipeline_tabs_skillize', 'pipeline', 'ok', {
      metadata: {
        pipelineId,
        durationMs,
        tabsCount: runRecord.stages.tabs?.totalTabs || 0,
        normalizedCount: runRecord.stages.normalize?.outputCount || 0,
        skillizedCount: runRecord.stages.skillize?.successCount || 0,
        dryRun: fullConfig.confirmWrite === false,
      },
    });

    // Generate summary
    const summary = generatePipelineSummary(runRecord, durationMs);

    return {
      success: true,
      refId: runRefId,
      summary,
    };
  } catch (err) {
    runRecord.status = 'failed';
    runRecord.error = err instanceof Error ? err.message : String(err);

    await storeRunRecord(runRecord, fullConfig.namespace);

    const durationMs = Date.now() - startTime;
    recordEvent('pipeline_tabs_skillize', 'pipeline', 'fail', {
      metadata: {
        pipelineId,
        durationMs,
        error: runRecord.error,
      },
    });

    return {
      success: false,
      error: `Pipeline failed: ${runRecord.error}`,
    };
  }
}

/**
 * Store pipeline run record in memory
 */
async function storeRunRecord(
  record: PipelineRunRecord,
  namespace: MemoryNamespace
): Promise<string> {
  const memResult = await memoryAdd(
    JSON.stringify(record),
    namespace,
    {
      tags: ['pipeline', 'run-record', record.status],
      source: 'pipeline.web_skillize_from_tabs',
    }
  );

  if (!memResult.success) {
    throw new Error(`Failed to store run record: ${memResult.error}`);
  }

  return memResult.referenceId!;
}

/**
 * Generate pipeline summary
 */
function generatePipelineSummary(
  record: PipelineRunRecord,
  durationMs: number
): string {
  const tabs = record.stages.tabs;
  const normalize = record.stages.normalize;
  const skillize = record.stages.skillize;

  const dryRunNote = skillize?.dryRun
    ? ' (DRY-RUN - use confirmWrite=true to write)'
    : ' (WRITTEN)';

  const lines = [
    `Pipeline: web_skillize_from_tabs${dryRunNote}`,
    `Duration: ${Math.round(durationMs / 1000)}s`,
    '',
    'Stages:',
  ];

  if (tabs) {
    if (tabs.skipped) {
      lines.push(`  1. Tabs: skipped (using inputRefId)`);
    } else {
      lines.push(`  1. Tabs: ${tabs.totalTabs} collected`);
    }
  }

  if (normalize) {
    lines.push(`  2. Normalize: ${normalize.inputCount} -> ${normalize.outputCount} URLs (${normalize.duplicatesRemoved} duplicates removed)`);
  }

  if (skillize) {
    lines.push(`  3. Skillize: ${skillize.successCount}/${skillize.processedCount} success`);
    if (skillize.failureCount > 0) {
      lines.push(`     (${skillize.failureCount} failures)`);
    }
  }

  lines.push('');
  lines.push(`Use memory_search with refId to inspect intermediate results.`);

  return lines.join('\n');
}
