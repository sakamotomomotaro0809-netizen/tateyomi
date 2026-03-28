/**
 * Skill Tools - Search and run skills from .claude/skills
 *
 * M2 Update: Added routing support for internal MCP selection
 * M4 Update: Added web skills (read_url, extract_links, capture_dom_map)
 * M5 Update: Added skillize (URL→Skill generation)
 * M6 Update: Added supervisor (LangGraph-based with human approval)
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillDefinition, ToolResult } from '../types';
import { route, RouteResult } from '../router';
import { getAllMcps, getRouterConfig } from '../internal/registry';
import { readUrl, extractLinks, captureDomMap, webSkillizeFromTabs } from '../browser';
import { skillize as skillizeCore, SkillizeOptions } from '../skillize';
import {
  runSupervisor,
  resumeSupervisor,
  checkDangerousPatterns,
  SupervisorOptions,
} from '../supervisor';
import { canRunSkill, hasState } from '../workflow/engine';

const SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');

// Security: Pattern for valid skill names (alphanumeric, hyphen, underscore, dot)
const VALID_SKILL_NAME_PATTERN = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/;

// Security: Maximum skill name length
const MAX_SKILL_NAME_LENGTH = 100;

/**
 * Security: Validate skill name to prevent path traversal attacks
 * CWE-22: Improper Limitation of a Pathname to a Restricted Directory
 *
 * @param skillName - The skill name to validate
 * @returns Object with valid flag and optional error message
 */
function validateSkillName(skillName: string): { valid: boolean; error?: string } {
  // Check for empty or whitespace-only name
  if (!skillName || skillName.trim() === '') {
    return { valid: false, error: 'Skill name cannot be empty' };
  }

  // Check length
  if (skillName.length > MAX_SKILL_NAME_LENGTH) {
    return {
      valid: false,
      error: `Skill name too long (max ${MAX_SKILL_NAME_LENGTH} characters)`,
    };
  }

  // Check for path traversal patterns
  if (skillName.includes('..') || skillName.includes('/') || skillName.includes('\\')) {
    return {
      valid: false,
      error: 'Skill name contains path traversal characters',
    };
  }

  // Check for null bytes (could bypass checks in some systems)
  if (skillName.includes('\0')) {
    return {
      valid: false,
      error: 'Skill name contains null bytes',
    };
  }

  // Skip pattern validation for built-in skills (web.*, pipeline.*, skillize, supervisor)
  const builtinPrefixes = ['web.', 'pipeline.'];
  const builtinNames = ['skillize', 'supervisor'];

  const isBuiltin =
    builtinNames.includes(skillName) ||
    builtinPrefixes.some((prefix) => skillName.startsWith(prefix));

  if (!isBuiltin && !VALID_SKILL_NAME_PATTERN.test(skillName)) {
    return {
      valid: false,
      error: 'Skill name contains invalid characters. Only alphanumeric, hyphen, and underscore allowed.',
    };
  }

  return { valid: true };
}

export type SkillRunMode = 'preview' | 'route' | 'execute';

/**
 * Search for skills matching a query
 */
export function skillSearch(query: string): ToolResult {
  try {
    if (!fs.existsSync(SKILLS_DIR)) {
      return {
        success: true,
        data: {
          skills: [],
          message: 'Skills directory not found',
        },
      };
    }

    const skills: SkillDefinition[] = [];
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(SKILLS_DIR, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          const descMatch = content.match(/^#\s+(.+)/m);
          const description = descMatch ? descMatch[1] : entry.name;

          // Simple query matching
          const queryLower = query.toLowerCase();
          const nameMatch = entry.name.toLowerCase().includes(queryLower);
          const descMatch2 = description.toLowerCase().includes(queryLower);

          if (!query || nameMatch || descMatch2) {
            skills.push({
              name: entry.name,
              description: description.substring(0, 100),
              path: skillPath,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        skills: skills.slice(0, 10), // Limit to 10 results
        total: skills.length,
        query: query || '(all)',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search skills: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run a skill by name
 *
 * @param skillName - Name of the skill to run (or web.read_url, web.extract_links, web.capture_dom_map)
 * @param params - Optional parameters
 * @param params.mode - 'preview' (default), 'route', or 'execute'
 * @param params.input - Input for routing (used when mode='route')
 * @param params.url - URL for web skills
 * @param params.namespace - Memory namespace for web skills
 */
export function skillRun(
  skillName: string,
  params?: Record<string, unknown>
): ToolResult {
  // Security: Validate skill name to prevent path traversal
  const validation = validateSkillName(skillName);
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid skill name: ${validation.error}`,
    };
  }

  // Phase 2: Workflow Guardian - Check if skill is allowed in current phase
  if (hasState()) {
    const skillCheck = canRunSkill(skillName);
    if (!skillCheck.ok) {
      return {
        success: false,
        error: `${skillCheck.reason}\n${skillCheck.suggestedNext || ''}`,
        data: {
          blocked: true,
          skillName,
          reason: skillCheck.reason,
          suggestion: skillCheck.suggestedNext,
        },
      };
    }
  }

  const mode = (params?.mode as SkillRunMode) || 'preview';

  try {
    // Mode: route - Use hybrid router to find best MCP
    if (mode === 'route') {
      return skillRoute(params?.input as string);
    }

    // M4: Handle web skills (async, return promise wrapper)
    if (skillName.startsWith('web.')) {
      return runWebSkill(skillName, params);
    }

    // P7.3: Handle pipeline skills (async, return promise wrapper)
    if (skillName.startsWith('pipeline.')) {
      return runPipelineSkill(skillName, params);
    }

    // M5: Handle skillize (async, return promise wrapper)
    if (skillName === 'skillize') {
      return runSkillize(params);
    }

    // M6: Handle supervisor (async, return promise wrapper)
    if (skillName === 'supervisor') {
      return runSupervisorSync(params);
    }

    // Mode: preview or execute - Load skill content from files
    const skillPath = path.join(SKILLS_DIR, skillName);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      return {
        success: false,
        error: `Skill not found: ${skillName}`,
      };
    }

    const content = fs.readFileSync(skillMdPath, 'utf-8');

    // Mode: execute - Will be implemented in M3+
    if (mode === 'execute') {
      return {
        success: true,
        data: {
          skill: skillName,
          status: 'pending_execution',
          contentPreview: content.substring(0, 300),
          message: 'Execution mode requires M3+ integration. Use mode=route to see MCP candidates.',
        },
      };
    }

    // Mode: preview (default) - Return skill content
    return {
      success: true,
      data: {
        skill: skillName,
        status: 'loaded',
        contentPreview: content.substring(0, 500),
        message: 'Skill loaded. Use mode=route to see which internal MCP would handle this.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to run skill: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run a web skill (M4)
 *
 * Web skills are async but we return a sync wrapper that
 * indicates the skill needs to be awaited.
 */
function runWebSkill(skillName: string, params?: Record<string, unknown>): ToolResult {
  const url = params?.url as string;

  if (!url) {
    return {
      success: false,
      error: `URL is required for ${skillName}. Use params.url to specify the target URL.`,
    };
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: `Invalid URL: ${url}`,
    };
  }

  // Return info about how to execute (sync wrapper for async skill)
  // The actual execution happens via skillRunAsync
  return {
    success: true,
    data: {
      skill: skillName,
      url,
      status: 'ready',
      message: `Web skill ${skillName} is ready. Use skillRunAsync() for actual execution.`,
      asyncRequired: true,
    },
  };
}

/**
 * Run skillize (M5)
 *
 * Skillize is async but we return a sync wrapper.
 */
function runSkillize(params?: Record<string, unknown>): ToolResult {
  const url = params?.url as string;

  if (!url) {
    return {
      success: false,
      error: 'URL is required for skillize. Use params.url to specify the target URL.',
    };
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: `Invalid URL: ${url}`,
    };
  }

  const confirmWrite = params?.confirmWrite === true;

  return {
    success: true,
    data: {
      skill: 'skillize',
      url,
      template: params?.template || 'auto',
      confirmWrite,
      status: 'ready',
      message: confirmWrite
        ? 'Skillize ready (WRITE mode). Use skillRunAsync() for execution.'
        : 'Skillize ready (dry-run mode). Use skillRunAsync() for execution.',
      asyncRequired: true,
    },
  };
}

/**
 * Run pipeline skill sync check (P7.3)
 *
 * Returns ready status for pipeline skills.
 */
function runPipelineSkill(skillName: string, params?: Record<string, unknown>): ToolResult {
  const confirmWrite = params?.confirmWrite === true;
  const inputRefId = params?.inputRefId as string | undefined;

  return {
    success: true,
    data: {
      skill: skillName,
      inputRefId: inputRefId || null,
      confirmWrite,
      status: 'ready',
      message: inputRefId
        ? `Pipeline ready (using inputRefId: ${inputRefId}). Use skillRunAsync() for execution.`
        : confirmWrite
          ? 'Pipeline ready (WRITE mode). Use skillRunAsync() for execution.'
          : 'Pipeline ready (dry-run mode). Use skillRunAsync() for execution.',
      asyncRequired: true,
    },
  };
}

/**
 * Run supervisor sync check (M6)
 *
 * Checks if input contains dangerous patterns and returns ready status.
 */
function runSupervisorSync(params?: Record<string, unknown>): ToolResult {
  const input = params?.input as string;

  if (!input) {
    return {
      success: false,
      error: 'Input is required for supervisor. Use params.input to specify the task.',
    };
  }

  const dangerousPatterns = checkDangerousPatterns(input);
  const requiresApproval = dangerousPatterns.length > 0;

  return {
    success: true,
    data: {
      skill: 'supervisor',
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      dangerousPatterns: dangerousPatterns.length > 0 ? dangerousPatterns : undefined,
      requiresApproval,
      status: 'ready',
      message: requiresApproval
        ? `Supervisor ready. Dangerous patterns detected: ${dangerousPatterns.join(', ')}. Approval will be required.`
        : 'Supervisor ready. No dangerous patterns detected.',
      asyncRequired: true,
    },
  };
}

/**
 * Run a web skill asynchronously (M4)
 *
 * This is the actual async execution of web skills.
 * Returns summary + refId following minimal output principle.
 */
export async function skillRunAsync(
  skillName: string,
  params?: Record<string, unknown>
): Promise<ToolResult> {
  // M6: Handle supervisor (doesn't require URL)
  if (skillName === 'supervisor') {
    const input = params?.input as string;
    if (!input) {
      return {
        success: false,
        error: 'Input is required for supervisor. Use params.input to specify the task.',
      };
    }

    try {
      const options: SupervisorOptions = {
        runId: params?.runId as string,
        skipApproval: params?.skipApproval === true,
        namespace: (params?.namespace as 'short-term' | 'long-term') || 'short-term',
      };

      // Check if resuming a paused run
      if (params?.resume && params?.approvalIssue) {
        const result = await resumeSupervisor(
          params.resume as string,
          params.approvalIssue as number,
          options
        );
        return {
          success: result.success,
          referenceId: result.refId,
          data: {
            runId: result.runId,
            step: result.step,
            summary: result.summary,
            requiresApproval: result.requiresApproval,
            approvalIssue: result.approvalIssue,
            ...result.data,
          },
          error: result.error,
        };
      }

      // Run new supervisor
      const result = await runSupervisor(input, options);
      return {
        success: result.success,
        referenceId: result.refId,
        data: {
          runId: result.runId,
          step: result.step,
          summary: result.summary,
          requiresApproval: result.requiresApproval,
          approvalIssue: result.approvalIssue,
          ...result.data,
        },
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: `Supervisor failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // P7.3: Handle pipeline skills (don't require URL)
  if (skillName.startsWith('pipeline.')) {
    try {
      switch (skillName) {
        case 'pipeline.web_skillize_from_tabs': {
          const result = await webSkillizeFromTabs({
            inputRefId: params?.inputRefId as string | undefined,
            includeDomains: params?.includeDomains as string[] | undefined,
            excludeDomains: params?.excludeDomains as string[] | undefined,
            excludeUrlPatterns: params?.excludeUrlPatterns as string[] | undefined,
            maxUrls: params?.maxUrls as number | undefined,
            perDomainLimit: params?.perDomainLimit as number | undefined,
            stripTracking: params?.stripTracking as boolean | undefined,
            maxFetch: params?.maxFetch as number | undefined,
            rateLimitMs: params?.rateLimitMs as number | undefined,
            confirmWrite: params?.confirmWrite === true,
            namespace: (params?.namespace as 'short-term' | 'long-term') || 'long-term',
          });
          return {
            success: result.success,
            referenceId: result.refId,
            data: {
              action: result.action,
              summary: result.summary,
              ...result.data,
            },
            error: result.error,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown pipeline skill: ${skillName}. Available: pipeline.web_skillize_from_tabs`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Other skills require URL
  const url = params?.url as string;

  if (!url) {
    return {
      success: false,
      error: `URL is required for ${skillName}`,
    };
  }

  try {
    switch (skillName) {
      case 'web.read_url': {
        const result = await readUrl(url, {
          namespace: (params?.namespace as 'short-term' | 'long-term') || 'short-term',
          maxLength: (params?.maxLength as number) || 50000,
        });
        return {
          success: result.success,
          referenceId: result.refId,
          data: {
            action: result.action,
            summary: result.summary,
            ...result.data,
          },
          error: result.error,
        };
      }

      case 'web.extract_links': {
        const result = await extractLinks(url, {
          namespace: (params?.namespace as 'short-term' | 'long-term') || 'short-term',
          filter: (params?.filter as 'internal' | 'external' | 'all') || 'all',
        });
        return {
          success: result.success,
          referenceId: result.refId,
          data: {
            action: result.action,
            summary: result.summary,
            ...result.data,
          },
          error: result.error,
        };
      }

      case 'web.capture_dom_map': {
        const result = await captureDomMap(url, {
          namespace: (params?.namespace as 'short-term' | 'long-term') || 'short-term',
        });
        return {
          success: result.success,
          referenceId: result.refId,
          data: {
            action: result.action,
            summary: result.summary,
            ...result.data,
          },
          error: result.error,
        };
      }

      // M5: Skillize
      case 'skillize': {
        const options: SkillizeOptions = {
          template: params?.template as SkillizeOptions['template'],
          name: params?.name as string,
          confirmWrite: params?.confirmWrite === true,
          namespace: (params?.namespace as 'short-term' | 'long-term') || 'long-term',
        };
        const result = await skillizeCore(url, options);
        return {
          success: result.success,
          referenceId: result.refId,
          data: {
            template: result.template,
            summary: result.summary,
            ...result.data,
          },
          error: result.error,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown skill: ${skillName}. Available: web.read_url, web.extract_links, web.capture_dom_map, skillize, supervisor`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: `Skill ${skillName} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Route an input to find the best internal MCP
 */
export function skillRoute(input: string | undefined): ToolResult {
  if (!input) {
    return {
      success: false,
      error: 'Input is required for routing. Use params.input to specify the task.',
    };
  }

  try {
    const mcps = getAllMcps();
    const config = getRouterConfig();
    const result: RouteResult = route(input, mcps, config);

    return {
      success: true,
      data: {
        action: result.action,
        reason: result.reason,
        matchedRule: result.matchedRule,
        confidence: result.confidence,
        candidates: result.candidates?.map((c) => ({
          name: c.name,
          score: `${(c.score * 100).toFixed(1)}%`,
          description: c.shortDescription,
          tags: c.tags,
        })),
        message: getActionMessage(result),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Routing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get human-readable message for route action
 */
function getActionMessage(result: RouteResult): string {
  switch (result.action) {
    case 'allow':
      return `Ready to proceed with ${result.candidates?.[0]?.name || 'matched MCP'}.`;
    case 'require_human':
      return 'This operation requires human confirmation before proceeding.';
    case 'require_clarify':
      return 'Please clarify your intent or provide more details.';
    case 'deny':
      return 'This operation is not permitted.';
    default:
      return 'Unknown action.';
  }
}
