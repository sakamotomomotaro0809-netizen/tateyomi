/**
 * Web Skills - Browser automation skills for M4/P7
 *
 * Skills:
 * - web.read_url: Read URL and summarize (full content to refId)
 * - web.extract_links: Extract page links (large lists to refId)
 * - web.capture_dom_map: Capture DOM structure (map to refId)
 * - web.list_tabs_urls: List all open tab URLs via CDP
 * - url.normalize_bundle: Normalize URL bundle (refId → refId)
 *
 * Backends:
 * - default: Uses chrome MCP (puppeteer)
 * - cdp: Uses Playwright CDP to connect to existing Chrome (P7)
 *
 * All output follows minimal output principle: summary + refId
 */

import { WebSkillResult, PageLink, DomMap } from './types';
import { guardCaptcha, checkBlockedPatterns } from './captcha';
import { getClient } from '../internal/mcp-client';
import { memoryAdd } from '../tools/memory';
import { MemoryNamespace } from '../memory/types';
import {
  readUrlViaCDP,
  extractLinksViaCDP,
  captureDOMMapViaCDP,
  listTabsViaCDP,
} from './cdp';
import {
  normalizeUrlBundle as normalizeUrlBundleCore,
  getUrlBundleStats as getUrlBundleStatsCore,
  UrlBundleConfig,
} from './url-bundle';
import {
  batchSkillizeUrlBundle as batchSkillizeCore,
  getBatchSkillizePreview as getBatchSkillizePreviewCore,
  BatchSkillizeConfig,
} from './url-bundle-skillize';
import {
  runPipelineTabsSkillize as runPipelineCore,
  PipelineTabsSkillizeConfig,
} from './pipeline-tabs-skillize';

/** Backend type for web skills */
export type WebBackend = 'default' | 'cdp';

/**
 * web.read_url - Read URL and summarize
 *
 * Opens URL, extracts text content, checks for CAPTCHA,
 * stores full content in memory, returns summary + refId
 *
 * @param url - URL to read
 * @param options.backend - 'default' (puppeteer) or 'cdp' (Playwright CDP)
 * @param options.namespace - Memory namespace for storage
 * @param options.maxLength - Max content length
 */
export async function readUrl(
  url: string,
  options?: {
    backend?: WebBackend;
    namespace?: MemoryNamespace;
    maxLength?: number;
  }
): Promise<WebSkillResult> {
  // Check for blocked patterns (login, auth, etc.)
  const blocked = checkBlockedPatterns(url);
  if (blocked) return blocked;

  const backend = options?.backend || 'default';
  const namespace = options?.namespace || 'short-term';
  const maxLength = options?.maxLength || 50000;

  // Use CDP backend if specified
  if (backend === 'cdp') {
    return readUrlViaCDPWithMemory(url, namespace, maxLength);
  }

  try {
    // Try to use chrome MCP (default backend)
    const client = getClient('chrome');
    if (!client || !client.isAvailable()) {
      return {
        success: false,
        error: 'Chrome MCP not available. Ensure it is enabled and mcp-server-puppeteer is installed.',
        data: {
          help: [
            '1. Check config/proxy-mcp/internal-mcps.json - chrome.enabled should be true',
            '2. Install puppeteer MCP: npx -y @anthropic/mcp-server-puppeteer',
            '3. Ensure Chrome/Chromium is available on the system',
          ],
        },
      };
    }

    // Start client if needed
    await client.start();

    // Navigate to URL and get content
    let pageContent: string;
    let pageTitle: string;

    try {
      // Navigate
      await client.callTool('puppeteer_navigate', { url });

      // Get page content
      const evalResult = (await client.callTool('puppeteer_evaluate', {
        script: `
          JSON.stringify({
            title: document.title,
            text: document.body.innerText.substring(0, ${maxLength}),
            html: document.documentElement.outerHTML.substring(0, ${maxLength})
          })
        `,
      })) as { result?: string };

      const parsed = JSON.parse(evalResult.result || '{}');
      pageTitle = parsed.title || 'Untitled';
      pageContent = parsed.text || '';
    } catch (err) {
      // Fallback: try simple fetch if MCP call fails
      return {
        success: false,
        error: `Failed to load page: ${err instanceof Error ? err.message : String(err)}`,
        data: {
          url,
          suggestion: 'Try accessing the URL directly or check if the site is accessible.',
        },
      };
    }

    // Check for CAPTCHA
    const captchaCheck = guardCaptcha(pageContent, url);
    if (captchaCheck) return captchaCheck;

    // Store full content in memory
    const memResult = await memoryAdd(
      JSON.stringify({
        url,
        title: pageTitle,
        content: pageContent,
        fetchedAt: new Date().toISOString(),
      }),
      namespace,
      {
        tags: ['web', 'page-content', new URL(url).hostname],
        source: 'web.read_url',
      }
    );

    if (!memResult.success) {
      return {
        success: false,
        error: `Failed to store content: ${memResult.error}`,
      };
    }

    // Generate summary
    const summary = generateSummary(pageTitle, pageContent, url);

    return {
      success: true,
      action: 'allow',
      refId: memResult.referenceId,
      summary,
      data: {
        url,
        title: pageTitle,
        contentLength: pageContent.length,
        message: `Page loaded. Use memory_search("${memResult.referenceId}") for full content.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `web.read_url failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * web.extract_links - Extract page links
 *
 * Extracts all links from page, stores full list in memory,
 * returns summary with link count + refId
 *
 * @param url - URL to extract links from
 * @param options.backend - 'default' (puppeteer) or 'cdp' (Playwright CDP)
 * @param options.namespace - Memory namespace for storage
 * @param options.filter - 'internal', 'external', or 'all'
 */
export async function extractLinks(
  url: string,
  options?: {
    backend?: WebBackend;
    namespace?: MemoryNamespace;
    filter?: 'internal' | 'external' | 'all';
  }
): Promise<WebSkillResult> {
  const blocked = checkBlockedPatterns(url);
  if (blocked) return blocked;

  const backend = options?.backend || 'default';
  const namespace = options?.namespace || 'short-term';
  const filter = options?.filter || 'all';

  // Use CDP backend if specified
  if (backend === 'cdp') {
    return extractLinksViaCDPWithMemory(url, namespace, filter);
  }

  try {
    const client = getClient('chrome');
    if (!client || !client.isAvailable()) {
      return {
        success: false,
        error: 'Chrome MCP not available.',
        data: {
          help: ['Enable chrome in config/proxy-mcp/internal-mcps.json'],
        },
      };
    }

    await client.start();

    // Navigate and extract links
    let links: PageLink[];

    try {
      await client.callTool('puppeteer_navigate', { url });

      const evalResult = (await client.callTool('puppeteer_evaluate', {
        script: `
          JSON.stringify(
            Array.from(document.querySelectorAll('a[href]')).map(a => ({
              href: a.href,
              text: a.innerText.trim().substring(0, 200),
              title: a.title || undefined
            })).filter(l => l.href && l.href.startsWith('http'))
          )
        `,
      })) as { result?: string };

      links = JSON.parse(evalResult.result || '[]');
    } catch (err) {
      return {
        success: false,
        error: `Failed to extract links: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Check for CAPTCHA in link texts
    const allText = links.map((l) => l.text).join(' ');
    const captchaCheck = guardCaptcha(allText, url);
    if (captchaCheck) return captchaCheck;

    // Filter links
    const baseHost = new URL(url).hostname;
    let filteredLinks = links;
    if (filter === 'internal') {
      filteredLinks = links.filter((l) => {
        try {
          return new URL(l.href).hostname === baseHost;
        } catch {
          return false;
        }
      });
    } else if (filter === 'external') {
      filteredLinks = links.filter((l) => {
        try {
          return new URL(l.href).hostname !== baseHost;
        } catch {
          return false;
        }
      });
    }

    // Store full link list in memory
    const memResult = await memoryAdd(
      JSON.stringify({
        url,
        filter,
        links: filteredLinks,
        extractedAt: new Date().toISOString(),
      }),
      namespace,
      {
        tags: ['web', 'links', baseHost],
        source: 'web.extract_links',
      }
    );

    if (!memResult.success) {
      return {
        success: false,
        error: `Failed to store links: ${memResult.error}`,
      };
    }

    // Summary with top 5 links
    const topLinks = filteredLinks.slice(0, 5).map((l) => `- ${l.text || l.href}`);
    const summary = `Extracted ${filteredLinks.length} ${filter} links from ${baseHost}.\nTop links:\n${topLinks.join('\n')}${filteredLinks.length > 5 ? '\n...' : ''}`;

    return {
      success: true,
      action: 'allow',
      refId: memResult.referenceId,
      summary,
      data: {
        url,
        linkCount: filteredLinks.length,
        filter,
        message: `Use memory_search("${memResult.referenceId}") for full link list.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `web.extract_links failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * web.capture_dom_map - Capture DOM structure
 *
 * Analyzes page DOM structure, identifies major components,
 * stores full map in memory, returns summary + refId
 *
 * @param url - URL to capture DOM from
 * @param options.backend - 'default' (puppeteer) or 'cdp' (Playwright CDP)
 * @param options.namespace - Memory namespace for storage
 */
export async function captureDomMap(
  url: string,
  options?: {
    backend?: WebBackend;
    namespace?: MemoryNamespace;
  }
): Promise<WebSkillResult> {
  const blocked = checkBlockedPatterns(url);
  if (blocked) return blocked;

  const backend = options?.backend || 'default';
  const namespace = options?.namespace || 'short-term';

  // Use CDP backend if specified
  if (backend === 'cdp') {
    return captureDomMapViaCDPWithMemory(url, namespace);
  }

  try {
    const client = getClient('chrome');
    if (!client || !client.isAvailable()) {
      return {
        success: false,
        error: 'Chrome MCP not available.',
      };
    }

    await client.start();

    // Navigate and analyze DOM
    let domMap: DomMap;

    try {
      await client.callTool('puppeteer_navigate', { url });

      const evalResult = (await client.callTool('puppeteer_evaluate', {
        script: `
          (function() {
            const components = [];
            const selectors = [
              { selector: 'header', type: 'header' },
              { selector: 'nav', type: 'nav' },
              { selector: 'main', type: 'main' },
              { selector: 'article', type: 'article' },
              { selector: 'section', type: 'section' },
              { selector: 'form', type: 'form' },
              { selector: 'ul, ol', type: 'list' },
              { selector: '[class*="card"], [class*="Card"]', type: 'card' },
              { selector: 'footer', type: 'footer' },
            ];

            for (const { selector, type } of selectors) {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el, i) => {
                components.push({
                  type,
                  selector: selector + (elements.length > 1 ? ':nth-of-type(' + (i+1) + ')' : ''),
                  text: el.innerText.substring(0, 100),
                  children: el.children.length
                });
              });
            }

            return JSON.stringify({
              url: window.location.href,
              title: document.title,
              components: components.slice(0, 50)
            });
          })()
        `,
      })) as { result?: string };

      domMap = JSON.parse(evalResult.result || '{}');
    } catch (err) {
      return {
        success: false,
        error: `Failed to capture DOM: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Check for CAPTCHA in component texts
    const allText = domMap.components.map((c) => c.text || '').join(' ');
    const captchaCheck = guardCaptcha(allText, url);
    if (captchaCheck) return captchaCheck;

    // Store DOM map in memory
    const memResult = await memoryAdd(
      JSON.stringify({
        ...domMap,
        capturedAt: new Date().toISOString(),
      }),
      namespace,
      {
        tags: ['web', 'dom-map', new URL(url).hostname],
        source: 'web.capture_dom_map',
      }
    );

    if (!memResult.success) {
      return {
        success: false,
        error: `Failed to store DOM map: ${memResult.error}`,
      };
    }

    // Summary
    const typeCounts = domMap.components.reduce(
      (acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const summary = `DOM map for ${domMap.title || url}:\n${Object.entries(typeCounts)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n')}`;

    return {
      success: true,
      action: 'allow',
      refId: memResult.referenceId,
      summary,
      data: {
        url,
        title: domMap.title,
        componentsCount: domMap.components.length,
        typeCounts,
        message: `Use memory_search("${memResult.referenceId}") for full DOM map.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `web.capture_dom_map failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Generate summary from page content
 */
function generateSummary(title: string, content: string, url: string): string {
  const hostname = new URL(url).hostname;
  const preview = content.slice(0, 300).replace(/\s+/g, ' ').trim();
  return `${title} (${hostname})\n\n${preview}${content.length > 300 ? '...' : ''}`;
}

// ============================================
// CDP Backend Helper Functions
// ============================================

/**
 * Read URL via CDP with memory storage
 */
async function readUrlViaCDPWithMemory(
  url: string,
  namespace: MemoryNamespace,
  maxLength: number
): Promise<WebSkillResult> {
  const result = await readUrlViaCDP(url);

  if (!result.success) {
    if (result.requireHuman) {
      return {
        success: false,
        action: 'require_human',
        error: result.error,
        data: {
          reason: result.humanReason,
          instruction: 'Please resolve CAPTCHA/login in Chrome, then retry.',
        },
      };
    }
    return {
      success: false,
      error: result.error,
    };
  }

  const pageData = result.data!;
  const content = pageData.content.substring(0, maxLength);

  // Store full content in memory
  const memResult = await memoryAdd(
    JSON.stringify({
      url: pageData.url,
      title: pageData.title,
      content,
      fetchedAt: new Date().toISOString(),
      backend: 'cdp',
    }),
    namespace,
    {
      tags: ['web', 'page-content', new URL(url).hostname, 'cdp'],
      source: 'web.read_url',
    }
  );

  if (!memResult.success) {
    return {
      success: false,
      error: `Failed to store content: ${memResult.error}`,
    };
  }

  const summary = generateSummary(pageData.title, content, pageData.url);

  return {
    success: true,
    action: 'allow',
    refId: memResult.referenceId,
    summary,
    data: {
      url: pageData.url,
      title: pageData.title,
      contentLength: content.length,
      backend: 'cdp',
      message: `Page loaded via CDP. Use memory_search("${memResult.referenceId}") for full content.`,
    },
  };
}

/**
 * Extract links via CDP with memory storage
 */
async function extractLinksViaCDPWithMemory(
  url: string,
  namespace: MemoryNamespace,
  filter: 'internal' | 'external' | 'all'
): Promise<WebSkillResult> {
  const result = await extractLinksViaCDP(url);

  if (!result.success) {
    if (result.requireHuman) {
      return {
        success: false,
        action: 'require_human',
        error: result.error,
        data: {
          reason: result.humanReason,
          instruction: 'Please resolve CAPTCHA/login in Chrome, then retry.',
        },
      };
    }
    return {
      success: false,
      error: result.error,
    };
  }

  const linkData = result.data!;

  // Filter links
  const baseHost = new URL(url).hostname;
  let filteredLinks = linkData.links;
  if (filter === 'internal') {
    filteredLinks = linkData.links.filter((l) => {
      try {
        return new URL(l.href).hostname === baseHost;
      } catch {
        return false;
      }
    });
  } else if (filter === 'external') {
    filteredLinks = linkData.links.filter((l) => {
      try {
        return new URL(l.href).hostname !== baseHost;
      } catch {
        return false;
      }
    });
  }

  // Store full link list in memory
  const memResult = await memoryAdd(
    JSON.stringify({
      url: linkData.url,
      filter,
      links: filteredLinks,
      extractedAt: new Date().toISOString(),
      backend: 'cdp',
    }),
    namespace,
    {
      tags: ['web', 'links', baseHost, 'cdp'],
      source: 'web.extract_links',
    }
  );

  if (!memResult.success) {
    return {
      success: false,
      error: `Failed to store links: ${memResult.error}`,
    };
  }

  // Summary with top 5 links
  const topLinks = filteredLinks.slice(0, 5).map((l) => `- ${l.text || l.href}`);
  const summary = `Extracted ${filteredLinks.length} ${filter} links from ${baseHost} (CDP).\nTop links:\n${topLinks.join('\n')}${filteredLinks.length > 5 ? '\n...' : ''}`;

  return {
    success: true,
    action: 'allow',
    refId: memResult.referenceId,
    summary,
    data: {
      url: linkData.url,
      linkCount: filteredLinks.length,
      filter,
      backend: 'cdp',
      message: `Use memory_search("${memResult.referenceId}") for full link list.`,
    },
  };
}

/**
 * Capture DOM map via CDP with memory storage
 */
async function captureDomMapViaCDPWithMemory(
  url: string,
  namespace: MemoryNamespace
): Promise<WebSkillResult> {
  const result = await captureDOMMapViaCDP(url);

  if (!result.success) {
    if (result.requireHuman) {
      return {
        success: false,
        action: 'require_human',
        error: result.error,
        data: {
          reason: result.humanReason,
          instruction: 'Please resolve CAPTCHA/login in Chrome, then retry.',
        },
      };
    }
    return {
      success: false,
      error: result.error,
    };
  }

  const domData = result.data!;

  // Store DOM map in memory
  const memResult = await memoryAdd(
    JSON.stringify({
      url: domData.url,
      title: domData.title,
      elements: domData.elements,
      totalElements: domData.totalElements,
      capturedAt: new Date().toISOString(),
      backend: 'cdp',
    }),
    namespace,
    {
      tags: ['web', 'dom-map', new URL(url).hostname, 'cdp'],
      source: 'web.capture_dom_map',
    }
  );

  if (!memResult.success) {
    return {
      success: false,
      error: `Failed to store DOM map: ${memResult.error}`,
    };
  }

  // Build summary from elements
  const tagCounts: Record<string, number> = {};
  const countTags = (elements: Array<{ tag: string; children?: unknown[] }>): void => {
    for (const el of elements) {
      tagCounts[el.tag] = (tagCounts[el.tag] || 0) + 1;
      if (el.children && Array.isArray(el.children)) {
        countTags(el.children as Array<{ tag: string; children?: unknown[] }>);
      }
    }
  };
  countTags(domData.elements);

  const summary = `DOM map for ${domData.title || url} (CDP):\n${Object.entries(tagCounts)
    .slice(0, 10)
    .map(([tag, count]) => `- ${tag}: ${count}`)
    .join('\n')}${Object.keys(tagCounts).length > 10 ? '\n...' : ''}`;

  return {
    success: true,
    action: 'allow',
    refId: memResult.referenceId,
    summary,
    data: {
      url: domData.url,
      title: domData.title,
      totalElements: domData.totalElements,
      backend: 'cdp',
      message: `Use memory_search("${memResult.referenceId}") for full DOM map.`,
    },
  };
}

/**
 * web.list_tabs_urls - List all open tab URLs via CDP
 *
 * Lists all open tabs in the connected Chrome browser.
 * Stores full list in memory, returns summary + refId.
 * CDP-only skill (requires Chrome running with --remote-debugging-port).
 *
 * @param options.namespace - Memory namespace for storage
 */
export async function listTabsUrls(
  options?: {
    namespace?: MemoryNamespace;
  }
): Promise<WebSkillResult> {
  const namespace = options?.namespace || 'short-term';

  try {
    const result = await listTabsViaCDP();

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: {
          help: [
            'Ensure Chrome is running with CDP enabled:',
            'npm run chrome:debug:start',
            'or: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222',
          ],
        },
      };
    }

    const tabsData = result.data!;

    // Store full tab list in memory
    const memResult = await memoryAdd(
      JSON.stringify({
        tabs: tabsData.tabs,
        totalTabs: tabsData.totalTabs,
        listedAt: new Date().toISOString(),
        backend: 'cdp',
      }),
      namespace,
      {
        tags: ['web', 'tabs', 'cdp'],
        source: 'web.list_tabs_urls',
      }
    );

    if (!memResult.success) {
      return {
        success: false,
        error: `Failed to store tabs: ${memResult.error}`,
      };
    }

    // Summary with top tabs
    const topTabs = tabsData.tabsPreview
      .slice(0, 5)
      .map((t) => `- [${t.index}] ${t.title || t.url}`);

    const summary = `Found ${tabsData.totalTabs} open tabs:\n${topTabs.join('\n')}${tabsData.totalTabs > 5 ? '\n...' : ''}`;

    return {
      success: true,
      action: 'allow',
      refId: memResult.referenceId,
      summary,
      data: {
        totalTabs: tabsData.totalTabs,
        tabs: tabsData.tabsPreview,
        backend: 'cdp',
        message: `Use memory_search("${memResult.referenceId}") for full tab list.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `web.list_tabs_urls failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * url.normalize_bundle - Normalize URL bundle
 *
 * Takes an input refId pointing to URL list in memory,
 * normalizes (dedup, UTM removal, trailing slash), groups by domain,
 * stores result in memory, returns summary + outputRefId.
 *
 * Input formats supported:
 * - JSON array of URLs: ["url1", "url2"]
 * - JSON array of objects: [{ url: "url1" }, { href: "url2" }]
 * - JSON object with urls/tabs/links array
 * - Newline-separated URLs
 * - Comma-separated URLs
 *
 * @param inputRefId - Memory refId pointing to URL list
 * @param options.maxUrls - Maximum URLs to process (default: 200)
 * @param options.removeUtm - Remove UTM parameters (default: true)
 * @param options.normalizeTrailingSlash - Normalize trailing slashes (default: true)
 * @param options.groupByDomain - Group results by domain (default: true)
 * @param options.namespace - Memory namespace for output (default: 'short-term')
 */
export async function normalizeUrlBundle(
  inputRefId: string,
  options?: Partial<UrlBundleConfig>
): Promise<WebSkillResult> {
  try {
    const result = await normalizeUrlBundleCore(inputRefId, options);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'allow',
      refId: result.outputRefId,
      summary: result.summary,
      data: {
        inputRefId,
        outputRefId: result.outputRefId,
        inputCount: result.data?.inputCount,
        outputCount: result.data?.outputCount,
        duplicatesRemoved: result.data?.duplicatesRemoved,
        removedCount: result.data?.removedCount,
        domainGroups: result.data?.domainGroups,
        message: `Use memory_search("${result.outputRefId}") for normalized URL list.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `url.normalize_bundle failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * url.get_bundle_stats - Get URL bundle statistics
 *
 * Returns statistics about a URL bundle without processing.
 * Useful for preview before normalization.
 *
 * @param inputRefId - Memory refId pointing to URL list
 * @param options.namespace - Memory namespace (default: 'short-term')
 */
export async function getUrlBundleStats(
  inputRefId: string,
  options?: {
    namespace?: MemoryNamespace;
  }
): Promise<WebSkillResult> {
  try {
    const result = await getUrlBundleStatsCore(inputRefId, options?.namespace);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    const stats = result.stats!;
    const topDomainsStr = stats.topDomains
      .slice(0, 5)
      .map((d) => `  - ${d.domain}: ${d.count}`)
      .join('\n');

    const summary = `URL Bundle Stats:\n- Total URLs: ${stats.totalUrls}\n- Unique domains: ${stats.uniqueDomains}\nTop domains:\n${topDomainsStr}`;

    return {
      success: true,
      action: 'allow',
      summary,
      data: {
        inputRefId,
        totalUrls: stats.totalUrls,
        uniqueDomains: stats.uniqueDomains,
        topDomains: stats.topDomains,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `url.get_bundle_stats failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * url.batch_skillize - Batch skillize URL bundle
 *
 * Takes a normalized URL bundle (refId), runs skillize on each URL,
 * stores results in memory, returns summary + outputRefId.
 *
 * IMPORTANT: dry-run by default (confirmWrite=false).
 * Use confirmWrite=true only after preview/approval.
 *
 * @param inputRefId - Memory refId pointing to normalized URL bundle
 * @param options.maxUrls - Maximum URLs to process (default: 50)
 * @param options.rateLimitMs - Delay between URLs in ms (default: 1000)
 * @param options.confirmWrite - Write to disk (default: false = dry-run)
 * @param options.template - Force template type (auto-detect if not specified)
 * @param options.namespace - Memory namespace (default: 'long-term')
 * @param options.stopOnError - Stop on first error (default: false)
 */
export async function batchSkillizeUrlBundle(
  inputRefId: string,
  options?: Partial<BatchSkillizeConfig>
): Promise<WebSkillResult> {
  try {
    const result = await batchSkillizeCore(inputRefId, options);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'allow',
      refId: result.outputRefId,
      summary: result.summary,
      data: {
        inputRefId,
        outputRefId: result.outputRefId,
        inputCount: result.data?.inputCount,
        processedCount: result.data?.processedCount,
        successCount: result.data?.successCount,
        failureCount: result.data?.failureCount,
        skippedCount: result.data?.skippedCount,
        dryRun: result.data?.dryRun,
        message: result.data?.dryRun
          ? `Dry-run complete. Use confirmWrite=true to write. Use memory_search("${result.outputRefId}") for results.`
          : `Skills written. Use memory_search("${result.outputRefId}") for results.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `url.batch_skillize failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * url.batch_skillize_preview - Preview batch skillize
 *
 * Returns preview of what would be processed without running skillize.
 * Use this before batchSkillizeUrlBundle to verify config.
 *
 * @param inputRefId - Memory refId pointing to normalized URL bundle
 * @param options - Configuration to preview
 */
export async function batchSkillizePreview(
  inputRefId: string,
  options?: Partial<BatchSkillizeConfig>
): Promise<WebSkillResult> {
  try {
    const result = await getBatchSkillizePreviewCore(inputRefId, options);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    const preview = result.preview!;
    const domains = Object.entries(preview.domains)
      .slice(0, 5)
      .map(([domain, count]) => `  - ${domain}: ${count}`)
      .join('\n');

    const estimatedMinutes = Math.ceil(preview.estimatedTimeMs / 60000);

    const summary = `Batch Skillize Preview:
- URLs to process: ${preview.urlsToProcess}/${preview.totalUrls}
- URLs to skip: ${preview.urlsToSkip}
- Estimated time: ~${estimatedMinutes} minutes
- Dry-run: ${!preview.config.confirmWrite}

Domains:
${domains}${Object.keys(preview.domains).length > 5 ? '\n  ...' : ''}`;

    return {
      success: true,
      action: 'allow',
      summary,
      data: {
        inputRefId,
        ...preview,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `url.batch_skillize_preview failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * pipeline.web_skillize_from_tabs - One-command pipeline
 *
 * Runs the full pipeline: list_tabs_urls(CDP) -> normalize URL bundle -> batch skillize
 *
 * Features:
 * - Minimal output: summary + refId only (no URL lists in response)
 * - Dry-run by default: confirmWrite=false
 * - CDP connection check with human-friendly error
 * - inputRefId option: skip tabs collection, use existing URL bundle
 *
 * @param options.inputRefId - Skip tabs collection, use existing URL bundle
 * @param options.includeDomains - Include only these domains
 * @param options.excludeDomains - Exclude these domains
 * @param options.excludeUrlPatterns - Exclude URLs matching these patterns
 * @param options.maxUrls - Maximum URLs to process (default: 200)
 * @param options.perDomainLimit - Per-domain limit (default: 50)
 * @param options.stripTracking - Remove tracking parameters (default: true)
 * @param options.maxFetch - Maximum URLs to skillize (default: 20)
 * @param options.rateLimitMs - Rate limit between URLs (default: 1000)
 * @param options.confirmWrite - Write to disk (default: false = dry-run)
 * @param options.namespace - Memory namespace (default: 'long-term')
 */
export async function webSkillizeFromTabs(
  options?: Partial<PipelineTabsSkillizeConfig>
): Promise<WebSkillResult> {
  try {
    const result = await runPipelineCore(options);

    if (!result.success) {
      if (result.requireHuman) {
        return {
          success: false,
          action: 'require_human',
          error: result.error,
          data: {
            instruction: result.humanInstruction,
          },
        };
      }
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'allow',
      refId: result.refId,
      summary: result.summary,
      data: {
        refId: result.refId,
        message: `Pipeline complete. Use memory_search("${result.refId}") for run record with all intermediate refIds.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `pipeline.web_skillize_from_tabs failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
