/**
 * Post Report to GitHub Issue
 *
 * Posts observability reports to a configured GitHub Issue
 * P20 Update: i18n support for Japanese default
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ReportData } from './report';
import { t, getLocale } from '../../i18n';

const execAsync = promisify(exec);

interface ReportConfig {
  github: {
    owner: string;
    repo: string;
    issueNumber: number;
  };
  schedule: {
    daily: boolean;
    weekly: boolean;
  };
  thresholds: {
    warnSuccessRate: number;
    criticalSuccessRate: number;
    warnP95Ms: number;
  };
}

interface PostResult {
  success: boolean;
  issueUrl?: string;
  commentId?: number;
  error?: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'proxy-mcp', 'observability-report.json');

/**
 * Load report configuration
 */
function loadConfig(): ReportConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as ReportConfig;
  } catch (error) {
    console.error('[post-to-issue] Failed to load config:', error);
    return null;
  }
}

/**
 * Generate alert summary based on thresholds
 */
function generateAlertSummary(data: ReportData, config: ReportConfig): string {
  const alerts: string[] = [];
  const isJa = getLocale() === 'ja';

  // Success rate alerts
  if (data.successRate < config.thresholds.criticalSuccessRate) {
    const successRateText = isJa ? '成功率' : 'Success rate';
    alerts.push(`🔴 CRITICAL: ${successRateText} ${(data.successRate * 100).toFixed(1)}% < ${config.thresholds.criticalSuccessRate * 100}%`);
  } else if (data.successRate < config.thresholds.warnSuccessRate) {
    const successRateText = isJa ? '成功率' : 'Success rate';
    alerts.push(`🟡 WARNING: ${successRateText} ${(data.successRate * 100).toFixed(1)}% < ${config.thresholds.warnSuccessRate * 100}%`);
  }

  // p95 latency alerts
  for (const mcp of data.mcpMetrics) {
    if (mcp.p95DurationMs > config.thresholds.warnP95Ms) {
      alerts.push(`🟡 WARNING: ${mcp.name} p95 ${Math.round(mcp.p95DurationMs)}ms > ${config.thresholds.warnP95Ms}ms`);
    }
  }

  // Circuit breaker alerts
  if (data.circuitSummary.open > 0) {
    const circuitText = isJa
      ? `${data.circuitSummary.open}個のMCPがCircuit Open状態`
      : `${data.circuitSummary.open} MCP(s) in Circuit Open state`;
    alerts.push(`🔴 CRITICAL: ${circuitText}`);
  }

  if (alerts.length === 0) {
    return isJa ? '✅ 全システム正常稼働中' : '✅ All systems operational';
  }

  return alerts.join('\n');
}

/**
 * Post report to GitHub Issue as a comment
 */
export async function postReportToIssue(data: ReportData, markdown: string): Promise<PostResult> {
  const config = loadConfig();

  if (!config) {
    return {
      success: false,
      error: 'Configuration not found. Create config/proxy-mcp/observability-report.json',
    };
  }

  const { owner, repo, issueNumber } = config.github;

  // Generate alert summary
  const alertSummary = generateAlertSummary(data, config);

  // Build comment body using i18n template
  const commentBody = t('observability.report.body', {
    periodLabel: data.period.label,
    alertSummary,
    markdown,
    timestamp: new Date().toISOString(),
  });

  try {
    // Use gh CLI to post comment
    const escapedBody = commentBody.replace(/'/g, "'\\''");
    const cmd = `gh issue comment ${issueNumber} --repo ${owner}/${repo} --body '${escapedBody}'`;

    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    if (stderr && !stderr.includes('https://')) {
      console.warn('[post-to-issue] gh stderr:', stderr);
    }

    // Extract issue URL from output
    const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
    const issueUrl = urlMatch ? urlMatch[0] : `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

    return {
      success: true,
      issueUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create initial report issue (run once to set up)
 */
export async function createReportIssue(owner: string, repo: string): Promise<PostResult> {
  const title = t('observability.thread.title');
  const body = t('observability.thread.body');

  try {
    const escapedBody = body.replace(/'/g, "'\\''");
    const cmd = `gh issue create --repo ${owner}/${repo} --title '${title}' --body '${escapedBody}' --label 'observability,automated'`;

    const { stdout } = await execAsync(cmd);

    // Extract issue URL
    const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
    if (urlMatch) {
      // Extract issue number from URL
      const numberMatch = urlMatch[0].match(/\/issues\/(\d+)/);
      const issueNumber = numberMatch ? parseInt(numberMatch[1], 10) : undefined;

      return {
        success: true,
        issueUrl: urlMatch[0],
        commentId: issueNumber,
      };
    }

    return {
      success: false,
      error: 'Could not extract issue URL from gh output',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
