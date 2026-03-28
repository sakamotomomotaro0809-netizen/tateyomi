/**
 * Test Helpers for TAISUN v2 Integration Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Agent and Skill definitions paths
const AGENTS_PATH = path.join(__dirname, '../../.claude/agents');
const SKILLS_PATH = path.join(__dirname, '../../.claude/skills');

/**
 * Agent definition structure
 */
export interface AgentDefinition {
  name: string;
  description: string;
  system_prompt?: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  tools?: string[];
}

/**
 * Skill definition structure
 */
export interface SkillDefinition {
  name: string;
  description: string;
  instructions?: string;
}

/**
 * Test result structure
 */
export interface TestResult {
  success: boolean;
  agent?: string;
  skill?: string;
  duration: number;
  output?: string;
  error?: string;
}

/**
 * Load agent definition from Markdown file with YAML frontmatter
 * Agent files are stored as .md files directly in .claude/agents/
 */
export function loadAgentDefinition(agentName: string): AgentDefinition | null {
  // Try multiple file naming patterns
  const patterns = [
    `ait42-${agentName}.md`,
    `00-ait42-${agentName}.md`,
    `ait42-01-${agentName}.md`,
    `${agentName}.md`,
  ];

  for (const pattern of patterns) {
    const filePath = path.join(AGENTS_PATH, pattern);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return parseAgentMarkdown(content, agentName);
    }
  }

  // Fallback: search all files for matching agent name
  const files = fs.readdirSync(AGENTS_PATH).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(AGENTS_PATH, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseAgentMarkdown(content, agentName);
    if (parsed && parsed.name === agentName) {
      return parsed;
    }
  }

  return null;
}

/**
 * Parse agent markdown file with YAML frontmatter
 */
function parseAgentMarkdown(content: string, fallbackName: string): AgentDefinition | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      const frontmatter = yaml.parse(frontmatterMatch[1]);
      return {
        name: frontmatter.name || fallbackName,
        description: frontmatter.description || '',
        model: frontmatter.model,
        tools: typeof frontmatter.tools === 'string'
          ? frontmatter.tools.split(',').map((t: string) => t.trim())
          : frontmatter.tools,
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Load skill definition from SKILL.md
 */
export function loadSkillDefinition(skillName: string): SkillDefinition | null {
  const skillPath = path.join(SKILLS_PATH, skillName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    return null;
  }

  const content = fs.readFileSync(skillPath, 'utf-8');

  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = yaml.parse(frontmatterMatch[1]);
    return {
      name: frontmatter.name || skillName,
      description: frontmatter.description || '',
      instructions: content.replace(/^---\n[\s\S]*?\n---\n/, ''),
    };
  }

  return {
    name: skillName,
    description: '',
    instructions: content,
  };
}

/**
 * List all available agents
 * Agent files are stored as .md files directly in .claude/agents/
 */
export function listAgents(): string[] {
  const agents: string[] = [];

  if (!fs.existsSync(AGENTS_PATH)) {
    return agents;
  }

  const files = fs.readdirSync(AGENTS_PATH).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(AGENTS_PATH, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      try {
        const frontmatter = yaml.parse(frontmatterMatch[1]);
        if (frontmatter.name) {
          agents.push(frontmatter.name);
        }
      } catch {
        // Skip files with invalid frontmatter
      }
    }
  }

  return agents;
}

/**
 * List all available skills
 */
export function listSkills(): string[] {
  const skills: string[] = [];
  const skillDirs = fs.readdirSync(SKILLS_PATH);

  for (const dir of skillDirs) {
    const skillPath = path.join(SKILLS_PATH, dir);
    if (fs.statSync(skillPath).isDirectory()) {
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        skills.push(dir);
      }
    }
  }

  return skills;
}

/**
 * Mock agent execution for testing
 */
export async function mockAgentExecution(
  agentName: string,
  prompt: string,
  options: { timeout?: number } = {}
): Promise<TestResult> {
  const startTime = Date.now();
  // Note: timeout option available for future use
  void options.timeout;

  try {
    const agent = loadAgentDefinition(agentName);
    if (!agent) {
      return {
        success: false,
        agent: agentName,
        duration: Date.now() - startTime,
        error: `Agent '${agentName}' not found`,
      };
    }

    // Simulate agent processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      agent: agentName,
      duration: Date.now() - startTime,
      output: `Mock response from ${agentName}: processed "${prompt.substring(0, 50)}..."`,
    };
  } catch (error) {
    return {
      success: false,
      agent: agentName,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Mock skill execution for testing
 */
export async function mockSkillExecution(
  skillName: string,
  args: string,
  options: { timeout?: number } = {}
): Promise<TestResult> {
  const startTime = Date.now();
  // Note: timeout option available for future use
  void options.timeout;

  try {
    const skill = loadSkillDefinition(skillName);
    if (!skill) {
      return {
        success: false,
        skill: skillName,
        duration: Date.now() - startTime,
        error: `Skill '${skillName}' not found`,
      };
    }

    // Simulate skill processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      skill: skillName,
      duration: Date.now() - startTime,
      output: `Mock response from ${skillName}: processed "${args.substring(0, 50)}..."`,
    };
  } catch (error) {
    return {
      success: false,
      skill: skillName,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate agent definition structure
 */
export function validateAgentDefinition(agent: AgentDefinition): string[] {
  const errors: string[] = [];

  if (!agent.name) {
    errors.push('Missing required field: name');
  }

  if (!agent.description) {
    errors.push('Missing required field: description');
  }

  // Accept both short names (haiku, sonnet, opus) and full model IDs (claude-3-5-haiku-20241022)
  const validModels = ['haiku', 'sonnet', 'opus'];
  const validModelPrefixes = ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-opus', 'claude-3-opus'];

  if (agent.model) {
    const isShortName = validModels.includes(agent.model);
    const isFullName = validModelPrefixes.some((prefix) => agent.model?.startsWith(prefix));
    if (!isShortName && !isFullName) {
      errors.push(`Invalid model: ${agent.model}. Must be haiku, sonnet, or opus`);
    }
  }

  return errors;
}

/**
 * Validate skill definition structure
 */
export function validateSkillDefinition(skill: SkillDefinition): string[] {
  const errors: string[] = [];

  if (!skill.name) {
    errors.push('Missing required field: name');
  }

  if (!skill.description) {
    errors.push('Missing required field: description');
  }

  return errors;
}

/**
 * Generate test fixtures
 */
export function generateTestFixtures(): {
  samplePrompts: Record<string, string>;
  sampleSkillArgs: Record<string, string>;
} {
  return {
    samplePrompts: {
      'system-architect': 'Design a microservices architecture for an e-commerce platform',
      'backend-developer': 'Implement a REST API for user authentication',
      'frontend-developer': 'Create a React component for a login form',
      'test-generator': 'Generate unit tests for the user service',
      'code-reviewer': 'Review this pull request for security issues',
      'bug-fixer': 'Fix the NullPointerException in the payment module',
      'ait42-coordinator': 'Implement a complete user management feature',
    },
    sampleSkillArgs: {
      'taiyo-style-sales-letter': '--product "Online Course" --target "Entrepreneurs"',
      'taiyo-style-step-mail': '--theme "Fitness Program" --days 7',
      'lp-analysis': 'https://example.com/landing-page',
      'customer-support-120': 'Customer inquiry about order status',
      'nanobanana-prompts': 'YouTube thumbnail for AI tutorial',
      'security-scan-trivy': '',
      'japanese-tts-reading': '"こんにちは、世界"',
    },
  };
}

/**
 * Wait for async operations with timeout
 */
export async function waitWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}
